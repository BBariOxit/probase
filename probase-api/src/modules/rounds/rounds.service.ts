import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  NotificationType,
  Prisma,
  RegistrationGroupStatus,
  Role,
  RoundPhase,
} from '../../../generated/prisma/client';
import { formatDate } from '../../common/utils/named-day.util';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { recordAudit } from '../../core/audit/audit-entry';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ExtendRoundDto } from './dto/extend-round.dto';
import { QueryRoundsDto } from './dto/query-rounds.dto';
import { SetSemesterRoundsDto } from './dto/set-semester-rounds.dto';
import { UnlockRoundDto } from './dto/unlock-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { RoundPhaseService } from './round-phase.service';
import { markTopicsBackOnOffer } from './topic-lifecycle';

const ROUND_SELECT = {
  id: true,
  semesterId: true,
  projectTypeId: true,
  registrationStart: true,
  registrationEnd: true,
  targetCohort: true,
  officialStartDate: true,
  officialEndDate: true,
  phase: true,
  allocationMode: true,
  finalisedAt: true,
  semester: { select: { id: true, name: true, code: true } },
  projectType: { select: { id: true, name: true, code: true } },
  eligibilities: {
    select: { cohort: true },
    orderBy: { cohort: 'asc' },
  },
} satisfies Prisma.RegistrationRoundSelect;

type RoundRow = Prisma.RegistrationRoundGetPayload<{
  select: typeof ROUND_SELECT;
}>;

const SCHEDULE_EDITABLE_PHASES: readonly RoundPhase[] = [
  RoundPhase.PREP,
  RoundPhase.OPEN,
];

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phases: RoundPhaseService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── read ──────────────────────────────────────────────────

  async findAll(query: QueryRoundsDto, userId: number, role: Role) {
    const where: Prisma.RegistrationRoundWhereInput = {};

    if (query.semesterId) where.semesterId = query.semesterId;
    if (query.projectTypeId) where.projectTypeId = query.projectTypeId;

    // `mine` is a student's question. Staff run the rounds, so narrowing their
    // view to an intake they do not have would just hide the list from the
    // people who maintain it.
    const scopedToMe = query.mine && role === Role.STUDENT;

    if (scopedToMe) {
      where.id = { in: await this.eligibleRoundIds(userId) };
    }

    const rounds = await this.prisma.registrationRound.findMany({
      where,
      select: ROUND_SELECT,
      orderBy: [{ semesterId: 'desc' }, { registrationEnd: 'asc' }],
    });

    const rendered = await this.renderMany(rounds);

    return scopedToMe ? this.ownRoundFirst(rendered, userId) : rendered;
  }

  async findOne(id: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id },
      select: ROUND_SELECT,
    });

    if (!round)
      throw new NotFoundException(`Không tìm thấy đợt đăng ký mã #${id}`);

    return (await this.renderMany([round]))[0];
  }

  async findForSemester(semesterId: number) {
    await this.requireSemester(semesterId);

    const rounds = await this.prisma.registrationRound.findMany({
      where: { semesterId },
      select: ROUND_SELECT,
      orderBy: { projectTypeId: 'asc' },
    });

    return this.renderMany(rounds);
  }

  async findEligibleProjectTypes(
    semesterId: number,
    userId: number,
    role: Role,
  ) {
    await this.requireSemester(semesterId);

    if (role !== Role.STUDENT) {
      return this.prisma.projectType.findMany({ orderBy: { code: 'asc' } });
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cohort: true },
    });
    if (!student) return [];

    // Evaluate eligibility per round: imported roster overrides cohort rule only
    // for rounds that actually have an imported roster (_count > 0).
    const specificRounds = await this.prisma.roundStudentEligibility.findMany({
      where: {
        studentId: student.id,
        round: { semesterId },
      },
      select: {
        round: {
          select: {
            id: true,
            projectType: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { round: { projectType: { code: 'asc' } } },
    });

    const eligibleMap = new Map<
      number,
      { id: number; name: string; code: string }
    >();
    for (const row of specificRounds) {
      eligibleMap.set(row.round.projectType.id, row.round.projectType);
    }

    if (student.cohort) {
      const cohortRounds = await this.prisma.registrationRound.findMany({
        where: {
          semesterId,
          eligibilities: { some: { cohort: student.cohort } },
        },
        select: {
          id: true,
          projectType: { select: { id: true, name: true, code: true } },
          _count: { select: { eligibleStudents: true } },
        },
        orderBy: { projectType: { code: 'asc' } },
      });

      for (const r of cohortRounds) {
        if (r._count.eligibleStudents === 0) {
          eligibleMap.set(r.projectType.id, r.projectType);
        }
      }
    }

    return [...eligibleMap.values()].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }

  async eligibleRoundIds(userId: number, semesterIds?: number[]) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cohort: true },
    });
    if (!student) return [];

    const specificRows = await this.prisma.roundStudentEligibility.findMany({
      where: {
        studentId: student.id,
        ...(semesterIds && { round: { semesterId: { in: semesterIds } } }),
      },
      select: { roundId: true },
    });

    const eligibleIds = new Set(specificRows.map((r) => r.roundId));

    if (student.cohort) {
      const cohortRounds = await this.prisma.registrationRound.findMany({
        where: {
          eligibilities: { some: { cohort: student.cohort } },
          ...(semesterIds && { semesterId: { in: semesterIds } }),
        },
        select: {
          id: true,
          _count: { select: { eligibleStudents: true } },
        },
      });

      for (const r of cohortRounds) {
        if (r._count.eligibleStudents === 0) {
          eligibleIds.add(r.id);
        }
      }
    }

    return [...eligibleIds];
  }

  async requireRoundFor(semesterId: number, projectTypeId: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { semesterId_projectTypeId: { semesterId, projectTypeId } },
      select: { id: true },
    });

    if (!round) {
      throw new ConflictException(
        'Khoa chưa mở đợt đăng ký cho loại đồ án này trong học kỳ, không thể tạo đề tài.',
      );
    }

    return round;
  }

  // ── write ─────────────────────────────────────────────────

  async setSemesterRounds(
    semesterId: number,
    dto: SetSemesterRoundsDto,
    actorId: number,
  ) {
    await this.requireSemester(semesterId);
    await this.requireProjectTypes(dto.rounds.map((r) => r.projectTypeId));

    const existing = await this.prisma.registrationRound.findMany({
      where: { semesterId },
      select: {
        id: true,
        projectTypeId: true,
        phase: true,
        registrationStart: true,
        registrationEnd: true,
        _count: { select: { topics: true } },
      },
    });

    const phases = await this.phases.resolveMany(existing);
    const byProjectType = new Map(
      existing.map((round) => [round.projectTypeId, round]),
    );
    const kept = new Set(dto.rounds.map((round) => round.projectTypeId));

    // Dropping a round that lecturers have already written topics for would
    // delete their work through an omission in somebody else's payload, so it
    // is refused by name rather than obeyed.
    const dropped = existing.filter((r) => !kept.has(r.projectTypeId));
    const blocked = dropped.filter((round) => round._count.topics > 0);

    if (blocked.length > 0) {
      const types = await this.prisma.projectType.findMany({
        where: { id: { in: blocked.map((round) => round.projectTypeId) } },
        select: { name: true },
      });

      throw new ConflictException(
        `Không thể xóa đợt đăng ký đã có đề tài: ${types
          .map((type) => type.name)
          .join(', ')}`,
      );
    }

    for (const plan of dto.rounds) {
      const current = byProjectType.get(plan.projectTypeId);
      if (!current) continue;

      this.assertScheduleEditable(
        phases.get(current.id) ?? current.phase,
        movesWindow(current, plan),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (dropped.length > 0) {
        await tx.registrationRound.deleteMany({
          where: { id: { in: dropped.map((round) => round.id) } },
        });
      }

      for (const plan of dto.rounds) {
        const current = byProjectType.get(plan.projectTypeId);

        const saved = current
          ? await tx.registrationRound.update({
              where: { id: current.id },
              data: {
                registrationStart: plan.registrationStart,
                registrationEnd: plan.registrationEnd,
                ...(plan.targetCohort !== undefined && {
                  targetCohort: plan.targetCohort,
                }),
                ...(plan.officialStartDate !== undefined && {
                  officialStartDate: plan.officialStartDate,
                }),
                ...(plan.officialEndDate !== undefined && {
                  officialEndDate: plan.officialEndDate,
                }),
                ...(plan.allocationMode && {
                  allocationMode: plan.allocationMode,
                }),
              },
              select: { id: true },
            })
          : await tx.registrationRound.create({
              data: {
                semesterId,
                projectTypeId: plan.projectTypeId,
                registrationStart: plan.registrationStart,
                registrationEnd: plan.registrationEnd,
                ...(plan.targetCohort !== undefined && {
                  targetCohort: plan.targetCohort,
                }),
                ...(plan.officialStartDate !== undefined && {
                  officialStartDate: plan.officialStartDate,
                }),
                ...(plan.officialEndDate !== undefined && {
                  officialEndDate: plan.officialEndDate,
                }),
                ...(plan.allocationMode && {
                  allocationMode: plan.allocationMode,
                }),
              },
              select: { id: true },
            });

        await this.replaceCohorts(tx, saved.id, plan.cohorts);
      }

      // One entry for the plan rather than one per round, because that is the
      // unit the office actually decided: this payload replaces the whole term's
      // arrangement, and a reader asking "who opened Tốt nghiệp to khóa 2022"
      // wants the announcement, not three rows they have to reassemble.
      await recordAudit(tx, {
        userId: actorId,
        action: 'SET_SEMESTER_ROUNDS',
        targetTable: 'semesters',
        targetId: semesterId,
        oldValue: {
          rounds: existing.map((round) => ({
            projectTypeId: round.projectTypeId,
            registrationStart: round.registrationStart.toISOString(),
            registrationEnd: round.registrationEnd.toISOString(),
          })),
        },
        newValue: {
          rounds: dto.rounds.map((plan) => ({
            projectTypeId: plan.projectTypeId,
            registrationStart: plan.registrationStart.toISOString(),
            registrationEnd: plan.registrationEnd.toISOString(),
            cohorts: plan.cohorts,
          })),
          ...(dropped.length > 0 && {
            removedProjectTypeIds: dropped.map((round) => round.projectTypeId),
          }),
        },
      });
    });

    return this.findForSemester(semesterId);
  }

  async update(id: number, dto: UpdateRoundDto) {
    const round = await this.loadRow(id);
    const phase = await this.phases.resolve(id);

    const registrationStart = dto.registrationStart ?? round.registrationStart;
    const registrationEnd = dto.registrationEnd ?? round.registrationEnd;

    this.assertScheduleEditable(
      phase,
      movesWindow(round, { registrationStart, registrationEnd }),
    );

    if (registrationEnd <= registrationStart) {
      throw new BadRequestException(
        'Ngày kết thúc đăng ký phải sau ngày mở đăng ký',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.registrationRound.update({
        where: { id },
        data: {
          registrationStart,
          registrationEnd,
          ...(dto.targetCohort !== undefined && {
            targetCohort: dto.targetCohort,
          }),
          ...(dto.officialStartDate !== undefined && {
            officialStartDate: dto.officialStartDate,
          }),
          ...(dto.officialEndDate !== undefined && {
            officialEndDate: dto.officialEndDate,
          }),
          ...(dto.allocationMode && { allocationMode: dto.allocationMode }),
        },
      });

      if (dto.cohorts) await this.replaceCohorts(tx, id, dto.cohorts);
    });

    return this.findOne(id);
  }

  async extend(id: number, dto: ExtendRoundDto, userId: number) {
    const round = await this.loadRow(id);
    const phase = await this.phases.resolve(id);

    if (phase !== RoundPhase.RECONCILING) {
      throw new ConflictException(
        phase === RoundPhase.EXTENDED
          ? 'Đợt đăng ký này đang trong thời gian gia hạn.'
          : 'Chỉ có thể gia hạn đợt đăng ký sau khi cổng đăng ký đã đóng.',
      );
    }

    if (dto.registrationEnd.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Thời hạn gia hạn phải sau thời điểm hiện tại.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Guarded on the phase rather than a plain update: two administrators
      // pressing at once would otherwise both write, and the second would move
      // the deadline of an extension it believed it was starting.
      const { count } = await tx.registrationRound.updateMany({
        where: { id, phase: RoundPhase.RECONCILING },
        data: {
          phase: RoundPhase.EXTENDED,
          registrationEnd: dto.registrationEnd,
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Đợt đăng ký vừa thay đổi trạng thái — vui lòng tải lại trang và thử lại.',
        );
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXTEND_REGISTRATION_ROUND',
          targetTable: 'registration_rounds',
          targetId: String(id),
          oldValue: {
            phase: round.phase,
            registrationEnd: round.registrationEnd.toISOString(),
          },
          newValue: {
            phase: RoundPhase.EXTENDED,
            registrationEnd: dto.registrationEnd.toISOString(),
            // The announced deadline was overridden, and this is the only record
            // of why. It is the reason the reason field is mandatory.
            reason: dto.reason,
          },
        },
      });
    });

    const extended = await this.findOne(id);

    // Told after the fact, never inside the transaction: a database hiccup on a
    // notice must not undo an extension the office has already been told
    // succeeded.
    await this.announceExtension(extended);

    return extended;
  }

  async unlock(id: number, dto: UnlockRoundDto, userId: number) {
    const phase = await this.phases.resolve(id);

    if (phase !== RoundPhase.FINALIZED) {
      throw new ConflictException(
        'Chỉ có thể mở khóa đợt đăng ký đã chốt phân bổ.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Guarded on the phase for the same reason `extend` is: two administrators
      // pressing at once would otherwise both write, and the second would record
      // itself as the author of an unlock the first had already done.
      const { count } = await tx.registrationRound.updateMany({
        where: { id, phase: RoundPhase.FINALIZED },
        data: {
          phase: RoundPhase.RECONCILING,
          // Cleared together with the phase: they say who settled this round,
          // and it is no longer settled. Leaving them would have the next
          // finalisation look like an edit to the first one.
          finalisedAt: null,
          finalisedById: null,
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Đợt đăng ký đã thay đổi trạng thái, vui lòng tải lại trang.',
        );
      }

      const reopened = await markTopicsBackOnOffer(tx, id);

      await recordAudit(tx, {
        userId,
        action: 'UNLOCK_REGISTRATION_ROUND',
        targetTable: 'registration_rounds',
        targetId: id,
        oldValue: { phase: RoundPhase.FINALIZED },
        newValue: {
          phase: RoundPhase.RECONCILING,
          topicsReopened: reopened,
          // The only record of why an announced allocation was reopened, which
          // is why the field is required.
          reason: dto.reason,
        },
      });
    });

    return this.findOne(id);
  }

  // ── internals ─────────────────────────────────────────────

  private async announceExtension(round: {
    id: number;
    semesterId: number;
    registrationEnd: Date;
    cohorts: string[];
    projectType: { name: string };
  }) {
    const specificCount = await this.prisma.roundStudentEligibility.count({
      where: { roundId: round.id },
    });

    const userIds = await this.notifications.studentsWithoutGroupIn({
      roundId: round.id,
      hasSpecificRoster: specificCount > 0,
      semesterId: round.semesterId,
      cohorts: round.cohorts,
    });

    await this.notifications.notify(
      userIds.map((userId) => ({
        userId,
        type: NotificationType.ROUND_EXTENDED,
        title: 'Khoa đã gia hạn đăng ký đề tài',
        content: `Khoa gia hạn đăng ký ${round.projectType.name} đến hết ngày ${formatDate(round.registrationEnd)}. Vui lòng hoàn tất đăng ký trước thời hạn.`,
        targetId: round.id,
      })),
    );
  }

  private assertScheduleEditable(phase: RoundPhase, movesWindow: boolean) {
    if (!movesWindow) return;
    if (SCHEDULE_EDITABLE_PHASES.includes(phase)) return;

    throw new ConflictException(
      'Đợt đăng ký đã đóng, không thể sửa mốc thời gian — vui lòng sử dụng chức năng gia hạn.',
    );
  }

  private async replaceCohorts(
    tx: Prisma.TransactionClient,
    roundId: number,
    cohorts: string[],
  ) {
    await tx.roundEligibility.deleteMany({ where: { roundId } });
    await tx.roundEligibility.createMany({
      // A spreadsheet paste with a repeated line is accepted rather than
      // rejected on a unique-key violation the caller cannot see.
      data: [...new Set(cohorts)].map((cohort) => ({ roundId, cohort })),
    });
  }

  private async renderMany(rounds: RoundRow[]) {
    const phases = await this.phases.resolveMany(rounds);

    return rounds.map(({ eligibilities, ...round }) => ({
      ...round,
      phase: phases.get(round.id) ?? round.phase,
      cohorts: eligibilities.map((rule) => rule.cohort),
    }));
  }

  private async ownRoundFirst<T extends { id: number; registrationEnd: Date }>(
    rounds: T[],
    userId: number,
  ) {
    if (rounds.length < 2) return rounds;

    const roundIds = rounds.map((round) => round.id);

    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        student: { userId },
        status: GroupMemberStatus.ACCEPTED,
        group: {
          status: { not: RegistrationGroupStatus.REJECTED },
          topic: { roundId: { in: roundIds } },
        },
      },
      select: { group: { select: { topic: { select: { roundId: true } } } } },
    });

    const ownRoundId = membership?.group.topic.roundId;

    return [...rounds].sort((a, b) => {
      if (a.id === ownRoundId) return -1;
      if (b.id === ownRoundId) return 1;

      return a.registrationEnd.getTime() - b.registrationEnd.getTime();
    });
  }

  private async loadRow(id: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id },
      select: {
        id: true,
        phase: true,
        registrationStart: true,
        registrationEnd: true,
      },
    });

    if (!round)
      throw new NotFoundException(`Không tìm thấy đợt đăng ký mã #${id}`);

    return round;
  }

  private async cohortOf(userId: number) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { cohort: true },
    });

    return profile?.cohort ?? null;
  }

  private async requireSemester(id: number) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!semester)
      throw new NotFoundException(`Không tìm thấy học kỳ mã #${id}`);
  }

  private async requireProjectTypes(ids: number[]) {
    const wanted = [...new Set(ids)];
    const known = await this.prisma.projectType.findMany({
      where: { id: { in: wanted } },
      select: { id: true },
    });

    if (known.length === wanted.length) return;

    const found = new Set(known.map((type) => type.id));
    const missing = wanted.filter((id) => !found.has(id));

    throw new NotFoundException(
      `Không tìm thấy loại đồ án mã: ${missing.join(', ')}`,
    );
  }
}

function movesWindow(
  current: { registrationStart: Date; registrationEnd: Date },
  plan: { registrationStart: Date; registrationEnd: Date },
): boolean {
  return (
    current.registrationStart.getTime() !== plan.registrationStart.getTime() ||
    current.registrationEnd.getTime() !== plan.registrationEnd.getTime()
  );
}
