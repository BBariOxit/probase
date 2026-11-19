import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GroupJoinSource,
  GroupMemberStatus,
  RegistrationGroupStatus,
  Role,
  RoundPhase,
  TopicProposalStatus,
  TopicStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RoundPhaseService } from '../rounds/round-phase.service';

export interface OutlineBreakdown {
  totalGroups: number;
  approved: number;
  pendingReview: number;
  needsRevision: number;
  notSubmitted: number;
}

export interface ArchiveBreakdown {
  totalGroups: number;
  verified: number;
  pendingVerify: number;
  notSubmitted: number;
}

export interface TopicFunnel {
  total: number;
  usable: number;
  draft: number;
  pending: number;
  approvedNotOpen: number;
  openAvailable: number;
  inUse: number;
  inProgress: number;
  completed: number;
  rejected: number;
  seatCapacity: number;
  seatBalance: number;
}

export interface GroupSizeBreakdown {
  total: number;
  full: number;
  forming: number;
  size1: number;
  size2: number;
  size3Plus: number;
  avgSize: number;
}

export interface ProposalBreakdown {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  needsRevision: number;
}

export interface RoundOption {
  roundId: number;
  projectType: { id: number; name: string; code: string };
  phase: RoundPhase;
}

export interface RoundReport {
  roundId: number;
  projectType: { id: number; name: string; code: string };
  phase: RoundPhase;
  cohorts: string[];
  registrationStart: Date;
  registrationEnd: Date;
  outlineDeadline: Date | null;
  officialStartDate: Date | null;
  officialEndDate: Date | null;
  archiveDeadline: Date | null;
  finalisedAt: Date | null;
  maxStudentsPerTopic: number;
  minTopicsPerLecturer: number | null;
  eligible: number;
  withGroup: number;
  withoutGroup: number;
  selfRegistered: number;
  assigned: number;
  groups: GroupSizeBreakdown;
  topics: TopicFunnel;
  outlines: OutlineBreakdown;
  archives: ArchiveBreakdown;
}

export interface SupervisionReport {
  lecturerId: number;
  lecturerCode: string;
  fullName: string;
  academicTitle: string | null;
  majorCode: string | null;
  maxMentoringQuota: number | null;
  targetTopicQuota: number | null;
  isExempt: boolean;
  topicsUsable: number;
  topicsPending: number;
  topicsOpenAvailable: number;
  groups: number;
  students: number;
  avgStudentsPerGroup: number;
  outlinesApproved: number;
  outlinesPending: number;
}

export interface MajorReport {
  majorId: number | null;
  name: string;
  code: string;
  eligibleStudents: number;
  withGroup: number;
  withoutGroup: number;
  groups: number;
  usableTopics: number;
  seatCapacity: number;
  seatBalance: number;
}

export interface OverviewReport {
  eligibleStudents: number;
  studentsWithGroup: number;
  studentsWithoutGroup: number;
  selfRegistered: number;
  assigned: number;
  groups: GroupSizeBreakdown;
  topics: TopicFunnel;
  proposals: ProposalBreakdown;
  outlines: OutlineBreakdown;
  archives: ArchiveBreakdown;
  totalLecturers: number;
  lecturersWithoutTopics: number;
  lecturersOverMentoringQuota: number;
  avgGroupsPerLecturer: number;
  avgStudentsPerLecturer: number;
}

export interface FacultyReport {
  semester: {
    id: number;
    name: string;
    code: string;
    startDate: Date;
    endDate: Date;
  };
  selectedRoundId: number | null;
  availableRounds: RoundOption[];
  overview: OverviewReport;
  rounds: RoundReport[];
  majors: MajorReport[];
  supervision: SupervisionReport[];
}

const USABLE_TOPIC_STATUSES = new Set<TopicStatus>([
  TopicStatus.APPROVED,
  TopicStatus.APPROVED_OPEN,
  TopicStatus.OPEN,
  TopicStatus.ASSIGNED,
  TopicStatus.IN_PROGRESS,
  TopicStatus.COMPLETED,
]);

const IN_USE_TOPIC_STATUSES = new Set<TopicStatus>([
  TopicStatus.ASSIGNED,
  TopicStatus.IN_PROGRESS,
  TopicStatus.COMPLETED,
]);

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phases: RoundPhaseService,
  ) {}

  async summary(semesterId?: number, roundId?: number): Promise<FacultyReport> {
    const semester = await this.requireSemester(semesterId);

    const allRounds = await this.prisma.registrationRound.findMany({
      where: { semesterId: semester.id },
      select: {
        id: true,
        semesterId: true,
        phase: true,
        registrationStart: true,
        registrationEnd: true,
        outlineDeadline: true,
        officialStartDate: true,
        officialEndDate: true,
        archiveDeadline: true,
        finalisedAt: true,
        maxStudentsPerTopic: true,
        minTopicsPerLecturer: true,
        projectType: { select: { id: true, name: stringSelect(), code: true } },
        eligibilities: { select: { cohort: true }, orderBy: { cohort: 'asc' } },
        _count: { select: { eligibleStudents: true } },
      },
      orderBy: { projectTypeId: 'asc' },
    });

    const allPhases = await this.phases.resolveMany(allRounds);
    const availableRounds: RoundOption[] = allRounds.map((r) => ({
      roundId: r.id,
      projectType: r.projectType,
      phase: allPhases.get(r.id) ?? r.phase,
    }));

    const scopedRounds =
      roundId !== undefined
        ? allRounds.filter((r) => r.id === roundId)
        : allRounds;

    if (roundId !== undefined && scopedRounds.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy đợt #${roundId} trong học kỳ.`,
      );
    }

    const roundIds = scopedRounds.map((r) => r.id);
    const projectTypeIds = scopedRounds.map((r) => r.projectType.id);

    const [
      topics,
      groups,
      majors,
      lecturers,
      quotas,
      eligibleByRound,
      proposals,
    ] = await Promise.all([
      this.loadTopics(semester.id, roundIds),
      this.loadGroups(semester.id, roundIds),
      this.prisma.major.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { code: 'asc' },
      }),
      this.loadLecturers(semester.id, roundIds),
      this.loadRoundQuotas(roundIds),
      this.loadEligibleStudentsPerRound(scopedRounds),
      this.loadProposals(semester.id, projectTypeIds),
    ]);

    const takenTopicIds = new Set(groups.map((g) => g.topicId));

    const roundReports = scopedRounds.map((round) =>
      this.buildRoundReport(
        round,
        allPhases.get(round.id) ?? round.phase,
        eligibleByRound.get(round.id) ?? [],
        topics.filter((t) => t.roundId === round.id),
        groups.filter((g) => g.roundId === round.id),
        takenTopicIds,
      ),
    );

    const uniqueEligible = deduplicateStudents(
      scopedRounds.flatMap((r) => eligibleByRound.get(r.id) ?? []),
    );

    const majorReports = this.buildMajorReports(
      majors,
      uniqueEligible,
      groups,
      topics,
    );

    const supervisionReports = this.buildSupervisionReports(
      lecturers,
      scopedRounds,
      quotas,
      topics,
      groups,
      takenTopicIds,
    );

    const overview = this.buildOverview(
      uniqueEligible,
      groups,
      topics,
      proposals,
      takenTopicIds,
      supervisionReports,
    );

    return {
      semester,
      selectedRoundId: roundId ?? null,
      availableRounds,
      overview,
      rounds: roundReports,
      majors: majorReports,
      supervision: supervisionReports,
    };
  }

  private buildRoundReport(
    round: RoundRow,
    phase: RoundPhase,
    eligibleStudents: EligibleStudentRow[],
    topics: TopicRow[],
    groups: GroupRow[],
    takenTopicIds: Set<number>,
  ): RoundReport {
    const eligibleIds = new Set(eligibleStudents.map((s) => s.id));
    const membersInRound = groups.flatMap((g) => g.members);
    const placedIds = new Set(
      membersInRound
        .filter((m) => eligibleIds.size === 0 || eligibleIds.has(m.studentId))
        .map((m) => m.studentId),
    );

    const withGroup =
      eligibleIds.size > 0 ? placedIds.size : membersInRound.length;
    const withoutGroup = Math.max(0, eligibleStudents.length - withGroup);

    const topicFunnel = computeTopicFunnel(
      topics,
      takenTopicIds,
      eligibleStudents.length,
    );

    return {
      roundId: round.id,
      projectType: round.projectType,
      phase,
      cohorts: round.eligibilities.map((e) => e.cohort),
      registrationStart: round.registrationStart,
      registrationEnd: round.registrationEnd,
      outlineDeadline: round.outlineDeadline,
      officialStartDate: round.officialStartDate,
      officialEndDate: round.officialEndDate,
      archiveDeadline: round.archiveDeadline,
      finalisedAt: round.finalisedAt,
      maxStudentsPerTopic: round.maxStudentsPerTopic,
      minTopicsPerLecturer: round.minTopicsPerLecturer,
      eligible: eligibleStudents.length,
      withGroup,
      withoutGroup,
      selfRegistered: membersInRound.filter(
        (m) => m.joinSource !== GroupJoinSource.ASSIGNED,
      ).length,
      assigned: membersInRound.filter(
        (m) => m.joinSource === GroupJoinSource.ASSIGNED,
      ).length,
      groups: computeGroupSizes(groups),
      topics: topicFunnel,
      outlines: computeOutlines(groups),
      archives: computeArchives(groups),
    };
  }

  private buildMajorReports(
    majors: Array<{ id: number; name: string; code: string }>,
    eligibleStudents: EligibleStudentRow[],
    groups: GroupRow[],
    topics: TopicRow[],
  ): MajorReport[] {
    const placedStudentIds = new Set(
      groups.flatMap((g) => g.members.map((m) => m.studentId)),
    );

    const buckets = new Map<
      number | null,
      { id: number | null; name: string; code: string }
    >();
    for (const m of majors) {
      buckets.set(m.id, m);
    }

    const hasGeneralStudents = eligibleStudents.some((s) => s.majorId === null);
    const hasGeneralTopics = topics.some(
      (t) => t.effectiveMajorId === null && USABLE_TOPIC_STATUSES.has(t.status),
    );
    if (hasGeneralStudents || hasGeneralTopics) {
      buckets.set(null, {
        id: null,
        name: 'Chưa phân chuyên ngành (Cơ sở)',
        code: 'CHUNG',
      });
    }

    return [...buckets.values()].map((bucket) => {
      const students = eligibleStudents.filter((s) => s.majorId === bucket.id);
      const withGroup = students.filter((s) =>
        placedStudentIds.has(s.id),
      ).length;
      const majorTopics = topics.filter(
        (t) =>
          t.effectiveMajorId === bucket.id &&
          USABLE_TOPIC_STATUSES.has(t.status),
      );
      const seatCapacity = majorTopics.reduce(
        (sum, t) => sum + t.maxStudents,
        0,
      );

      const groupCount = groups.filter((g) => {
        if (g.majorId !== null) return g.majorId === bucket.id;
        return g.members.some((m) => m.majorId === bucket.id);
      }).length;

      return {
        majorId: bucket.id,
        name: bucket.name,
        code: bucket.code,
        eligibleStudents: students.length,
        withGroup,
        withoutGroup: Math.max(0, students.length - withGroup),
        groups: groupCount,
        usableTopics: majorTopics.length,
        seatCapacity,
        seatBalance: seatCapacity - students.length,
      };
    });
  }

  private buildSupervisionReports(
    lecturers: LecturerRow[],
    scopedRounds: RoundRow[],
    quotas: Array<{
      roundId: number;
      lecturerId: number;
      targetQuota: number | null;
      isExempt: boolean;
    }>,
    topics: TopicRow[],
    groups: GroupRow[],
    takenTopicIds: Set<number>,
  ): SupervisionReport[] {
    const quotaByKey = new Map(
      quotas.map((q) => [`${q.roundId}:${q.lecturerId}`, q]),
    );

    return lecturers
      .map((lecturer) => {
        const myTopics = topics.filter((t) => t.lecturerId === lecturer.id);
        const myGroups = groups.filter((g) => g.lecturerId === lecturer.id);
        const studentsCount = myGroups.reduce(
          (sum, g) => sum + g.members.length,
          0,
        );

        let targetTopicQuota: number | null = null;
        let isExempt = scopedRounds.length > 0;

        for (const round of scopedRounds) {
          const custom = quotaByKey.get(`${round.id}:${lecturer.id}`);
          if (custom?.isExempt) continue;
          isExempt = false;
          const roundTarget = custom?.targetQuota ?? round.minTopicsPerLecturer;
          if (roundTarget !== null && roundTarget !== undefined) {
            targetTopicQuota = (targetTopicQuota ?? 0) + roundTarget;
          }
        }
        if (scopedRounds.length === 0) {
          isExempt = false;
        }

        const topicsUsable = myTopics.filter((t) =>
          USABLE_TOPIC_STATUSES.has(t.status),
        ).length;
        const topicsPending = myTopics.filter(
          (t) =>
            t.status === TopicStatus.PENDING ||
            t.status === TopicStatus.PENDING_DEPARTMENT,
        ).length;
        const topicsOpenAvailable = myTopics.filter(
          (t) =>
            (t.status === TopicStatus.OPEN ||
              t.status === TopicStatus.APPROVED_OPEN) &&
            !takenTopicIds.has(t.id),
        ).length;

        const outlines = computeOutlines(myGroups);

        return {
          lecturerId: lecturer.id,
          lecturerCode: lecturer.lecturerCode,
          fullName: lecturer.fullName,
          academicTitle: lecturer.academicTitle,
          majorCode: lecturer.major?.code ?? null,
          maxMentoringQuota: lecturer.maxMentoringQuota,
          targetTopicQuota: isExempt ? 0 : targetTopicQuota,
          isExempt,
          topicsUsable,
          topicsPending,
          topicsOpenAvailable,
          groups: myGroups.length,
          students: studentsCount,
          avgStudentsPerGroup:
            myGroups.length > 0
              ? Number((studentsCount / myGroups.length).toFixed(1))
              : 0,
          outlinesApproved: outlines.approved,
          outlinesPending: outlines.pendingReview,
        };
      })
      .sort(
        (a, b) =>
          b.groups - a.groups ||
          b.students - a.students ||
          b.topicsUsable - a.topicsUsable ||
          a.fullName.localeCompare(b.fullName),
      );
  }

  private buildOverview(
    eligibleStudents: EligibleStudentRow[],
    groups: GroupRow[],
    topics: TopicRow[],
    proposals: ProposalBreakdown,
    takenTopicIds: Set<number>,
    supervision: SupervisionReport[],
  ): OverviewReport {
    const eligibleIds = new Set(eligibleStudents.map((s) => s.id));
    const uniquePlacedIds = new Set<number>();
    let selfRegistered = 0;
    let assigned = 0;
    const seenMembers = new Set<number>();

    for (const group of groups) {
      for (const member of group.members) {
        if (eligibleIds.size === 0 || eligibleIds.has(member.studentId)) {
          uniquePlacedIds.add(member.studentId);
        }
        if (!seenMembers.has(member.studentId)) {
          seenMembers.add(member.studentId);
          if (member.joinSource === GroupJoinSource.ASSIGNED) assigned += 1;
          else selfRegistered += 1;
        }
      }
    }

    const studentsWithGroup =
      eligibleIds.size > 0 ? uniquePlacedIds.size : seenMembers.size;
    const totalLecturers = supervision.length;
    const totalGroups = groups.length;
    const totalStudentsInGroups = supervision.reduce(
      (sum, s) => sum + s.students,
      0,
    );

    return {
      eligibleStudents: eligibleStudents.length,
      studentsWithGroup,
      studentsWithoutGroup: Math.max(
        0,
        eligibleStudents.length - studentsWithGroup,
      ),
      selfRegistered,
      assigned,
      groups: computeGroupSizes(groups),
      topics: computeTopicFunnel(
        topics,
        takenTopicIds,
        eligibleStudents.length,
      ),
      proposals,
      outlines: computeOutlines(groups),
      archives: computeArchives(groups),
      totalLecturers,
      lecturersWithoutTopics: supervision.filter(
        (s) => !s.isExempt && s.topicsUsable === 0 && s.topicsPending === 0,
      ).length,
      lecturersOverMentoringQuota: supervision.filter(
        (s) => s.maxMentoringQuota !== null && s.groups > s.maxMentoringQuota,
      ).length,
      avgGroupsPerLecturer:
        totalLecturers > 0
          ? Number((totalGroups / totalLecturers).toFixed(1))
          : 0,
      avgStudentsPerLecturer:
        totalLecturers > 0
          ? Number((totalStudentsInGroups / totalLecturers).toFixed(1))
          : 0,
    };
  }

  // ── Database reads ────────────────────────────────────────

  private async loadTopics(
    semesterId: number,
    roundIds: number[],
  ): Promise<TopicRow[]> {
    if (roundIds.length === 0) return [];
    const rows = await this.prisma.topic.findMany({
      where: { semesterId, roundId: { in: roundIds } },
      select: {
        id: true,
        roundId: true,
        lecturerId: true,
        majorId: true,
        status: true,
        maxStudents: true,
        lecturer: { select: { majorId: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      roundId: r.roundId,
      lecturerId: r.lecturerId,
      effectiveMajorId: r.majorId ?? r.lecturer?.majorId ?? null,
      status: r.status,
      maxStudents: r.maxStudents,
    }));
  }

  private async loadGroups(
    semesterId: number,
    roundIds: number[],
  ): Promise<GroupRow[]> {
    if (roundIds.length === 0) return [];
    const rows = await this.prisma.registrationGroup.findMany({
      where: {
        semesterId,
        status: { not: RegistrationGroupStatus.REJECTED },
        topic: { roundId: { in: roundIds } },
      },
      select: {
        id: true,
        topicId: true,
        topic: {
          select: {
            roundId: true,
            lecturerId: true,
            majorId: true,
            maxStudents: true,
          },
        },
        members: {
          where: { status: GroupMemberStatus.ACCEPTED },
          select: {
            studentId: true,
            joinSource: true,
            student: { select: { majorId: true } },
          },
        },
        outline: { select: { status: true } },
        archive: { select: { id: true, isVerifiedByAcademic: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      topicId: row.topicId,
      roundId: row.topic.roundId,
      lecturerId: row.topic.lecturerId,
      majorId: row.topic.majorId,
      maxStudents: row.topic.maxStudents ?? 2,
      members: row.members.map((m) => ({
        studentId: m.studentId,
        joinSource: m.joinSource,
        majorId: m.student.majorId,
      })),
      outlineStatus: row.outline?.status ?? 'NOT_SUBMITTED',
      archiveState: !row.archive
        ? 'NOT_SUBMITTED'
        : row.archive.isVerifiedByAcademic
          ? 'VERIFIED'
          : 'PENDING',
    }));
  }

  private async loadProposals(
    semesterId: number,
    projectTypeIds: number[],
  ): Promise<ProposalBreakdown> {
    if (projectTypeIds.length === 0) {
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        needsRevision: 0,
      };
    }

    const rows = await this.prisma.topicProposal.findMany({
      where: {
        semesterId,
        projectTypeId: { in: projectTypeIds },
        status: { not: TopicProposalStatus.DRAFT },
      },
      select: { status: true },
    });

    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let needsRevision = 0;

    for (const r of rows) {
      if (r.status === TopicProposalStatus.PENDING) pending += 1;
      else if (r.status === TopicProposalStatus.ACCEPTED) accepted += 1;
      else if (r.status === TopicProposalStatus.REJECTED) rejected += 1;
      else if (r.status === TopicProposalStatus.NEEDS_REVISION)
        needsRevision += 1;
    }

    return {
      total: rows.length,
      pending,
      accepted,
      rejected,
      needsRevision,
    };
  }

  private async loadLecturers(
    semesterId: number,
    roundIds: number[],
  ): Promise<LecturerRow[]> {
    return this.prisma.lecturerProfile.findMany({
      where: {
        OR: [
          {
            user: { isActive: true, role: { in: [Role.LECTURER, Role.GVCN] } },
            isAcademicAssistant: false,
          },
          ...(roundIds.length > 0
            ? [
                {
                  topics: {
                    some: { semesterId, roundId: { in: roundIds } },
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        lecturerCode: true,
        fullName: true,
        academicTitle: true,
        maxMentoringQuota: true,
        major: { select: { code: true } },
      },
    });
  }

  private async loadRoundQuotas(roundIds: number[]) {
    if (roundIds.length === 0) return [];
    return this.prisma.roundLecturerQuota.findMany({
      where: { roundId: { in: roundIds } },
      select: {
        roundId: true,
        lecturerId: true,
        targetQuota: true,
        isExempt: true,
      },
    });
  }

  private async loadEligibleStudentsPerRound(
    rounds: RoundRow[],
  ): Promise<Map<number, EligibleStudentRow[]>> {
    const entries = await Promise.all(
      rounds.map(async (round) => {
        const hasSpecificRoster = (round._count?.eligibleStudents ?? 0) > 0;
        const cohorts = round.eligibilities.map((e) => e.cohort);

        if (!hasSpecificRoster && cohorts.length === 0) {
          return [round.id, [] as EligibleStudentRow[]] as const;
        }

        const students = await this.prisma.studentProfile.findMany({
          where: {
            user: { isActive: true },
            ...(hasSpecificRoster
              ? { roundEligibilities: { some: { roundId: round.id } } }
              : { cohort: { in: cohorts } }),
          },
          select: { id: true, majorId: true },
        });

        return [round.id, students] as const;
      }),
    );

    return new Map(entries);
  }

  private async requireSemester(semesterId?: number) {
    const select = {
      id: true,
      name: true,
      code: true,
      startDate: true,
      endDate: true,
    };

    const semester = semesterId
      ? await this.prisma.semester.findUnique({
          where: { id: semesterId },
          select,
        })
      : await this.prisma.semester.findFirst({
          where: { isActive: true },
          select,
        });

    if (!semester) {
      throw new NotFoundException(
        semesterId
          ? `Không tìm thấy học kỳ ${semesterId}`
          : 'Khoa chưa mở học kỳ nào, nên chưa có gì để thống kê.',
      );
    }

    return semester;
  }
}

function stringSelect(): true {
  return true;
}

// ── Internal types & pure aggregations ────────────────────

type RoundRow = {
  id: number;
  semesterId: number;
  phase: RoundPhase;
  registrationStart: Date;
  registrationEnd: Date;
  outlineDeadline: Date | null;
  officialStartDate: Date | null;
  officialEndDate: Date | null;
  archiveDeadline: Date | null;
  finalisedAt: Date | null;
  maxStudentsPerTopic: number;
  minTopicsPerLecturer: number | null;
  projectType: { id: number; name: string; code: string };
  eligibilities: { cohort: string }[];
  _count?: { eligibleStudents: number };
};

interface EligibleStudentRow {
  id: number;
  majorId: number | null;
}

interface TopicRow {
  id: number;
  roundId: number;
  lecturerId: number;
  effectiveMajorId: number | null;
  status: TopicStatus;
  maxStudents: number;
}

interface GroupRow {
  id: number;
  topicId: number;
  roundId: number;
  lecturerId: number;
  majorId: number | null;
  maxStudents: number;
  members: Array<{
    studentId: number;
    joinSource: GroupJoinSource;
    majorId: number | null;
  }>;
  outlineStatus: string;
  archiveState: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED';
}

interface LecturerRow {
  id: number;
  lecturerCode: string;
  fullName: string;
  academicTitle: string | null;
  maxMentoringQuota: number | null;
  major: { code: string } | null;
}

function deduplicateStudents(rows: EligibleStudentRow[]): EligibleStudentRow[] {
  const byId = new Map<number, EligibleStudentRow>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function computeGroupSizes(groups: GroupRow[]): GroupSizeBreakdown {
  let full = 0;
  let forming = 0;
  let size1 = 0;
  let size2 = 0;
  let size3Plus = 0;
  let totalStudents = 0;

  for (const g of groups) {
    const count = g.members.length;
    totalStudents += count;
    if (count >= g.maxStudents) full += 1;
    else forming += 1;
    if (count <= 1) size1 += 1;
    else if (count === 2) size2 += 1;
    else size3Plus += 1;
  }

  return {
    total: groups.length,
    full,
    forming,
    size1,
    size2,
    size3Plus,
    avgSize:
      groups.length > 0
        ? Number((totalStudents / groups.length).toFixed(1))
        : 0,
  };
}

function computeTopicFunnel(
  topics: TopicRow[],
  takenTopicIds: Set<number>,
  eligibleCount: number,
): TopicFunnel {
  let usable = 0;
  let draft = 0;
  let pending = 0;
  let approvedNotOpen = 0;
  let openAvailable = 0;
  let inUse = 0;
  let inProgress = 0;
  let completed = 0;
  let rejected = 0;
  let seatCapacity = 0;

  for (const t of topics) {
    if (USABLE_TOPIC_STATUSES.has(t.status)) {
      usable += 1;
      seatCapacity += t.maxStudents;
    }

    const isTaken =
      takenTopicIds.has(t.id) || IN_USE_TOPIC_STATUSES.has(t.status);

    switch (t.status) {
      case TopicStatus.DRAFT:
        draft += 1;
        break;
      case TopicStatus.PENDING:
      case TopicStatus.PENDING_DEPARTMENT:
        pending += 1;
        break;
      case TopicStatus.APPROVED:
        approvedNotOpen += 1;
        break;
      case TopicStatus.OPEN:
      case TopicStatus.APPROVED_OPEN:
        if (isTaken) inUse += 1;
        else openAvailable += 1;
        break;
      case TopicStatus.ASSIGNED:
        inUse += 1;
        break;
      case TopicStatus.IN_PROGRESS:
        inProgress += 1;
        inUse += 1;
        break;
      case TopicStatus.COMPLETED:
        completed += 1;
        inUse += 1;
        break;
      case TopicStatus.REJECTED:
        rejected += 1;
        break;
    }
  }

  return {
    total: topics.length,
    usable,
    draft,
    pending,
    approvedNotOpen,
    openAvailable,
    inUse,
    inProgress,
    completed,
    rejected,
    seatCapacity,
    seatBalance: seatCapacity - eligibleCount,
  };
}

function computeOutlines(groups: GroupRow[]): OutlineBreakdown {
  let approved = 0;
  let pendingReview = 0;
  let needsRevision = 0;
  let notSubmitted = 0;

  for (const g of groups) {
    if (g.outlineStatus === 'APPROVED_BY_LECTURER') approved += 1;
    else if (g.outlineStatus === 'SUBMITTED') pendingReview += 1;
    else if (g.outlineStatus === 'NEEDS_REVISION') needsRevision += 1;
    else notSubmitted += 1;
  }

  return {
    totalGroups: groups.length,
    approved,
    pendingReview,
    needsRevision,
    notSubmitted,
  };
}

function computeArchives(groups: GroupRow[]): ArchiveBreakdown {
  let verified = 0;
  let pendingVerify = 0;
  let notSubmitted = 0;

  for (const g of groups) {
    if (g.archiveState === 'VERIFIED') verified += 1;
    else if (g.archiveState === 'PENDING') pendingVerify += 1;
    else notSubmitted += 1;
  }

  return {
    totalGroups: groups.length,
    verified,
    pendingVerify,
    notSubmitted,
  };
}
