import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupJoinSource,
  GroupMemberStatus,
  NotificationType,
  Prisma,
  RegistrationGroupStatus,
  Role,
  TopicStatus,
} from '../../../generated/prisma/client';
import {
  isUniqueViolation,
  uniqueConstraintName,
} from '../../common/utils/prisma-error.util';
import { MailService } from '../../core/mail/mail.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { REQUIREMENT_SELECT } from '../rounds/requirements.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { statusForSeats } from './group-seats';
import { QueryMyGroupDto } from './dto/query-my-group.dto';
import { QuerySupervisedGroupsDto } from './dto/query-supervised-groups.dto';
import { RegisterTopicDto } from './dto/register-topic.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  generateJoinCode,
  holdExpiryFromNow,
  isHoldActive,
} from './join-code.util';

const GROUP_SELECT = {
  id: true,
  topicId: true,
  semesterId: true,
  leaderId: true,
  name: true,
  status: true,
  openForJoin: true,
  declaredSize: true,
  holdUntil: true,
  joinCode: true,
  createdAt: true,
  topic: {
    select: {
      id: true,
      title: true,
      maxStudents: true,
      lecturerId: true,
      // The round is what every phase check is asked of — the group's own
      // semester is too coarse, since a semester runs one round per kind of
      // project and they open and close on their own schedules.
      roundId: true,
      lecturer: { select: { id: true, fullName: true, academicTitle: true } },
      round: {
        select: {
          projectType: { select: { id: true, name: true, code: true } },
          // What this group owes and by when, as the office declared it for
          // the round. Empty while they have declared nothing.
          requirements: {
            select: REQUIREMENT_SELECT,
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  },
  members: {
    // Only people actually in the group. Disbanding steps its members down to
    // DECLINED rather than deleting them, so without this filter a dissolved
    // group would still read as full and its seat arithmetic would count people
    // who are no longer in it.
    where: { status: GroupMemberStatus.ACCEPTED },
    select: {
      id: true,
      studentId: true,
      joinSource: true,
      joinedAt: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          fullName: true,
          class: true,
          cohort: true,
          major: { select: { id: true, name: true, code: true } },
          // The account id is here to address notices to; `render` drops the
          // whole `user` object and re-exposes only the address, so it never
          // reaches a response.
          user: { select: { id: true, email: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.RegistrationGroupSelect;

type GroupRow = Prisma.RegistrationGroupGetPayload<{
  select: typeof GROUP_SELECT;
}>;

interface Viewer {
  studentId: number | null;
  lecturerId: number | null;
  role: Role | null;
}

function seatBreakdown(group: GroupRow) {
  const occupied = group.members.length;
  const capacity = group.topic.maxStudents;
  const holdActive = isHoldActive(group.holdUntil);

  const held =
    holdActive && group.declaredSize
      ? Math.max(0, Math.min(group.declaredSize, capacity) - occupied)
      : 0;

  return {
    occupied,
    capacity,
    holdActive,
    held,

    freeToAnyone: Math.max(0, capacity - occupied - held),
  };
}

function requireProposerOrFree(
  topic: { sourceProposal: { studentId: number } | null },
  studentId: number,
): void {
  if (!topic.sourceProposal) return;
  if (topic.sourceProposal.studentId === studentId) return;

  throw new ConflictException(
    'Đề tài này do một sinh viên khác đề xuất, nên chỉ bạn ấy đăng ký được.',
  );
}

@Injectable()
export class RegistrationGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phases: RoundPhaseService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  // ── invite by student code ────────────────────────────────
  async inviteByStudentCode(
    groupId: number,
    studentCode: string,
    userId: number,
  ) {
    const leader = await this.requireStudent(userId);
    const group = await this.prisma.registrationGroup.findUnique({
      where: { id: groupId },
      select: GROUP_SELECT,
    });

    if (!group || group.status === RegistrationGroupStatus.REJECTED) {
      throw new NotFoundException('Không tìm thấy nhóm đăng ký');
    }

    if (group.leaderId !== leader.id) {
      throw new ForbiddenException(
        'Chỉ trưởng nhóm mới có quyền mời thành viên',
      );
    }

    const cleanCode = studentCode.trim();
    if (!cleanCode) {
      throw new BadRequestException('Vui lòng nhập mã số sinh viên');
    }

    // 1. Find target student by studentCode
    const targetStudent = await this.prisma.studentProfile.findUnique({
      where: { studentCode: cleanCode },
      select: {
        id: true,
        fullName: true,
        cohort: true,
        studentCode: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!targetStudent) {
      throw new NotFoundException(
        `Không tìm thấy sinh viên với MSSV "${cleanCode}"`,
      );
    }

    if (targetStudent.id === leader.id) {
      throw new ConflictException('Bạn đã là trưởng nhóm của nhóm này');
    }

    // 2. Check group capacity
    const seats = seatBreakdown(group);
    if (seats.occupied >= seats.capacity) {
      throw new ConflictException(
        `Nhóm đã đủ số lượng thành viên tối đa (${seats.capacity} SV)`,
      );
    }

    // 3. Check joinable conditions (eligibility, round phases, no existing group)
    await this.assertJoinable(group, targetStudent, { allowHeldSeats: true });

    // 4. Add member directly (Mời qua MSSV)
    const result = await this.addMember(
      group.id,
      targetStudent,
      GroupJoinSource.LINK,
      { allowHeldSeats: true },
    );

    // 5. Send notification to the invited student
    await this.notifications.notify([
      {
        userId: targetStudent.user.id,
        type: NotificationType.GROUP_MEMBER_JOINED,
        title: 'Bạn đã được thêm vào nhóm đề tài',
        content: `Trưởng nhóm ${leader.fullName} đã thêm bạn vào nhóm đề tài "${group.topic.title}".`,
        targetId: group.id,
      },
    ]);

    // 6. Send email to the invited student
    if (targetStudent.user?.email) {
      await this.mail.sendGroupInvitation({
        to: targetStudent.user.email,
        studentName: targetStudent.fullName,
        leaderName: leader.fullName,
        topicTitle: group.topic.title,
      });
    }

    return result;
  }

  // ── register ──────────────────────────────────────────────

  async register(topicId: number, dto: RegisterTopicDto, userId: number) {
    const student = await this.requireStudent(userId);
    const topic = await this.requireRegistrableTopic(topicId);

    await this.phases.requireCanJoin(topic.roundId, student.id);
    await this.requireEligible(topic, student);
    requireProposerOrFree(topic, student.id);
    await this.requireNoExistingGroup(student.id, topic.semesterId);

    if (dto.declaredSize && dto.declaredSize > topic.maxStudents) {
      throw new BadRequestException(
        `Đề tài quy định tối đa ${topic.maxStudents} sinh viên, không thể đăng ký quy mô ${dto.declaredSize} sinh viên.`,
      );
    }

    // A group of one is still a group, so nothing here is conditional on having
    // friends. The join code is always issued: it is how a leader shares the
    // group at all, and outside the hold window it grants no more than the topic
    // page already does.
    const holdUntil = dto.declaredSize ? holdExpiryFromNow() : null;

    let created: { id: number };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const group = await tx.registrationGroup.create({
          data: {
            topicId: topic.id,
            semesterId: topic.semesterId,
            leaderId: student.id,
            name: dto.name,
            declaredSize: dto.declaredSize,
            holdUntil,
            joinCode: generateJoinCode(),
            status: statusForSeats(1, topic.maxStudents),
          },
          select: { id: true },
        });

        await tx.registrationGroupMember.create({
          data: {
            groupId: group.id,
            semesterId: topic.semesterId,
            studentId: student.id,
            status: GroupMemberStatus.ACCEPTED,
            joinSource: GroupJoinSource.SELF,
            joinedAt: new Date(),
          },
        });

        return group;
      });
    } catch (err) {
      throw this.translateRegistrationConflict(err);
    }

    return this.present(created.id, { studentId: student.id });
  }

  // ── join ──────────────────────────────────────────────────

  async joinTopic(topicId: number, userId: number) {
    const student = await this.requireStudent(userId);

    const group = await this.prisma.registrationGroup.findFirst({
      where: {
        topicId,
        status: { not: RegistrationGroupStatus.REJECTED },
      },
      select: GROUP_SELECT,
    });

    // Nothing is auto-created here on purpose: taking an unclaimed topic and
    // joining a group that exists are different decisions, and a client that
    // asked for one should not silently get the other.
    if (!group) {
      throw new ConflictException(
        'Đề tài này chưa có nhóm đăng ký — vui lòng đăng ký đề tài thay vì tham gia.',
      );
    }

    await this.assertJoinable(group, student, { allowHeldSeats: false });

    return this.addMember(group.id, student, GroupJoinSource.SELF, {
      allowHeldSeats: false,
    });
  }

  async joinByCode(joinCode: string, userId: number) {
    const student = await this.requireStudent(userId);
    const group = await this.requireGroupByCode(joinCode);

    await this.assertJoinable(group, student, { allowHeldSeats: true });

    return this.addMember(group.id, student, GroupJoinSource.LINK, {
      allowHeldSeats: true,
    });
  }

  async previewByCode(joinCode: string, userId: number) {
    const student = await this.requireStudent(userId);
    const group = await this.requireGroupByCode(joinCode);
    const seats = seatBreakdown(group);

    const alreadyMember = group.members.some(
      (member) => member.studentId === student.id,
    );

    let blockedReason: string | null = null;
    if (!alreadyMember) {
      try {
        await this.assertJoinable(group, student, { allowHeldSeats: true });
      } catch (err) {
        if (!(err instanceof HttpException)) throw err;
        blockedReason = err.message;
      }
    }

    return {
      group: {
        id: group.id,
        name: group.name,
        occupiedSeats: seats.occupied,
        capacity: seats.capacity,
        isFull: seats.occupied >= seats.capacity,
        // Names only. Whoever holds the link is a legitimate invitee, not a
        // reason to hand over classmates' codes and addresses.
        members: group.members.map((member) => ({
          fullName: member.student.fullName,
          isLeader: member.studentId === group.leaderId,
        })),
      },
      topic: {
        id: group.topic.id,
        title: group.topic.title,
        projectType: group.topic.round.projectType,
        lecturer: group.topic.lecturer,
      },
      alreadyMember,
      canJoin: !alreadyMember && blockedReason === null,
      blockedReason,
    };
  }

  // ── read ──────────────────────────────────────────────────

  async findMine(query: QueryMyGroupDto, userId: number) {
    const student = await this.requireStudent(userId);
    const semesterId =
      query.semesterId ?? (await this.requireActiveSemesterId());

    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId: student.id,
        semesterId,
        status: GroupMemberStatus.ACCEPTED,
        group: { status: { not: RegistrationGroupStatus.REJECTED } },
      },
      select: { groupId: true },
    });

    if (!membership) return null;

    return this.present(membership.groupId, { studentId: student.id });
  }

  async findSupervisedGroups(query: QuerySupervisedGroupsDto, userId: number) {
    const lecturer = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!lecturer) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên.');
    }

    const semesterId =
      query.semesterId ?? (await this.requireActiveSemesterId());

    const groups = await this.prisma.registrationGroup.findMany({
      where: {
        semesterId,
        status: { not: RegistrationGroupStatus.REJECTED },
        topic: { lecturerId: lecturer.id },
      },
      select: GROUP_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    const viewer: Viewer = {
      studentId: null,
      lecturerId: lecturer.id,
      role: Role.LECTURER,
    };

    return groups.map((group) => this.render(group, viewer));
  }

  async findOne(id: number, userId: number, role: Role) {
    const viewer = await this.resolveViewer(userId, role);
    const group = await this.loadGroup(id);

    if (!this.canView(group, viewer)) {
      throw new NotFoundException('Không tìm thấy nhóm đăng ký.');
    }

    return this.render(group, viewer);
  }

  // ── leader actions ────────────────────────────────────────

  async update(id: number, dto: UpdateGroupDto, userId: number) {
    const student = await this.requireStudent(userId);
    const group = await this.requireLeadership(id, student.id);

    await this.phases.requireCanLeave(group.topic.roundId);

    if (dto.leaderId !== undefined) {
      const successor = group.members.find(
        (member) => member.studentId === dto.leaderId,
      );

      if (!successor) {
        throw new BadRequestException(
          'Chỉ có thể chuyển quyền nhóm trưởng cho thành viên trong nhóm.',
        );
      }
    }

    // Bounded by the people already here and by what the topic holds. Below the
    // membership it would describe a group smaller than it is; above the capacity
    // it would claim seats the topic does not have.
    if (dto.declaredSize != null) {
      if (dto.declaredSize < group.members.length) {
        throw new BadRequestException(
          `Nhóm hiện có ${group.members.length} thành viên, không thể thiết lập quy mô ${dto.declaredSize} sinh viên.`,
        );
      }

      if (dto.declaredSize > group.topic.maxStudents) {
        throw new BadRequestException(
          `Đề tài quy định tối đa ${group.topic.maxStudents} sinh viên, không thể thiết lập quy mô ${dto.declaredSize} sinh viên.`,
        );
      }
    }

    await this.prisma.registrationGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.openForJoin !== undefined && { openForJoin: dto.openForJoin }),
        ...(dto.declaredSize !== undefined && {
          declaredSize: dto.declaredSize,
        }),
        ...(dto.releaseHold && { holdUntil: null }),
        ...(dto.leaderId !== undefined && { leaderId: dto.leaderId }),
      },
    });

    return this.present(id, { studentId: student.id });
  }

  async removeMember(id: number, studentId: number, userId: number) {
    const student = await this.requireStudent(userId);
    const group = await this.requireLeadership(id, student.id);

    await this.phases.requireCanLeave(group.topic.roundId);

    if (studentId === group.leaderId) {
      throw new BadRequestException(
        'Nhóm trưởng không thể tự rời nhóm — vui lòng chuyển quyền nhóm trưởng hoặc giải tán nhóm.',
      );
    }

    const member = group.members.find(
      (candidate) => candidate.studentId === studentId,
    );

    if (!member) {
      throw new NotFoundException('Sinh viên không thuộc nhóm này.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.registrationGroupMember.delete({ where: { id: member.id } });

      await this.syncStatus(tx, id, group.topic.maxStudents);

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REMOVE_GROUP_MEMBER',
          targetTable: 'registration_group_members',
          targetId: String(member.id),
          oldValue: {
            groupId: id,
            studentId,
            studentCode: member.student.studentCode,
            joinSource: member.joinSource,
          },
        },
      });
    });

    // The one thing here a student did not do to themselves, and the only way
    // they would otherwise learn of it is by finding themselves back on the
    // topic list with no explanation.
    await this.notifications.notify([
      {
        userId: member.student.user.id,
        type: NotificationType.GROUP_MEMBER_REMOVED,
        title: 'Bạn đã bị đưa ra khỏi nhóm',
        content: `Trưởng nhóm đã đưa bạn ra khỏi nhóm đề tài "${group.topic.title}". Nếu cổng đăng ký còn mở, bạn có thể chọn một đề tài khác.`,
        targetId: group.topicId,
      },
    ]);

    return this.present(id, { studentId: student.id });
  }

  async disband(id: number, userId: number, role: Role) {
    let group: GroupRow;

    if (role === Role.ADMIN) {
      group = await this.loadGroup(id);

      if (group.status === RegistrationGroupStatus.REJECTED) {
        throw new ConflictException('Nhóm này đã giải tán.');
      }
    } else {
      const student = await this.requireStudent(userId);
      group = await this.requireLeadership(id, student.id);
    }

    await this.phases.requireCanLeave(group.topic.roundId);

    await this.prisma.$transaction([
      this.prisma.registrationGroupMember.updateMany({
        where: { groupId: id, status: GroupMemberStatus.ACCEPTED },
        data: { status: GroupMemberStatus.DECLINED },
      }),
      this.prisma.registrationGroup.update({
        where: { id },
        data: { status: RegistrationGroupStatus.REJECTED },
      }),
    ]);

    // Everybody except whoever pressed it — they were there, and a notice about
    // one's own action is noise that teaches people to stop reading them.
    await this.notifications.notify(
      group.members
        .filter((member) => member.student.user.id !== userId)
        .map((member) => ({
          userId: member.student.user.id,
          type: NotificationType.GROUP_DISBANDED,
          title: 'Nhóm của bạn đã giải tán',
          content: `Nhóm đề tài "${group.topic.title}" đã giải tán và đề tài trở lại danh sách. Nếu cổng đăng ký còn mở, bạn có thể chọn một đề tài khác.`,
          targetId: group.topicId,
        })),
    );

    return { message: 'Group disbanded and the topic is available again' };
  }

  // ── switchTopic ───────────────────────────────────────────

  async switchTopic(groupId: number, newTopicId: number, userId: number) {
    const student = await this.requireStudent(userId);
    const group = await this.requireLeadership(groupId, student.id);

    if (group.topicId === newTopicId) {
      throw new BadRequestException('Nhóm hiện đang đăng ký đề tài này rồi');
    }

    const newTopic = await this.requireRegistrableTopic(newTopicId);

    if (newTopic.semesterId !== group.semesterId) {
      throw new BadRequestException('Đề tài mới không thuộc cùng học kỳ với nhóm hiện tại');
    }

    // 1. Phải trong thời gian đợt đăng ký còn mở (cho phép rời đề tài cũ và tham gia đề tài mới)
    await this.phases.requireCanLeave(group.topic.roundId);
    await this.phases.requireCanJoin(newTopic.roundId, student.id);

    // 2. Kiểm tra nếu đề tài mới là do sinh viên khác đề xuất
    requireProposerOrFree(newTopic, student.id);

    // 3. Kiểm tra số lượng thành viên nhóm hiện tại so với sức chứa tối đa của đề tài mới
    const activeMembers = group.members;
    if (activeMembers.length > newTopic.maxStudents) {
      throw new BadRequestException(
        `Đề tài mới chỉ cho phép tối đa ${newTopic.maxStudents} sinh viên, nhưng nhóm hiện có ${activeMembers.length} thành viên.`,
      );
    }

    // 4. Kiểm tra điều kiện tham gia đợt đồ án của từng thành viên trong nhóm
    for (const member of activeMembers) {
      await this.requireEligible(newTopic, member.student);
    }

    // 5. Đảm bảo đề tài mới còn trống (chưa có nhóm nào đăng ký)
    const claimingGroup = await this.prisma.registrationGroup.findFirst({
      where: {
        topicId: newTopic.id,
        status: { not: RegistrationGroupStatus.REJECTED },
      },
      select: { id: true },
    });
    if (claimingGroup) {
      throw new ConflictException('Đề tài mới này đã có nhóm khác đăng ký');
    }

    // 6. Cập nhật nhóm sang đề tài mới (ngay lập tức nhả đề tài cũ)
    await this.prisma.$transaction(async (tx) => {
      await tx.registrationGroup.update({
        where: { id: group.id },
        data: {
          topicId: newTopic.id,
          status: statusForSeats(activeMembers.length, newTopic.maxStudents),
        },
      });
    });

    // 7. Thông báo cho các thành viên khác trong nhóm
    await this.notifications.notify(
      activeMembers
        .filter((member) => member.student.user.id !== userId)
        .map((member) => ({
          userId: member.student.user.id,
          type: NotificationType.GROUP_MEMBER_JOINED,
          title: 'Nhóm đã đổi sang đề tài mới',
          content: `Trưởng nhóm đã đổi đề tài nhóm sang "${newTopic.title}". Đề tài cũ đã được nhả ra.`,
          targetId: newTopic.id,
        })),
    );

    return this.present(group.id, { studentId: student.id });
  }

  // ── member actions ────────────────────────────────────────

  async leave(id: number, userId: number) {
    const student = await this.requireStudent(userId);
    const group = await this.loadGroup(id);

    await this.phases.requireCanLeave(group.topic.roundId);

    const member = group.members.find(
      (candidate) => candidate.studentId === student.id,
    );

    if (!member) throw new NotFoundException('Bạn không phải là thành viên của nhóm này.');

    // Somebody has to answer for the group, and a group whose leader walked out
    // has nobody to hand it to, close it, or be asked about it.
    if (group.leaderId === student.id) {
      throw new ConflictException(
        'Vui lòng chuyển quyền nhóm trưởng cho thành viên khác hoặc giải tán nhóm.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.registrationGroupMember.delete({ where: { id: member.id } });
      await this.syncStatus(tx, id, group.topic.maxStudents);
    });

    return { message: 'Bạn đã rời nhóm thành công.' };
  }

  // ── internals ─────────────────────────────────────────────

  private async syncStatus(
    tx: Prisma.TransactionClient,
    groupId: number,
    capacity: number,
  ) {
    const occupied = await tx.registrationGroupMember.count({
      where: { groupId, status: GroupMemberStatus.ACCEPTED },
    });

    await tx.registrationGroup.update({
      where: { id: groupId },
      data: { status: statusForSeats(occupied, capacity) },
    });
  }

  private async addMember(
    groupId: number,
    student: { id: number; fullName: string },
    joinSource: GroupJoinSource,
    options: { allowHeldSeats: boolean },
  ) {
    const studentId = student.id;

    const audience = await this.prisma
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "registration_groups" WHERE "id" = ${groupId} FOR UPDATE`;

        // Re-read inside the lock: the counts checked before it was taken are
        // exactly the ones another request may have moved.
        const group = await tx.registrationGroup.findUnique({
          where: { id: groupId },
          select: GROUP_SELECT,
        });

        if (!group || group.status === RegistrationGroupStatus.REJECTED) {
          throw new NotFoundException('Không tìm thấy nhóm đăng ký.');
        }

        if (group.members.some((member) => member.studentId === studentId)) {
          throw new ConflictException('Bạn đã là thành viên của nhóm này.');
        }

        if (!group.openForJoin) {
          throw new ConflictException(
            'Nhóm đã khóa nhận thành viên mới.',
          );
        }

        const seats = seatBreakdown(group);

        if (seats.occupied >= seats.capacity) {
          throw new ConflictException('Nhóm đã đủ số lượng thành viên.');
        }

        if (!options.allowHeldSeats && seats.freeToAnyone === 0) {
          throw new ConflictException(
            'Các vị trí còn lại đang dành cho thành viên được nhóm trưởng mời.',
          );
        }

        await tx.registrationGroupMember.create({
          data: {
            groupId,
            semesterId: group.semesterId,
            studentId,
            status: GroupMemberStatus.ACCEPTED,
            joinSource,
            joinedAt: new Date(),
          },
        });

        await this.syncStatus(tx, groupId, seats.capacity);

        // Gathered while the row is still locked, so the list is exactly who was
        // in the group at the moment this student joined it.
        return {
          userIds: group.members.map((member) => member.student.user.id),
          topicTitle: group.topic.title,
        };
      })
      .catch((err: unknown) => {
        throw this.translateRegistrationConflict(err);
      });

    await this.notifications.notify(
      audience.userIds.map((userId) => ({
        userId,
        type: NotificationType.GROUP_MEMBER_JOINED,
        title: 'Có người tham gia nhóm của bạn',
        content: `${student.fullName} vừa vào nhóm đề tài "${audience.topicTitle}".`,
        targetId: groupId,
      })),
    );

    return this.present(groupId, { studentId });
  }

  private async present(id: number, viewer: { studentId: number }) {
    const group = await this.loadGroup(id);

    return this.render(group, {
      studentId: viewer.studentId,
      lecturerId: null,
      role: Role.STUDENT,
    });
  }

  private async loadGroup(id: number): Promise<GroupRow> {
    const group = await this.prisma.registrationGroup.findUnique({
      where: { id },
      select: GROUP_SELECT,
    });

    if (!group) throw new NotFoundException('Không tìm thấy nhóm đăng ký.');

    return group;
  }

  private render(group: GroupRow, viewer: Viewer) {
    const seats = seatBreakdown(group);
    const { joinCode, members, topic, ...rest } = group;
    const { round, ...topicRest } = topic;
    const isMember = members.some(
      (member) => member.studentId === viewer.studentId,
    );

    return {
      ...rest,
      // Flattened back to the shape callers already read: the kind of project
      // reaches the topic through its round now, and which table it came from is
      // not the client's problem.
      topic: { ...topicRest, projectType: round.projectType },
      /*
        What the group has to hand in, lifted out of the round because this is
        the screen they read before handing anything in — and until then there
        is no submission to hang a due date off.
      */
      requirements: round.requirements,
      members: members.map((member) => {
        const { user, ...student } = member.student;

        return {
          id: member.id,
          joinSource: member.joinSource,
          joinedAt: member.joinedAt,
          isLeader: member.studentId === group.leaderId,
          // The avatar is lifted onto the student the same way the address is:
          // it is stored against the account, but to this screen it is simply
          // what this person looks like.
          student: { ...student, email: user.email, avatarUrl: user.avatarUrl },
        };
      }),
      occupiedSeats: seats.occupied,
      heldSeats: seats.held,
      seatsOpenToAnyone: seats.freeToAnyone,
      isFull: seats.occupied >= seats.capacity,
      holdActive: seats.holdActive,
      isLeader: group.leaderId === viewer.studentId,
      joinCode: isMember ? joinCode : null,
    };
  }

  private canView(group: GroupRow, viewer: Viewer): boolean {
    if (viewer.role === Role.ADMIN) return true;
    if (viewer.lecturerId && group.topic.lecturerId === viewer.lecturerId) {
      return true;
    }

    return group.members.some(
      (member) => member.studentId === viewer.studentId,
    );
  }

  private async resolveViewer(userId: number, role: Role): Promise<Viewer> {
    if (role === Role.STUDENT) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      return { studentId: profile?.id ?? null, lecturerId: null, role };
    }

    if (role === Role.LECTURER) {
      const profile = await this.prisma.lecturerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      return { studentId: null, lecturerId: profile?.id ?? null, role };
    }

    return { studentId: null, lecturerId: null, role };
  }

  private async requireLeadership(id: number, studentId: number) {
    const group = await this.loadGroup(id);

    if (group.status === RegistrationGroupStatus.REJECTED) {
      throw new ConflictException('Nhóm này đã giải tán.');
    }

    if (group.leaderId !== studentId) {
      throw new ForbiddenException('Chỉ nhóm trưởng mới có quyền thực hiện thao tác này.');
    }

    return group;
  }

  private async requireNoExistingGroup(studentId: number, semesterId: number) {
    const existing = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId,
        semesterId,
        status: GroupMemberStatus.ACCEPTED,
        group: { status: { not: RegistrationGroupStatus.REJECTED } },
      },
      select: {
        group: { select: { id: true, topic: { select: { title: true } } } },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Sinh viên hiện đã tham gia nhóm đề tài "${existing.group.topic.title}" trong học kỳ này.`,
      );
    }
  }

  private async requireGroupByCode(joinCode: string) {
    const group = await this.prisma.registrationGroup.findUnique({
      where: { joinCode },
      select: GROUP_SELECT,
    });

    // A disbanded group answers the same as an unknown code. The link is dead
    // either way, and distinguishing them would tell a stranger holding a stale
    // link that it was once real.
    if (!group || group.status === RegistrationGroupStatus.REJECTED) {
      throw new NotFoundException('Liên kết mời tham gia nhóm không còn hiệu lực.');
    }

    return group;
  }

  private async assertJoinable(
    group: GroupRow,
    student: { id: number; cohort: string | null },
    options: { allowHeldSeats: boolean },
  ) {
    await this.phases.requireCanJoin(group.topic.roundId, student.id);

    const topic = await this.requireRegistrableTopic(group.topicId);
    await this.requireEligible(topic, student);
    await this.requireNoExistingGroup(student.id, group.semesterId);

    if (!group.openForJoin) {
      throw new ConflictException(
        'Nhóm đã khóa nhận thành viên mới.',
      );
    }

    const seats = seatBreakdown(group);

    if (seats.occupied >= seats.capacity) {
      throw new ConflictException('Nhóm đã đủ số lượng thành viên.');
    }

    if (!options.allowHeldSeats && seats.freeToAnyone === 0) {
      throw new ConflictException(
        'Các vị trí còn lại đang dành cho thành viên được nhóm trưởng mời.',
      );
    }
  }

  private async requireStudent(userId: number) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cohort: true, fullName: true },
    });

    if (!profile) {
      throw new ForbiddenException(
        'Tài khoản chưa được liên kết với hồ sơ sinh viên.',
      );
    }

    return profile;
  }

  private async requireRegistrableTopic(id: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        semesterId: true,
        roundId: true,
        maxStudents: true,
        status: true,
        round: { select: { projectType: { select: { name: true } } } },
        // Who, if anyone, this topic was written for. See requireProposerOrFree.
        sourceProposal: { select: { studentId: true } },
      },
    });

    if (!topic) throw new NotFoundException('Không tìm thấy đề tài.');

    if (topic.status !== TopicStatus.OPEN) {
      throw new ConflictException(
        'Đề tài hiện chưa mở đăng ký.',
      );
    }

    return topic;
  }

  private async requireEligible(
    topic: { roundId: number; round: { projectType: { name: string } } },
    student: { id: number; cohort: string | null },
  ) {
    // 1. Check if an official roster has been imported for this round
    const rosterCount = await this.prisma.roundStudentEligibility.count({
      where: { roundId: topic.roundId },
    });

    if (rosterCount > 0) {
      const match = await this.prisma.roundStudentEligibility.findUnique({
        where: {
          roundId_studentId: {
            roundId: topic.roundId,
            studentId: student.id,
          },
        },
      });
      if (match) return;

      throw new ForbiddenException(
        `Bạn không nằm trong danh sách đủ điều kiện tham gia ${topic.round.projectType.name} học kỳ này. Vui lòng liên hệ Giáo vụ Khoa nếu có thắc mắc.`,
      );
    }

    // 2. Fallback to cohort-based rule if no specific student roster was imported
    if (!student.cohort) {
      throw new ForbiddenException(
        'Hồ sơ sinh viên thiếu thông tin khóa học để xét điều kiện tham gia.',
      );
    }

    const match = await this.prisma.roundEligibility.findFirst({
      where: { roundId: topic.roundId, cohort: student.cohort },
      select: { id: true },
    });

    if (match) return;

    // Told apart because they call for different action: one is a student
    // looking at the wrong kind of project, the other is the faculty office not
    // having declared anything yet, and answering both with "you are not
    // eligible" sends the wrong person looking for the fault.
    const anyRule = await this.prisma.roundEligibility.findFirst({
      where: { roundId: topic.roundId },
      select: { id: true },
    });

    if (!anyRule) {
      throw new ConflictException(
        'Khoa chưa cấu hình điều kiện khóa sinh viên cho đợt đăng ký này.',
      );
    }

    throw new ForbiddenException(
      `${topic.round.projectType.name} học kỳ này không áp dụng cho sinh viên khóa ${student.cohort}.`,
    );
  }

  private async requireActiveSemesterId() {
    const semester = await this.prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!semester) {
      throw new NotFoundException('Không có học kỳ nào đang kích hoạt.');
    }

    return semester.id;
  }

  private translateRegistrationConflict(err: unknown): unknown {
    if (!isUniqueViolation(err)) return err;

    const target = uniqueConstraintName(err);

    if (target.includes('one_live_per_topic')) {
      return new ConflictException(
        'Đề tài này vừa được nhóm khác đăng ký — vui lòng chọn đề tài khác.',
      );
    }

    if (target.includes('one_accepted_per_semester')) {
      return new ConflictException(
        'Sinh viên đã tham gia nhóm trong học kỳ này — vui lòng rời nhóm cũ trước khi đăng ký.',
      );
    }

    return new ConflictException(
      'Thao tác đăng ký bị trùng lặp — vui lòng tải lại trang và thử lại.',
    );
  }
}
