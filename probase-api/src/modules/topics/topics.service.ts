import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  NotificationType,
  Prisma,
  RegistrationGroupStatus,
  Role,
  RoundPhase,
  TopicStatus,
} from '../../../generated/prisma/client';
import { recordAudit } from '../../core/audit/audit-entry';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';
import { RoundsService } from '../rounds/rounds.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { QueryTopicsDto } from './dto/query-topics.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { DepartmentReviewDto, FacultyReviewDto } from './dto/review-topic.dto';
import { TopicSimilarityService } from './topic-similarity.service';

const PUBLISHED_STATUSES = [
  TopicStatus.OPEN,
  TopicStatus.IN_PROGRESS,
  TopicStatus.COMPLETED,
] as const;

const ACTIVE_GROUP_SELECT = {
  where: { status: { not: RegistrationGroupStatus.REJECTED } },
  select: {
    id: true,
    status: true,
    openForJoin: true,
    declaredSize: true,
    holdUntil: true,
    _count: {
      select: { members: { where: { status: GroupMemberStatus.ACCEPTED } } },
    },
  },
  take: 1,
} satisfies Prisma.Topic$registrationGroupsArgs;

const ROUND_SELECT = {
  select: {
    id: true,
    phase: true,
    registrationStart: true,
    registrationEnd: true,
    projectType: { select: { id: true, name: true, code: true } },
  },
} satisfies Prisma.RegistrationRoundDefaultArgs;

const LIST_SELECT = {
  id: true,
  title: true,
  maxStudents: true,
  status: true,
  majorId: true,
  major: { select: { id: true, name: true, code: true } },
  departmentFeedback: true,
  facultyFeedback: true,
  departmentReviewer: {
    select: { id: true, fullName: true, academicTitle: true },
  },
  facultyApprover: {
    select: { id: true, fullName: true, academicTitle: true },
  },
  createdAt: true,
  semester: { select: { id: true, name: true, code: true } },
  round: ROUND_SELECT,
  lecturer: { select: { id: true, fullName: true, academicTitle: true } },
  registrationGroups: ACTIVE_GROUP_SELECT,
  // Only the id of whoever proposed it. A topic born from a proposal is
  // reserved for that student while the gate is open, and a screen that does
  // not know it would draw a register button the API refuses.
  sourceProposal: { select: { studentId: true } },
} satisfies Prisma.TopicSelect;

type TopicRound = {
  id: number;
  phase: RoundPhase;
  registrationStart: Date;
  registrationEnd: Date;
  projectType: { id: number; name: string; code: string };
};

type TopicWithGroups = {
  maxStudents: number;
  round: TopicRound;
  sourceProposal: { studentId: number } | null;
  registrationGroups: {
    id: number;
    status: RegistrationGroupStatus;
    openForJoin: boolean;
    declaredSize: number | null;
    holdUntil: Date | null;
    _count: { members: number };
  }[];
};

function withActiveGroup<T extends TopicWithGroups>(
  topic: T,

  phase: RoundPhase,

  viewer?: {
    gateOpen: boolean;
    eligible: boolean;
    hasGroup: boolean;

    reservedForOther: boolean;

    inThisGroup: boolean;
  },
) {
  const { registrationGroups, round, sourceProposal, ...rest } = topic;
  const group = registrationGroups[0];
  const allowed =
    viewer === undefined ||
    (viewer.gateOpen &&
      viewer.eligible &&
      !viewer.hasGroup &&
      !viewer.reservedForOther);

  const fromProposal = sourceProposal !== null;
  const proposedByMe =
    viewer === undefined || !fromProposal ? null : !viewer.reservedForOther;

  const placement = {
    projectTypeId: round.projectType.id,
    projectType: round.projectType,
    round: {
      id: round.id,
      phase,
      registrationStart: round.registrationStart,
      registrationEnd: round.registrationEnd,
    },
  };

  const eligibleForMe = viewer?.eligible ?? null;

  const alreadyInAGroup = viewer?.hasGroup ?? null;

  const isMyGroup = viewer === undefined ? null : viewer.inThisGroup;

  if (!group) {
    return {
      ...rest,
      ...placement,
      activeGroup: null,
      occupiedSeats: 0,
      isFull: false,

      canRegister: allowed,
      canJoin: false,
      eligibleForMe,
      alreadyInAGroup,
      fromProposal,
      proposedByMe,
      // No group at all, so whose it is has no answer — null rather than false,
      // the same way every other viewer-dependent field here reports a question
      // that does not apply.
      isMyGroup: null,
    };
  }

  const occupied = group._count.members;
  const full = occupied >= topic.maxStudents;
  const holding = group.holdUntil !== null && group.holdUntil > new Date();

  // Seats above the declared size were never the leader's to keep, so a group of
  // two on a topic for three does not get to sit on the third place.
  const held =
    holding && group.declaredSize
      ? Math.max(0, Math.min(group.declaredSize, topic.maxStudents) - occupied)
      : 0;

  return {
    ...rest,
    ...placement,
    activeGroup: {
      id: group.id,
      status: group.status,
      occupiedSeats: occupied,
      openForJoin: group.openForJoin,

      holdActive: holding,
    },
    occupiedSeats: occupied,
    isFull: full,
    canRegister: false,
    canJoin:
      allowed &&
      !full &&
      group.openForJoin &&
      topic.maxStudents - occupied - held > 0,
    eligibleForMe,
    alreadyInAGroup,
    fromProposal,
    proposedByMe,
    isMyGroup,
  };
}

const DETAIL_INCLUDE = {
  semester: { select: { id: true, name: true, code: true } },
  round: ROUND_SELECT,
  major: { select: { id: true, name: true, code: true } },
  departmentReviewer: {
    select: { id: true, fullName: true, academicTitle: true },
  },
  facultyApprover: {
    select: { id: true, fullName: true, academicTitle: true },
  },
  lecturer: {
    select: {
      id: true,
      fullName: true,
      lecturerCode: true,
      academicTitle: true,
    },
  },
  registrationGroups: ACTIVE_GROUP_SELECT,
  sourceProposal: { select: { studentId: true } },
} satisfies Prisma.TopicInclude;

@Injectable()
export class TopicsService {
  private readonly logger = new Logger(TopicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phases: RoundPhaseService,
    private readonly rounds: RoundsService,
    private readonly notifications: NotificationsService,
    private readonly similarity: TopicSimilarityService,
  ) {}

  async findAll(query: QueryTopicsDto, userId: number, role: Role) {
    const where: Prisma.TopicWhereInput = {};

    if (query.semesterId) where.semesterId = query.semesterId;
    // Still asked for by kind of project, which is what a reader picks from a
    // menu — the round it implies is this layer's problem, not theirs.
    if (query.projectTypeId) {
      where.round = { projectTypeId: query.projectTypeId };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.majorId) {
      where.majorId = query.majorId;
    }

    if (query.mine) {
      if (role !== Role.LECTURER) {
        throw new ForbiddenException('Only lecturers own topics');
      }
      where.lecturerId = await this.requireLecturerProfileId(userId);
      if (query.status) {
        where.status = { equals: query.status };
      }
    } else if (query.reviewStage) {
      if (role !== Role.LECTURER && role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Chỉ cán bộ/giảng viên mới có quyền xem danh sách thẩm định',
        );
      }
      if (query.reviewStage === 'DEPARTMENT') {
        where.status = {
          in: [TopicStatus.PENDING_DEPARTMENT, TopicStatus.PENDING],
        };
      } else if (query.reviewStage === 'FACULTY') {
        where.status = { in: [TopicStatus.PENDING_FACULTY] };
      } else {
        where.status = {
          in: [
            TopicStatus.PENDING_DEPARTMENT,
            TopicStatus.PENDING,
            TopicStatus.PENDING_FACULTY,
          ],
        };
      }
      if (query.lecturerId) {
        where.lecturerId = query.lecturerId;
      }
    } else {
      if (query.lecturerId) {
        where.lecturerId = query.lecturerId;
      }
      where.status = visibleStatusFilter(role, query.status);
    }

    if (query.forMyCohort) {
      where.roundId = { in: await this.rounds.eligibleRoundIds(userId) };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.topic.count({ where }),
    ]);

    const phases = await this.resolveRoundPhases(items);
    const viewers = await this.availabilityFor(items, userId, role, phases);

    return {
      items: items.map((topic) =>
        withActiveGroup(
          topic,
          phases.get(topic.round.id) ?? topic.round.phase,
          viewers(topic),
        ),
      ),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private resolveRoundPhases(items: { round: TopicRound }[]) {
    const unique = new Map(items.map((topic) => [topic.round.id, topic.round]));

    return this.phases.resolveMany([...unique.values()]);
  }

  private async availabilityFor(
    items: {
      id: number;
      semester: { id: number };
      round: TopicRound;
      sourceProposal: { studentId: number } | null;
    }[],
    userId: number,
    role: Role,
    phases: Map<number, RoundPhase>,
  ) {
    if (role !== Role.STUDENT || items.length === 0) return () => undefined;

    const semesterIds = [...new Set(items.map((topic) => topic.semester.id))];

    // Read once for the page rather than per row. Null only for an account with
    // no student profile, which the role check above nearly rules out — and a
    // null can match no proposal, so every reserved topic reads as somebody
    // else's, which is the safe direction to be wrong in.
    const me = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const eligible = new Set(
      await this.rounds.eligibleRoundIds(userId, semesterIds),
    );

    // A student who is already in a group cannot take another topic — one group
    // per semester, enforced by the database. Without this the browse screen
    // would offer a register button to everyone who already has a place, which
    // is nearly the whole cohort once an extension is running.
    const mine = await this.myPlaces(userId, semesterIds);

    return (topic: {
      id: number;
      semester: { id: number };
      round: TopicRound;
      sourceProposal: { studentId: number } | null;
    }) => {
      const phase = phases.get(topic.round.id) ?? topic.round.phase;

      return {
        // An extension reopens the gate, so it counts as open here — what stops
        // it applying to a student who already has a group is `hasGroup`, which
        // is the same rule the register endpoint enforces.
        gateOpen: phase === RoundPhase.OPEN || phase === RoundPhase.EXTENDED,
        // The register endpoint refuses a round the caller's intake is not open
        // for, so a button offering it here would be a button that lies.
        eligible: eligible.has(topic.round.id),
        hasGroup: mine.semesters.has(topic.semester.id),
        // The group holding this topic is one the reader is in. Read together
        // with `activeGroup`, it is the difference between "đã có nhóm" and
        // "nhóm của bạn" — and a screen with only the first can tell a student
        // their own topic was taken by somebody else.
        inThisGroup: mine.topics.has(topic.id),
        // A topic written out of a proposal is that student's until the gate
        // shuts; to everybody else it is not on offer, and the register
        // endpoint refuses it for the same reason.
        reservedForOther:
          topic.sourceProposal !== null &&
          topic.sourceProposal.studentId !== me?.id,
      };
    };
  }

  private async myPlaces(userId: number, semesterIds: number[]) {
    const rows = await this.prisma.registrationGroupMember.findMany({
      where: {
        student: { userId },
        semesterId: { in: semesterIds },
        status: GroupMemberStatus.ACCEPTED,
        group: { status: { not: RegistrationGroupStatus.REJECTED } },
      },
      select: { semesterId: true, group: { select: { topicId: true } } },
    });

    return {
      semesters: new Set(rows.map((row) => row.semesterId)),
      topics: new Set(rows.map((row) => row.group.topicId)),
    };
  }

  async findLecturers(role: Role, semesterId?: number) {
    const rows = await this.prisma.topic.findMany({
      where: {
        status: visibleStatusFilter(role, undefined),
        ...(semesterId && { semesterId }),
      },
      select: {
        lecturer: { select: { id: true, fullName: true, academicTitle: true } },
      },
      distinct: ['lecturerId'],
      orderBy: { lecturer: { fullName: 'asc' } },
    });

    return rows.map((row) => row.lecturer);
  }

  async findOne(id: number, userId: number, role: Role) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.status === TopicStatus.DRAFT) {
      if (role !== Role.LECTURER) {
        throw new NotFoundException('Topic not found');
      }
      const lecturerId = await this.requireLecturerProfileId(userId);
      if (topic.lecturerId !== lecturerId) {
        throw new NotFoundException('Topic not found');
      }
    } else if (!canSee(topic.status, role)) {
      throw new NotFoundException('Topic not found');
    }

    // The gate is the round's phase, and only the phase. Comparing the dates
    // here as well would quietly overrule an office that opened registration
    // early or held it shut, which the phase exists to let them do.
    const phases = await this.resolveRoundPhases([topic]);
    const phase = phases.get(topic.round.id) ?? topic.round.phase;
    const viewer = await this.availabilityFor([topic], userId, role, phases);

    return {
      ...withActiveGroup(topic, phase, viewer(topic)),
      roundPhase: phase,
      // Saves the client a second request to the round just to decide whether
      // the register button should be live. This one is about the topic and the
      // calendar only — whether *this* caller may take it is canRegister/canJoin.
      // An extension counts as open: it is a gate somebody may still walk
      // through, even though not everybody.
      isRegistrationOpen:
        topic.status === TopicStatus.OPEN &&
        (phase === RoundPhase.OPEN || phase === RoundPhase.EXTENDED),
    };
  }

  async create(dto: CreateTopicDto, userId: number) {
    const lecturerProfile = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
      select: { id: true, majorId: true },
    });
    if (!lecturerProfile) {
      throw new ForbiddenException('Chỉ giảng viên mới có quyền tạo đề tài');
    }

    await this.requireSemester(dto.semesterId);
    const { semesterId, projectTypeId, ...rest } = dto;
    const round = await this.rounds.requireRoundFor(semesterId, projectTypeId);

    const majorId = dto.majorId ?? lecturerProfile.majorId ?? null;

    const topic = await this.prisma.topic.create({
      data: {
        ...rest,
        majorId,
        semesterId,
        roundId: round.id,
        lecturerId: lecturerProfile.id,
        status: TopicStatus.DRAFT,
      },
      include: DETAIL_INCLUDE,
    });

    return this.presentDetail(topic);
  }

  async update(id: number, dto: UpdateTopicDto, userId: number, role: Role) {
    const topic = await this.requireOwnTopic(id, userId, role);

    if (
      topic.status === TopicStatus.IN_PROGRESS ||
      topic.status === TopicStatus.COMPLETED
    ) {
      throw new ConflictException(
        'A topic already under way can no longer be edited',
      );
    }

    const { projectTypeId, ...rest } = dto;

    // Moving a topic to another kind of project moves it to another round, and
    // only within its own semester — the composite foreign key would refuse
    // anything else, and a clear 409 beats a driver error.
    const roundId = projectTypeId
      ? (await this.rounds.requireRoundFor(topic.semesterId, projectTypeId)).id
      : undefined;

    const updated = await this.prisma.topic.update({
      where: { id },
      data: { ...rest, ...(roundId !== undefined && { roundId }) },
      include: DETAIL_INCLUDE,
    });

    return this.presentDetail(updated);
  }

  async remove(id: number, userId: number, role: Role) {
    const topic = await this.requireOwnTopic(id, userId, role);

    // Only a group that is still standing blocks deletion. REJECTED rows are
    // kept for the record, and counting them would leave a topic that everyone
    // walked away from permanently undeletable — while the unique index says
    // it is free for the next student to take.
    if (topic.activeGroupCount > 0) {
      throw new ConflictException(
        'Cannot delete a topic that students have already registered for',
      );
    }

    await this.prisma.topic.delete({ where: { id } });

    return { message: 'Topic deleted' };
  }

  async approve(id: number) {
    const topic = await this.requireTopic(id);

    if (topic.status !== TopicStatus.PENDING) {
      throw new ConflictException('Only a pending topic can be approved');
    }

    return this.setStatus(id, TopicStatus.APPROVED);
  }

  async bulkOpen(semesterId: number) {
    // Guard: the semester must exist — a caller that passes a non-existent id
    // would silently update zero rows, which is hard to debug.
    await this.requireSemester(semesterId);

    const result = await this.prisma.topic.updateMany({
      where: { semesterId, status: TopicStatus.APPROVED },
      data: { status: TopicStatus.OPEN },
    });

    return { updated: result.count };
  }

  async open(id: number, userId: number, role: Role) {
    const topic = await this.requireOwnTopic(id, userId, role);

    if (topic.status !== TopicStatus.APPROVED) {
      throw new ConflictException(
        'A topic must be approved before it can accept registrations',
      );
    }

    return this.setStatus(id, TopicStatus.OPEN);
  }

  async close(id: number, userId: number, role: Role) {
    const topic = await this.requireOwnTopic(id, userId, role);

    if (topic.status !== TopicStatus.OPEN) {
      throw new ConflictException('Only an open topic can be closed');
    }

    return this.setStatus(id, TopicStatus.APPROVED);
  }

  async submit(id: number, userId: number) {
    const lecturerId = await this.requireLecturerProfileId(userId);
    const topic = await this.requireTopic(id);

    if (topic.lecturerId !== lecturerId) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu đề tài này');
    }

    if (topic.status !== TopicStatus.DRAFT) {
      throw new ConflictException(
        'Chỉ có thể gửi duyệt đề tài đang ở trạng thái bản nháp',
      );
    }

    this.similarity.checkTopicSimilarity(id).catch((err) => {
      this.logger.warn(`Failed async similarity check for topic ${id}: ${err}`);
    });

    return this.setStatus(id, TopicStatus.PENDING_DEPARTMENT);
  }

  async submitDrafts(userId: number, topicIds?: number[]) {
    const lecturerId = await this.requireLecturerProfileId(userId);

    const where: Prisma.TopicWhereInput = {
      lecturerId,
      status: TopicStatus.DRAFT,
      ...(topicIds && topicIds.length > 0 && { id: { in: topicIds } }),
    };

    const draftTopics = await this.prisma.topic.findMany({
      where,
      select: { id: true, title: true },
    });

    if (draftTopics.length === 0) {
      return {
        count: 0,
        message: 'Không có đề tài bản nháp nào cần gửi duyệt',
      };
    }

    await this.prisma.topic.updateMany({
      where: { id: { in: draftTopics.map((t) => t.id) } },
      data: { status: TopicStatus.PENDING_DEPARTMENT },
    });

    for (const t of draftTopics) {
      this.similarity.checkTopicSimilarity(t.id).catch((err) => {
        this.logger.warn(
          `Failed async similarity check for topic ${t.id}: ${err}`,
        );
      });
    }

    return {
      count: draftTopics.length,
      message: `Đã gửi duyệt thành công ${draftTopics.length} đề tài cho Bộ môn.`,
    };
  }

  async reviewDepartment(
    id: number,
    dto: DepartmentReviewDto,
    user: {
      id: number;
      role: Role;
      lecturerProfile?: {
        id: number;
        isHeadOfDepartment: boolean;
        majorId: number | null;
      } | null;
    },
  ) {
    const isHead = user.lecturerProfile?.isHeadOfDepartment ?? false;
    const isAdmin = user.role === Role.ADMIN;
    if (!isHead && !isAdmin) {
      throw new ForbiddenException(
        'Chỉ Tổ trưởng Bộ môn (TTBM) hoặc Quản trị viên mới có quyền thẩm định đề tài cấp Bộ môn',
      );
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        lecturer: { select: { id: true, userId: true, fullName: true } },
        major: true,
      },
    });

    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    if (!isAdmin && user.lecturerProfile?.majorId && topic.majorId) {
      if (topic.majorId !== user.lecturerProfile.majorId) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền thẩm định các đề tài thuộc Tổ chuyên môn của mình',
        );
      }
    }

    if (
      topic.status !== TopicStatus.PENDING_DEPARTMENT &&
      topic.status !== TopicStatus.PENDING
    ) {
      throw new ConflictException(
        'Chỉ có thể thẩm định đề tài đang ở trạng thái Chờ Bộ môn duyệt',
      );
    }

    let nextStatus: TopicStatus;
    let auditAction: string;
    let notifTitle: string;
    let notifContent: string;

    if (dto.action === 'APPROVE') {
      nextStatus = TopicStatus.PENDING_FACULTY;
      auditAction = 'TOPIC_DEPARTMENT_APPROVED';
      notifTitle = 'Đề tài đã được Bộ môn thông qua';
      notifContent = `Đề tài "${topic.title}" đã được Tổ trưởng Bộ môn thông qua và chuyển lên Ban Chủ nhiệm Khoa phê duyệt.${dto.feedback ? ` Nhận xét: ${dto.feedback}` : ''}`;
    } else if (dto.action === 'REQUEST_REVISION') {
      nextStatus = TopicStatus.DRAFT;
      auditAction = 'TOPIC_DEPARTMENT_REVISION_REQUESTED';
      notifTitle = 'Yêu cầu chỉnh sửa đề tài';
      notifContent = `Tổ trưởng Bộ môn yêu cầu chỉnh sửa đề tài "${topic.title}". Lý do: ${dto.feedback}`;
    } else {
      nextStatus = TopicStatus.REJECTED;
      auditAction = 'TOPIC_DEPARTMENT_REJECTED';
      notifTitle = 'Đề tài bị từ chối';
      notifContent = `Đề tài "${topic.title}" đã bị Tổ trưởng Bộ môn từ chối. Lý do: ${dto.feedback}`;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.topic.update({
        where: { id },
        data: {
          status: nextStatus,
          departmentReviewerId: user.lecturerProfile?.id ?? null,
          departmentFeedback: dto.feedback ?? null,
        },
        include: DETAIL_INCLUDE,
      });

      await recordAudit(tx, {
        userId: user.id,
        action: auditAction,
        targetTable: 'topics',
        targetId: id,
        oldValue: { status: topic.status },
        newValue: {
          status: nextStatus,
          departmentReviewerId: user.lecturerProfile?.id ?? null,
          feedback: dto.feedback,
        },
      });

      return res;
    });

    await this.notifications.notify([
      {
        userId: topic.lecturer.userId,
        type: NotificationType.SUBMISSION_FEEDBACK,
        title: notifTitle,
        content: notifContent,
        targetId: id,
      },
    ]);

    return this.presentDetail(updated);
  }

  async reviewFaculty(
    id: number,
    dto: FacultyReviewDto,
    user: {
      id: number;
      role: Role;
      lecturerProfile?: {
        id: number;
        isFacultyBoard: boolean;
        isAcademicAssistant: boolean;
      } | null;
    },
  ) {
    const isFaculty =
      user.lecturerProfile?.isFacultyBoard ||
      user.lecturerProfile?.isAcademicAssistant;
    const isAdmin = user.role === Role.ADMIN;
    if (!isFaculty && !isAdmin) {
      throw new ForbiddenException(
        'Chỉ Ban Chủ nhiệm Khoa (BCN Khoa) hoặc Giáo vụ / Quản trị viên mới có quyền phê duyệt đề tài cấp Khoa',
      );
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        lecturer: { select: { id: true, userId: true, fullName: true } },
      },
    });

    if (!topic) throw new NotFoundException('Không tìm thấy đề tài');

    if (
      topic.status !== TopicStatus.PENDING_FACULTY &&
      topic.status !== TopicStatus.PENDING
    ) {
      throw new ConflictException(
        'Chỉ có thể phê duyệt đề tài đang ở trạng thái Chờ Khoa duyệt',
      );
    }

    let nextStatus: TopicStatus;
    let auditAction: string;
    let notifTitle: string;
    let notifContent: string;

    if (dto.action === 'APPROVE') {
      nextStatus = TopicStatus.APPROVED;
      auditAction = 'TOPIC_FACULTY_APPROVED';
      notifTitle = 'Đề tài đã được Khoa phê duyệt';
      notifContent = `Đề tài "${topic.title}" đã được Ban Chủ nhiệm Khoa phê duyệt chính thức.${dto.feedback ? ` Nhận xét: ${dto.feedback}` : ''}`;
    } else if (dto.action === 'REQUEST_REVISION') {
      nextStatus = TopicStatus.PENDING_DEPARTMENT;
      auditAction = 'TOPIC_FACULTY_REVISION_REQUESTED';
      notifTitle = 'Khoa yêu cầu xem xét lại đề tài';
      notifContent = `Ban Chủ nhiệm Khoa yêu cầu Bộ môn xem xét lại đề tài "${topic.title}". Ý kiến: ${dto.feedback}`;
    } else {
      nextStatus = TopicStatus.REJECTED;
      auditAction = 'TOPIC_FACULTY_REJECTED';
      notifTitle = 'Khoa từ chối đề tài';
      notifContent = `Đề tài "${topic.title}" đã bị Ban Chủ nhiệm Khoa từ chối. Lý do: ${dto.feedback}`;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.topic.update({
        where: { id },
        data: {
          status: nextStatus,
          facultyApproverId: user.lecturerProfile?.id ?? null,
          facultyFeedback: dto.feedback ?? null,
        },
        include: DETAIL_INCLUDE,
      });

      await recordAudit(tx, {
        userId: user.id,
        action: auditAction,
        targetTable: 'topics',
        targetId: id,
        oldValue: { status: topic.status },
        newValue: {
          status: nextStatus,
          facultyApproverId: user.lecturerProfile?.id ?? null,
          feedback: dto.feedback,
        },
      });

      return res;
    });

    await this.notifications.notify([
      {
        userId: topic.lecturer.userId,
        type: NotificationType.SUBMISSION_FEEDBACK,
        title: notifTitle,
        content: notifContent,
        targetId: id,
      },
    ]);

    return this.presentDetail(updated);
  }

  private async setStatus(id: number, status: TopicStatus) {
    const topic = await this.prisma.topic.update({
      where: { id },
      data: { status },
      include: DETAIL_INCLUDE,
    });

    return this.presentDetail(topic);
  }

  private async presentDetail<T extends TopicWithGroups>(topic: T) {
    const phases = await this.phases.resolveMany([topic.round]);

    return withActiveGroup(
      topic,
      phases.get(topic.round.id) ?? topic.round.phase,
    );
  }

  private async requireTopic(id: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        lecturerId: true,
        semesterId: true,
        _count: {
          select: {
            registrationGroups: {
              where: { status: { not: RegistrationGroupStatus.REJECTED } },
            },
          },
        },
      },
    });

    if (!topic) throw new NotFoundException('Topic not found');

    return { ...topic, activeGroupCount: topic._count.registrationGroups };
  }

  private async requireOwnTopic(id: number, userId: number, role: Role) {
    const topic = await this.requireTopic(id);

    if (role === Role.ADMIN) return topic;

    const lecturerId = await this.requireLecturerProfileId(userId);

    if (topic.lecturerId !== lecturerId) {
      throw new ForbiddenException('This topic belongs to another lecturer');
    }

    return topic;
  }

  private async requireLecturerProfileId(userId: number) {
    const profile = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ForbiddenException(
        'No lecturer profile is attached to this account',
      );
    }

    return profile.id;
  }

  private async requireSemester(id: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!semester) throw new NotFoundException(`Semester ${id} not found`);
  }
}

function visibleStatusFilter(
  role: Role,
  requested: TopicStatus | undefined,
): Prisma.EnumTopicStatusFilter | undefined {
  if (role === Role.STUDENT) {
    if (requested && !canSee(requested, role)) {
      // Asking for drafts or unapproved topics as a student is answered with an empty page
      return { in: [] };
    }
    return requested ? { equals: requested } : { in: [...PUBLISHED_STATUSES] };
  }

  // Non-students (ADMIN or LECTURER browsing catalogue)
  // DRAFT topics must NEVER be visible to others or in admin registry
  if (requested) {
    if (requested === TopicStatus.DRAFT) {
      return { in: [] };
    }
    return { equals: requested };
  }

  return { not: TopicStatus.DRAFT };
}

function canSee(status: TopicStatus, role: Role): boolean {
  if (status === TopicStatus.DRAFT) return false;
  if (role !== Role.STUDENT) return true;

  return (PUBLISHED_STATUSES as readonly TopicStatus[]).includes(status);
}
