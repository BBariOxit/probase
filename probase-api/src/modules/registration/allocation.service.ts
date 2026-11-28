import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupJoinSource,
  GroupMemberStatus,
  NotificationType,
  Prisma,
  RegistrationGroupStatus,
  RoundPhase,
  TopicStatus,
} from '../../../generated/prisma/client';
import {
  isUniqueViolation,
  uniqueConstraintName,
} from '../../common/utils/prisma-error.util';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { markTopicsUnderway } from '../rounds/topic-lifecycle';
import { StudentRosterService } from '../students/student-roster.service';
import { FinalizeRoundDto, PlaceStudentDto } from './dto/allocation.dto';
import {
  AutoAllocateStrategy,
  AutoPreviewDto,
  BatchPlaceDto,
  BatchUnplaceDto,
} from './dto/allocation.dto';
import { statusForSeats } from './group-seats';

@Injectable()
export class AllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phases: RoundPhaseService,
    private readonly notifications: NotificationsService,
    private readonly roster: StudentRosterService,
  ) {}

  async desk(roundId: number) {
    const round = await this.requireRound(roundId);
    const phase = await this.phases.resolve(roundId);

    const [students, topics, placements] = await Promise.all([
      this.unplacedStudents(round),
      this.topicsWithSeats(roundId),
      this.placementsMade(roundId),
    ]);

    const open = topics.filter((topic) => topic.status === TopicStatus.OPEN);
    const unopened = topics.filter(
      (topic) => topic.status === TopicStatus.APPROVED,
    );
    const openSeats = sumSeats(open);

    return {
      round: {
        id: round.id,
        phase,
        semester: round.semester,
        projectType: round.projectType,
        cohorts: round.eligibilities.map((rule) => rule.cohort),
      },
      canPlace: phase === RoundPhase.RECONCILING,

      blockedReason:
        phase === RoundPhase.RECONCILING ? null : PLACEMENT_CLOSED[phase],
      summary: {
        unplacedCount: students.length,
        openSeats,

        shortfall: Math.max(0, students.length - openSeats),

        unopenedTopics: unopened.length,
        unopenedSeats: sumSeats(unopened),
      },
      students,
      topics: open,

      placements,
    };
  }

  async place(roundId: number, dto: PlaceStudentDto, adminUserId: number) {
    const result = await this.executeBatchPlace(roundId, [dto], adminUserId);
    const placed = result.placements[0];

    return {
      groupId: placed.groupId,
      topicId: placed.topicId,
      studentId: placed.studentId,
      message: `Đã xếp ${placed.studentName} vào đề tài "${placed.topicTitle}".`,
    };
  }

  async batchPlace(roundId: number, dto: BatchPlaceDto, adminUserId: number) {
    const seen = new Set<number>();
    for (const item of dto.placements) {
      if (seen.has(item.studentId)) {
        throw new ConflictException(
          'Danh sách xếp có sinh viên bị trùng lặp — vui lòng kiểm tra lại.',
        );
      }
      seen.add(item.studentId);
    }

    const result = await this.executeBatchPlace(
      roundId,
      dto.placements,
      adminUserId,
    );

    return {
      placedCount: result.placements.length,
      groupIds: [...new Set(result.placements.map((item) => item.groupId))],
      placements: result.placements.map((item) => ({
        groupId: item.groupId,
        topicId: item.topicId,
        studentId: item.studentId,
      })),
      message: `Đã xếp ${result.placements.length} sinh viên vào đề tài.`,
    };
  }

  async unplace(roundId: number, studentId: number, adminUserId: number) {
    const result = await this.executeBatchUnplace(
      roundId,
      [studentId],
      adminUserId,
    );
    const removed = result[0];

    return {
      studentId,
      message: `Đã bỏ ${removed.studentName} khỏi đề tài "${removed.topicTitle}".`,
    };
  }

  async batchUnplace(
    roundId: number,
    dto: BatchUnplaceDto,
    adminUserId: number,
  ) {
    const uniqueStudentIds = [...new Set(dto.studentIds)];
    const removed = await this.executeBatchUnplace(
      roundId,
      uniqueStudentIds,
      adminUserId,
    );

    return {
      removedCount: removed.length,
      message: `Đã bỏ xếp ${removed.length} sinh viên.`,
    };
  }

  async autoPreview(roundId: number, dto: AutoPreviewDto) {
    const round = await this.requireRound(roundId);
    const phase = await this.phases.resolve(roundId);

    const [allStudents, allTopics, liveGroups] = await Promise.all([
      this.unplacedStudents(round),
      this.topicsWithSeats(roundId),
      this.prisma.registrationGroup.findMany({
        where: {
          status: { not: RegistrationGroupStatus.REJECTED },
          topic: { roundId },
        },
        select: {
          topic: { select: { lecturerId: true } },
          _count: {
            select: {
              members: { where: { status: GroupMemberStatus.ACCEPTED } },
            },
          },
        },
      }),
    ]);

    const openTopics = allTopics.filter(
      (topic) => topic.status === TopicStatus.OPEN,
    );
    const unopenedTopics = allTopics.filter(
      (topic) => topic.status === TopicStatus.APPROVED,
    );

    const studentFilter = dto.studentIds?.length
      ? new Set(dto.studentIds)
      : null;
    const topicFilter = dto.topicIds?.length ? new Set(dto.topicIds) : null;

    const candidateStudents = studentFilter
      ? allStudents.filter((student) => studentFilter.has(student.id))
      : allStudents;
    const candidateTopics = topicFilter
      ? openTopics.filter((topic) => topicFilter.has(topic.id))
      : openTopics;

    const lecturerStudentCounts = new Map<number, number>();
    for (const group of liveGroups) {
      const prev = lecturerStudentCounts.get(group.topic.lecturerId) ?? 0;
      lecturerStudentCounts.set(
        group.topic.lecturerId,
        prev + group._count.members,
      );
    }

    const plan = buildAutoAllocationPlan({
      students: candidateStudents,
      topics: candidateTopics,
      lecturerStudentCounts,
      strategy: dto.strategy,
      allowCrossMajor: dto.allowCrossMajor,
    });

    const crossMajorCount = plan.matched.filter(
      (item) => item.matchType === 'CROSS_MAJOR',
    ).length;

    return {
      canPlace: phase === RoundPhase.RECONCILING,
      blockedReason:
        phase === RoundPhase.RECONCILING ? null : PLACEMENT_CLOSED[phase],
      strategy: dto.strategy,
      allowCrossMajor: dto.allowCrossMajor,
      matched: plan.matched,
      unmatched: plan.unmatched,
      summary: {
        matchedCount: plan.matched.length,
        unmatchedCount: plan.unmatched.length,
        crossMajorCount,
        unopenedTopics: unopenedTopics.length,
        unopenedSeats: sumSeats(unopenedTopics),
      },
    };
  }

  private async executeBatchPlace(
    roundId: number,
    items: PlaceStudentDto[],
    adminUserId: number,
  ) {
    const round = await this.requirePlaceableRound(roundId);
    const uniqueTopicIds = [...new Set(items.map((item) => item.topicId))].sort(
      (a, b) => a - b,
    );
    const studentIds = items.map((item) => item.studentId);

    const [studentsMap, topicsMap] = await Promise.all([
      this.requirePlaceableStudents(studentIds, round),
      this.requirePlaceableTopics(uniqueTopicIds, roundId),
    ]);

    const itemsByTopic = new Map<number, PlaceStudentDto[]>();
    for (const item of items) {
      const list = itemsByTopic.get(item.topicId) ?? [];
      list.push(item);
      itemsByTopic.set(item.topicId, list);
    }

    const committed = await this.prisma
      .$transaction(async (tx) => {
        const results: {
          groupId: number;
          topicId: number;
          topicTitle: string;
          lecturerUserId: number;
          studentId: number;
          studentName: string;
          studentUserId: number;
          existingMemberUserIds: number[];
        }[] = [];

        // Lock in ascending topicId order so concurrent batch operations cannot deadlock.
        for (const topicId of uniqueTopicIds) {
          const topic = topicsMap.get(topicId)!;
          const incoming = itemsByTopic.get(topicId)!;

          await tx.$queryRaw`SELECT 1 FROM "topics" WHERE "id" = ${topic.id} FOR UPDATE`;

          const group = await tx.registrationGroup.findFirst({
            where: {
              topicId: topic.id,
              status: { not: RegistrationGroupStatus.REJECTED },
            },
            select: {
              id: true,
              leaderId: true,
              members: {
                where: { status: GroupMemberStatus.ACCEPTED },
                select: {
                  studentId: true,
                  student: { select: { userId: true } },
                },
              },
            },
          });

          const occupied = group?.members.length ?? 0;

          if (occupied + incoming.length > topic.maxStudents) {
            throw new ConflictException(
              `Đề tài "${topic.title}" chỉ còn ${Math.max(0, topic.maxStudents - occupied)} chỗ trống, không thể xếp thêm ${incoming.length} sinh viên.`,
            );
          }

          const firstStudent = studentsMap.get(incoming[0].studentId)!;
          const groupId = group
            ? group.id
            : await this.openGroupFor(tx, topic, firstStudent.id);
          const existingMemberUserIds = (group?.members ?? []).map(
            (member) => member.student.userId,
          );
          const now = new Date();

          for (let idx = 0; idx < incoming.length; idx++) {
            const student = studentsMap.get(incoming[idx].studentId)!;

            await tx.registrationGroupMember.create({
              data: {
                groupId,
                semesterId: topic.semesterId,
                studentId: student.id,
                status: GroupMemberStatus.ACCEPTED,
                joinSource: GroupJoinSource.ASSIGNED,
                assignedById: adminUserId,
                assignedAt: now,
                joinedAt: now,
              },
            });

            await tx.auditLog.create({
              data: {
                userId: adminUserId,
                action: 'ASSIGN_GROUP_MEMBER',
                targetTable: 'registration_group_members',
                targetId: `${groupId}:${student.id}`,
                newValue: {
                  roundId,
                  topicId: topic.id,
                  groupId,
                  studentId: student.id,
                  studentCode: student.studentCode,
                  createdGroup: group === null && idx === 0,
                },
              },
            });

            results.push({
              groupId,
              topicId: topic.id,
              topicTitle: topic.title,
              lecturerUserId: topic.lecturer.userId,
              studentId: student.id,
              studentName: student.fullName,
              studentUserId: student.userId,
              existingMemberUserIds,
            });
          }

          await tx.registrationGroup.update({
            where: { id: groupId },
            data: {
              status: statusForSeats(
                occupied + incoming.length,
                topic.maxStudents,
              ),
            },
          });
        }

        return results;
      })
      .catch((err: unknown) => {
        throw translatePlacementConflict(err);
      });

    await this.announceBatchPlacements(committed);

    return { placements: committed };
  }

  private async executeBatchUnplace(
    roundId: number,
    studentIds: number[],
    adminUserId: number,
  ) {
    await this.requirePlaceableRound(roundId);
    const members = await this.requireOwnPlacements(roundId, studentIds);

    const byGroup = new Map<number, typeof members>();
    for (const member of members) {
      const list = byGroup.get(member.groupId) ?? [];
      list.push(member);
      byGroup.set(member.groupId, list);
    }

    const sortedGroups = [...byGroup.values()].sort(
      (a, b) => a[0].group.topicId - b[0].group.topicId,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const groupMembers of sortedGroups) {
        const first = groupMembers[0];
        const topicId = first.group.topicId;

        await tx.$queryRaw`SELECT 1 FROM "topics" WHERE "id" = ${topicId} FOR UPDATE`;

        await tx.registrationGroupMember.deleteMany({
          where: { id: { in: groupMembers.map((member) => member.id) } },
        });

        const remaining = await tx.registrationGroupMember.findMany({
          where: {
            groupId: first.groupId,
            status: GroupMemberStatus.ACCEPTED,
          },
          select: { studentId: true, joinedAt: true },
          orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        });

        const removedIds = new Set(groupMembers.map((m) => m.student.id));

        if (remaining.length === 0) {
          await tx.registrationGroup.update({
            where: { id: first.groupId },
            data: { status: RegistrationGroupStatus.REJECTED },
          });
        } else {
          await tx.registrationGroup.update({
            where: { id: first.groupId },
            data: {
              status: statusForSeats(
                remaining.length,
                first.group.topic.maxStudents,
              ),
              ...(removedIds.has(first.group.leaderId) && {
                leaderId: remaining[0].studentId,
              }),
            },
          });
        }

        for (const member of groupMembers) {
          await tx.auditLog.create({
            data: {
              userId: adminUserId,
              action: 'UNASSIGN_GROUP_MEMBER',
              targetTable: 'registration_group_members',
              targetId: `${member.groupId}:${member.student.id}`,
              oldValue: {
                roundId,
                topicId: member.group.topicId,
                groupId: member.groupId,
                studentId: member.student.id,
                studentCode: member.student.studentCode,
              },
            },
          });
        }
      }
    });

    await this.notifications.notify(
      members.map((member) => ({
        userId: member.student.userId,
        type: NotificationType.GROUP_MEMBER_REMOVED,
        title: 'Bạn đã được chuyển khỏi đề tài',
        content: `Khoa đã chuyển bạn khỏi đề tài "${member.group.topic.title}" trong lúc sắp xếp. Bạn sẽ được xếp vào một đề tài khác trước khi khoa chốt danh sách.`,
        targetId: member.group.topicId,
      })),
    );

    return members.map((member) => ({
      studentId: member.student.id,
      studentName: member.student.fullName,
      topicTitle: member.group.topic.title,
    }));
  }

  async finalize(roundId: number, dto: FinalizeRoundDto, adminUserId: number) {
    const round = await this.requireRound(roundId);
    const phase = await this.phases.resolve(roundId);

    if (phase !== RoundPhase.RECONCILING) {
      throw new ConflictException(
        phase === RoundPhase.FINALIZED
          ? 'Đợt này đã được chốt rồi.'
          : 'Chỉ chốt được đợt đang ở bước phân bổ, tức là sau khi cổng đăng ký đã đóng.',
      );
    }

    const unplaced = await this.unplacedStudents(round);

    if (unplaced.length > 0 && !dto.acknowledgeUnplaced) {
      throw new ConflictException(
        `Còn ${unplaced.length} sinh viên chưa được xếp đề tài. Xếp nốt, hoặc chốt kèm lý do nếu các bạn ấy thực sự không tham gia học kỳ này.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Guarded on the phase rather than a plain update: two administrators
      // pressing at once would otherwise both write, and the second would
      // record itself as the author of a decision the first had already made.
      const { count } = await tx.registrationRound.updateMany({
        where: { id: roundId, phase: RoundPhase.RECONCILING },
        data: {
          phase: RoundPhase.FINALIZED,
          finalisedAt: new Date(),
          finalisedById: adminUserId,
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Đợt này vừa thay đổi trạng thái — tải lại trang rồi thử lại.',
        );
      }

      const underway = await markTopicsUnderway(tx, roundId);

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'FINALIZE_REGISTRATION_ROUND',
          targetTable: 'registration_rounds',
          targetId: String(roundId),
          oldValue: { phase: RoundPhase.RECONCILING },
          newValue: {
            phase: RoundPhase.FINALIZED,
            topicsUnderway: underway,
            unplacedCount: unplaced.length,
            unplacedStudentCodes: unplaced.map(
              (student) => student.studentCode,
            ),
            // The only record of why a round was sealed with students left out
            // of it, which is the reason the field is required to acknowledge.
            ...(dto.acknowledgeUnplaced && { reason: dto.reason }),
          },
        },
      });
    });

    await this.announceOutcome(roundId, unplaced);

    return {
      roundId,
      unplacedCount: unplaced.length,
      message:
        unplaced.length === 0
          ? 'Đã chốt phân bổ cho đợt này.'
          : `Đã chốt phân bổ. ${unplaced.length} sinh viên không được xếp đề tài trong học kỳ này.`,
    };
  }

  // ── the two lists ─────────────────────────────────────────

  private async unplacedStudents(round: RoundRow) {
    if ((round._count?.eligibleStudents ?? 0) > 0) {
      return this.roster.find({
        semesterId: round.semesterId,
        roundId: round.id,
        hasGroup: false,
      });
    }

    const cohorts = round.eligibilities.map((rule) => rule.cohort);

    // No declared intake means the round covers nobody yet, which is not the
    // same question as "everybody" — and an empty filter would ask that one.
    if (cohorts.length === 0) return [];

    return this.roster.find({
      semesterId: round.semesterId,
      cohorts,
      hasGroup: false,
    });
  }

  private async placementsMade(roundId: number) {
    const members = await this.prisma.registrationGroupMember.findMany({
      where: {
        status: GroupMemberStatus.ACCEPTED,
        joinSource: GroupJoinSource.ASSIGNED,
        group: {
          status: { not: RegistrationGroupStatus.REJECTED },
          topic: { roundId },
        },
      },
      select: {
        assignedAt: true,
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            class: true,
            major: { select: { id: true, name: true, code: true } },
          },
        },
        group: {
          select: {
            id: true,
            topicId: true,
            topic: {
              select: {
                title: true,
                major: { select: { id: true, name: true, code: true } },
                lecturer: {
                  select: {
                    major: { select: { id: true, name: true, code: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return members.map((member) => ({
      student: member.student,
      groupId: member.group.id,
      topicId: member.group.topicId,
      topicTitle: member.group.topic.title,
      topicMajor:
        member.group.topic.major ?? member.group.topic.lecturer.major ?? null,
      assignedAt: member.assignedAt,
    }));
  }

  private async topicsWithSeats(roundId: number) {
    const topics = await this.prisma.topic.findMany({
      where: {
        roundId,
        status: { in: [TopicStatus.OPEN, TopicStatus.APPROVED] },
      },
      select: {
        id: true,
        title: true,
        maxStudents: true,
        status: true,
        major: { select: { id: true, name: true, code: true } },
        lecturer: {
          select: {
            id: true,
            fullName: true,
            academicTitle: true,
            major: { select: { id: true, name: true, code: true } },
          },
        },
        registrationGroups: {
          where: { status: { not: RegistrationGroupStatus.REJECTED } },
          select: {
            id: true,
            name: true,
            members: {
              where: { status: GroupMemberStatus.ACCEPTED },
              select: {
                student: {
                  select: {
                    id: true,
                    studentCode: true,
                    fullName: true,
                    class: true,
                    major: { select: { id: true, name: true, code: true } },
                  },
                },
              },
              orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
            },
          },
          take: 1,
        },
      },
      orderBy: { title: 'asc' },
    });

    return topics
      .map(({ registrationGroups, major, lecturer, ...topic }) => {
        const group = registrationGroups[0];
        const existingMembers =
          group?.members.map((member) => member.student) ?? [];
        const occupiedSeats = existingMembers.length;

        return {
          ...topic,
          major: major ?? lecturer.major ?? null,
          lecturer: {
            id: lecturer.id,
            fullName: lecturer.fullName,
            academicTitle: lecturer.academicTitle,
          },
          occupiedSeats,
          freeSeats: Math.max(0, topic.maxStudents - occupiedSeats),
          group: group ? { id: group.id, name: group.name } : null,
          existingMembers,
        };
      })
      .filter((topic) => topic.freeSeats > 0);
  }

  // ── guards ────────────────────────────────────────────────

  private async requireRound(roundId: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        semesterId: true,
        semester: { select: { id: true, name: true, code: true } },
        projectType: { select: { id: true, name: true, code: true } },
        eligibilities: { select: { cohort: true } },
        _count: { select: { eligibleStudents: true } },
      },
    });

    if (!round) throw new NotFoundException('Không tìm thấy đợt đăng ký');

    return round;
  }

  private async requirePlaceableRound(roundId: number) {
    const round = await this.requireRound(roundId);
    const phase = await this.phases.resolve(roundId);

    if (phase !== RoundPhase.RECONCILING) {
      throw new ConflictException(PLACEMENT_CLOSED[phase]);
    }

    return round;
  }

  private async requirePlaceableStudents(
    studentIds: number[],
    round: RoundRow,
  ) {
    const students = await this.prisma.studentProfile.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        cohort: true,
        userId: true,
        user: { select: { isActive: true } },
      },
    });

    const studentMap = new Map(
      students.map((student) => [student.id, student]),
    );

    for (const studentId of studentIds) {
      const student = studentMap.get(studentId);
      if (!student || !student.user.isActive) {
        throw new NotFoundException('Không tìm thấy sinh viên này');
      }
    }

    if ((round._count?.eligibleStudents ?? 0) > 0) {
      const matches = await this.prisma.roundStudentEligibility.findMany({
        where: {
          roundId: round.id,
          studentId: { in: studentIds },
        },
        select: { studentId: true },
      });
      const eligibleIds = new Set(matches.map((match) => match.studentId));

      for (const studentId of studentIds) {
        if (!eligibleIds.has(studentId)) {
          const student = studentMap.get(studentId)!;
          throw new ForbiddenException(
            `${student.fullName} không nằm trong danh sách đủ điều kiện của đợt này, nên không xếp vào đây được.`,
          );
        }
      }
    } else {
      const cohorts = round.eligibilities.map((rule) => rule.cohort);
      for (const studentId of studentIds) {
        const student = studentMap.get(studentId)!;
        if (student.cohort === null || !cohorts.includes(student.cohort)) {
          throw new ForbiddenException(
            `Khóa ${student.cohort ?? 'chưa rõ'} không thuộc đợt này, nên không xếp ${student.fullName} vào đây được.`,
          );
        }
      }
    }

    const existingList = await this.prisma.registrationGroupMember.findMany({
      where: {
        studentId: { in: studentIds },
        semesterId: round.semesterId,
        status: GroupMemberStatus.ACCEPTED,
        group: { status: { not: RegistrationGroupStatus.REJECTED } },
      },
      select: {
        studentId: true,
        group: { select: { topic: { select: { title: true } } } },
      },
    });

    if (existingList.length > 0) {
      const first = existingList[0];
      const student = studentMap.get(first.studentId)!;
      throw new ConflictException(
        `${student.fullName} đã có đề tài trong học kỳ này ("${first.group.topic.title}").`,
      );
    }

    return studentMap;
  }

  private async requirePlaceableTopics(topicIds: number[], roundId: number) {
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: {
        id: true,
        title: true,
        roundId: true,
        semesterId: true,
        maxStudents: true,
        status: true,
        lecturer: { select: { userId: true } },
      },
    });

    const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

    for (const topicId of topicIds) {
      const topic = topicMap.get(topicId);
      if (!topic || topic.roundId !== roundId) {
        throw new NotFoundException('Không tìm thấy đề tài này trong đợt');
      }

      if (topic.status !== TopicStatus.OPEN) {
        throw new ConflictException(
          `Đề tài "${topic.title}" chưa mở đăng ký, nên chưa xếp ai vào được. Đề nghị giảng viên mở đề tài trước.`,
        );
      }
    }

    return topicMap;
  }

  private async requireOwnPlacements(roundId: number, studentIds: number[]) {
    const members = await this.prisma.registrationGroupMember.findMany({
      where: {
        studentId: { in: studentIds },
        status: GroupMemberStatus.ACCEPTED,
        group: {
          status: { not: RegistrationGroupStatus.REJECTED },
          topic: { roundId },
        },
      },
      select: {
        id: true,
        groupId: true,
        joinSource: true,
        student: {
          select: { id: true, fullName: true, studentCode: true, userId: true },
        },
        group: {
          select: {
            topicId: true,
            leaderId: true,
            topic: { select: { title: true, maxStudents: true } },
          },
        },
      },
    });

    const foundByStudent = new Map(
      members.map((member) => [member.student.id, member]),
    );

    for (const studentId of studentIds) {
      const member = foundByStudent.get(studentId);
      if (!member) {
        throw new NotFoundException(
          'Sinh viên này chưa được xếp vào đề tài nào trong đợt',
        );
      }

      if (member.joinSource !== GroupJoinSource.ASSIGNED) {
        throw new ConflictException(
          `${member.student.fullName} tự đăng ký đề tài "${member.group.topic.title}", không phải khoa xếp — nên không bỏ ở đây được.`,
        );
      }
    }

    return studentIds.map((studentId) => foundByStudent.get(studentId)!);
  }

  // ── writes and notices ────────────────────────────────────

  private async openGroupFor(
    tx: Prisma.TransactionClient,
    topic: { id: number; semesterId: number; maxStudents: number },
    leaderId: number,
  ) {
    const group = await tx.registrationGroup.create({
      data: {
        topicId: topic.id,
        semesterId: topic.semesterId,
        leaderId,
        openForJoin: false,
        joinCode: null,
        status: statusForSeats(0, topic.maxStudents),
      },
      select: { id: true },
    });

    return group.id;
  }

  private async announceBatchPlacements(
    placements: {
      groupId: number;
      topicId: number;
      topicTitle: string;
      lecturerUserId: number;
      studentName: string;
      studentUserId: number;
      existingMemberUserIds: number[];
    }[],
  ) {
    if (placements.length === 0) return;

    const notifications: Parameters<NotificationsService['notify']>[0] = [];
    const byTopic = new Map<number, typeof placements>();

    for (const item of placements) {
      notifications.push({
        userId: item.studentUserId,
        type: NotificationType.GROUP_MEMBER_ASSIGNED,
        title: 'Khoa đã xếp bạn vào một đề tài',
        content: `Bạn được xếp vào đề tài "${item.topicTitle}". Mở trang nhóm để xem đề tài và những bạn cùng nhóm.`,
        targetId: item.groupId,
      });

      const list = byTopic.get(item.topicId) ?? [];
      list.push(item);
      byTopic.set(item.topicId, list);
    }

    for (const groupPlacements of byTopic.values()) {
      const first = groupPlacements[0];
      const names = groupPlacements.map((item) => item.studentName).join(', ');

      for (const existingUserId of first.existingMemberUserIds) {
        notifications.push({
          userId: existingUserId,
          type: NotificationType.GROUP_MEMBER_ASSIGNED,
          title: 'Nhóm của bạn có thêm thành viên',
          content: `Khoa đã xếp ${names} vào nhóm đề tài "${first.topicTitle}".`,
          targetId: first.groupId,
        });
      }

      notifications.push({
        userId: first.lecturerUserId,
        type: NotificationType.TOPIC_STUDENT_ASSIGNED,
        title: 'Khoa xếp sinh viên vào đề tài của bạn',
        content: `${names} được khoa xếp vào đề tài "${first.topicTitle}" của bạn.`,
        targetId: first.topicId,
      });
    }

    await this.notifications.notify(notifications);
  }

  private async announceOutcome(
    roundId: number,
    unplaced: { userId: number }[],
  ) {
    const placed = await this.prisma.registrationGroupMember.findMany({
      where: {
        status: GroupMemberStatus.ACCEPTED,
        group: {
          status: { not: RegistrationGroupStatus.REJECTED },
          topic: { roundId },
        },
      },
      select: { student: { select: { userId: true } } },
    });

    await this.notifications.notify([
      ...placed.map((member) => ({
        userId: member.student.userId,
        type: NotificationType.ROUND_FINALIZED,
        title: 'Đề tài của bạn đã được chốt',
        content:
          'Khoa đã chốt phân bổ cho đợt này. Đề tài và nhóm của bạn giờ là chính thức, từ đây là phần làm đồ án.',
        targetId: roundId,
      })),
      ...unplaced.map((student) => ({
        userId: student.userId,
        type: NotificationType.ROUND_FINALIZED,
        title: 'Học kỳ này bạn chưa có đề tài',
        content:
          'Khoa đã chốt phân bổ và bạn chưa được xếp vào đề tài nào trong học kỳ này. Liên hệ giáo vụ khoa nếu đây là sai sót.',
        targetId: roundId,
      })),
    ]);
  }
}

type RoundRow = {
  id: number;
  semesterId: number;
  eligibilities: { cohort: string }[];
  _count?: { eligibleStudents: number };
};

type AutoPlanStudent = {
  id: number;
  studentCode: string;
  fullName: string;
  class: string | null;
  cohort: string | null;
  major: { id: number; name: string; code: string } | null;
};

type AutoPlanTopic = {
  id: number;
  title: string;
  maxStudents: number;
  major: { id: number; name: string; code: string } | null;
  lecturer: { id: number; fullName: string; academicTitle: string | null };
  occupiedSeats: number;
  freeSeats: number;
  existingMembers: { class: string | null }[];
};

export type AutoMatchType = 'SAME_MAJOR' | 'FLEXIBLE' | 'CROSS_MAJOR';

export function buildAutoAllocationPlan<
  S extends AutoPlanStudent,
  T extends AutoPlanTopic,
>({
  students,
  topics,
  lecturerStudentCounts,
  strategy,
  allowCrossMajor,
}: {
  students: S[];
  topics: T[];
  lecturerStudentCounts: Map<number, number>;
  strategy: AutoAllocateStrategy;
  allowCrossMajor: boolean;
}) {
  const slots = topics.map((topic) => ({
    topic,
    freeSeats: topic.freeSeats,
    occupiedSeats: topic.occupiedSeats,
    existingClasses: new Set(
      topic.existingMembers
        .map((member) => member.class)
        .filter((cls): cls is string => Boolean(cls)),
    ),
    lecturerLoad: lecturerStudentCounts.get(topic.lecturer.id) ?? 0,
  }));

  // Group classmates together so multi-seat empty topics naturally pair students from the same class.
  const orderedStudents = [...students].sort((a, b) => {
    const majorDiff =
      (a.major?.id ?? Number.MAX_SAFE_INTEGER) -
      (b.major?.id ?? Number.MAX_SAFE_INTEGER);
    if (majorDiff !== 0) return majorDiff;
    const classDiff = (a.class ?? '').localeCompare(b.class ?? '');
    if (classDiff !== 0) return classDiff;
    return a.studentCode.localeCompare(b.studentCode);
  });

  const matched: {
    student: S;
    topic: T;
    matchType: AutoMatchType;
    reason: string;
  }[] = [];
  const placedIds = new Set<number>();

  const pickBestSlot = (
    student: S,
    predicate: (slot: (typeof slots)[number]) => boolean,
  ) => {
    const candidates = slots.filter(
      (slot) => slot.freeSeats > 0 && predicate(slot),
    );
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const aSameClass =
        student.class && a.existingClasses.has(student.class) ? 1 : 0;
      const bSameClass =
        student.class && b.existingClasses.has(student.class) ? 1 : 0;

      if (strategy === 'BALANCE_LECTURER') {
        if (a.lecturerLoad !== b.lecturerLoad) {
          return a.lecturerLoad - b.lecturerLoad;
        }
        const aStarted = a.occupiedSeats > 0 ? 1 : 0;
        const bStarted = b.occupiedSeats > 0 ? 1 : 0;
        if (aStarted !== bStarted) return bStarted - aStarted;
        if (aSameClass !== bSameClass) return bSameClass - aSameClass;
      } else {
        const aStarted = a.occupiedSeats > 0 ? 1 : 0;
        const bStarted = b.occupiedSeats > 0 ? 1 : 0;
        if (aStarted !== bStarted) return bStarted - aStarted;
        if (aSameClass !== bSameClass) return bSameClass - aSameClass;
        if (a.occupiedSeats !== b.occupiedSeats) {
          return b.occupiedSeats - a.occupiedSeats;
        }
        if (a.lecturerLoad !== b.lecturerLoad) {
          return a.lecturerLoad - b.lecturerLoad;
        }
      }

      return a.topic.title.localeCompare(b.topic.title, 'vi');
    });

    return candidates[0];
  };

  const assignToSlot = (
    student: S,
    slot: (typeof slots)[number],
    matchType: AutoMatchType,
  ) => {
    const sharedClass =
      Boolean(student.class) && slot.existingClasses.has(student.class!);
    const hadMembers = slot.occupiedSeats > 0;

    slot.freeSeats -= 1;
    slot.occupiedSeats += 1;
    slot.lecturerLoad += 1;
    if (student.class) slot.existingClasses.add(student.class);
    placedIds.add(student.id);

    const reasons: string[] = [];
    if (matchType === 'SAME_MAJOR' && student.major) {
      reasons.push(`Khớp chuyên ngành ${student.major.code}`);
    } else if (matchType === 'FLEXIBLE') {
      reasons.push('Đề tài dùng chung chuyên ngành');
    } else {
      reasons.push(
        `Khác chuyên ngành (${student.major?.code ?? 'N/A'} → ${slot.topic.major?.code ?? 'N/A'})`,
      );
    }

    if (sharedClass) {
      reasons.push(`cùng lớp ${student.class}`);
    } else if (hadMembers) {
      reasons.push('lấp đầy nhóm sẵn có');
    } else if (strategy === 'BALANCE_LECTURER') {
      reasons.push('cân bằng tải GVHD');
    }

    matched.push({
      student,
      topic: slot.topic,
      matchType,
      reason: reasons.join(' · '),
    });
  };

  // Pass 1: Strict same-major matches first.
  for (const student of orderedStudents) {
    if (placedIds.has(student.id) || !student.major) continue;
    const slot = pickBestSlot(
      student,
      (candidate) => candidate.topic.major?.id === student.major!.id,
    );
    if (slot) assignToSlot(student, slot, 'SAME_MAJOR');
  }

  // Pass 2: Flexible matches when either the student or topic has no major.
  for (const student of orderedStudents) {
    if (placedIds.has(student.id)) continue;
    const slot = pickBestSlot(
      student,
      (candidate) => !student.major || !candidate.topic.major,
    );
    if (slot) assignToSlot(student, slot, 'FLEXIBLE');
  }

  // Pass 3: Cross-major fallback (only when explicitly enabled).
  if (allowCrossMajor) {
    for (const student of orderedStudents) {
      if (placedIds.has(student.id)) continue;
      const slot = pickBestSlot(student, () => true);
      if (slot) assignToSlot(student, slot, 'CROSS_MAJOR');
    }
  }

  const remainingSeats = slots.reduce(
    (total, slot) => total + slot.freeSeats,
    0,
  );

  const unmatched = orderedStudents
    .filter((student) => !placedIds.has(student.id))
    .map((student) => {
      const noSeats = remainingSeats === 0;
      return {
        student,
        reasonCode: noSeats ? 'NO_OPEN_SEATS' : 'NO_COMPATIBLE_MAJOR',
        reason: noSeats
          ? 'Không còn đề tài nào trống chỗ trong đợt.'
          : `Không còn đề tài trống chỗ thuộc chuyên ngành ${student.major?.code ?? ''}.`.trim(),
      };
    });

  return { matched, unmatched };
}

const PLACEMENT_CLOSED: Record<Exclude<RoundPhase, 'RECONCILING'>, string> = {
  [RoundPhase.PREP]:
    'Cổng đăng ký chưa mở, nên chưa có ai để xếp — sinh viên vẫn đang chờ đến lượt chọn đề tài.',
  [RoundPhase.OPEN]:
    'Cổng đăng ký còn mở, danh sách sinh viên chưa chốt nên chưa thể xếp tay.',
  [RoundPhase.EXTENDED]:
    'Đợt đang gia hạn cho các bạn chưa có nhóm. Đợi hết hạn gia hạn rồi xếp, nếu không danh sách sẽ đổi ngay dưới tay bạn.',
  [RoundPhase.FINALIZED]:
    'Đợt này đã chốt phân bổ, danh sách là chính thức và không đổi được nữa.',
};

function sumSeats(topics: { freeSeats: number }[]): number {
  return topics.reduce((total, topic) => total + topic.freeSeats, 0);
}

function translatePlacementConflict(err: unknown): unknown {
  if (
    err instanceof ConflictException ||
    err instanceof NotFoundException ||
    err instanceof ForbiddenException
  ) {
    return err;
  }

  if (!isUniqueViolation(err)) return err;

  const target = uniqueConstraintName(err);

  if (target.includes('one_accepted_per_semester')) {
    return new ConflictException(
      'Sinh viên này vừa được xếp vào một đề tài khác — tải lại danh sách rồi xếp tiếp.',
    );
  }

  if (target.includes('one_live_per_topic')) {
    return new ConflictException(
      'Đề tài này vừa có nhóm khác nhận — tải lại danh sách rồi chọn đề tài khác.',
    );
  }

  return new ConflictException(
    'Thao tác vừa rồi trùng với một thao tác khác — tải lại danh sách rồi thử lại.',
  );
}
