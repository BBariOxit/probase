import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  NotificationType,
  RoundPhase,
  TopicStatus,
} from '../../../generated/prisma/client';
import { formatDate } from '../../common/utils/named-day.util';
import { buildRoundOpenedNotices } from '../notifications/notification-templates';
import {
  NotificationsService,
  type NewNotification,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoundPhaseService } from '../../modules/rounds/round-phase.service';

const LEAD_DAYS = 3;

const GATE_OPEN: readonly RoundPhase[] = [RoundPhase.OPEN, RoundPhase.EXTENDED];

export interface ReminderRun {
  roundOpened: number;
  registrationClosingSoon: number;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly phases: RoundPhaseService,
  ) {}

  @Cron('0 7 * * *', {
    name: 'deadline-reminders',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async runDaily(): Promise<void> {
    const sent = await this.run();

    this.logger.log(
      `Deadline reminders: ${sent.roundOpened} mở đăng ký, ${sent.registrationClosingSoon} về hạn đăng ký`,
    );
  }

  async run(): Promise<ReminderRun> {
    const [roundOpened, registrationClosingSoon] = await Promise.all([
      this.remindRoundOpened(),
      this.remindRegistrationClosing(),
    ]);

    return { roundOpened, registrationClosingSoon };
  }

  private async remindRoundOpened(): Promise<number> {
    const rounds = await this.prisma.registrationRound.findMany({
      where: {
        phase: RoundPhase.PREP,
        topics: { some: { status: TopicStatus.OPEN } },
      },
      select: {
        id: true,
        semesterId: true,
        phase: true,
        registrationStart: true,
        registrationEnd: true,
        semester: { select: { name: true } },
        projectType: { select: { name: true } },
        eligibilities: { select: { cohort: true } },
        _count: { select: { eligibleStudents: true } },
      },
    });

    if (rounds.length === 0) return 0;

    const phases = await this.phases.resolveMany(rounds);
    const notices: NewNotification[] = [];

    for (const round of rounds) {
      if (round.phase !== RoundPhase.PREP) continue;
      const phase = phases.get(round.id) ?? round.phase;
      if (!GATE_OPEN.includes(phase)) continue;

      const userIds = await this.notifications.studentsWithoutGroupIn({
        roundId: round.id,
        hasSpecificRoster: (round._count?.eligibleStudents ?? 0) > 0,
        semesterId: round.semesterId,
        cohorts: round.eligibilities.map((rule) => rule.cohort),
      });

      notices.push(
        ...buildRoundOpenedNotices(round.id, userIds, {
          semesterName: round.semester?.name ?? '',
          projectTypeName: round.projectType.name,
          endDate: formatDate(round.registrationEnd),
        }),
      );
    }

    return this.notifications.notify(notices);
  }

  private async remindRegistrationClosing(): Promise<number> {
    const rounds = await this.prisma.registrationRound.findMany({
      where: { registrationEnd: this.closingWindow() },
      select: {
        id: true,
        semesterId: true,
        phase: true,
        registrationStart: true,
        registrationEnd: true,
        projectType: { select: { name: true } },
        eligibilities: { select: { cohort: true } },
        _count: { select: { eligibleStudents: true } },
      },
    });

    if (rounds.length === 0) return 0;

    const phases = await this.phases.resolveMany(rounds);
    const notices: NewNotification[] = [];

    for (const round of rounds) {
      const phase = phases.get(round.id) ?? round.phase;
      if (!GATE_OPEN.includes(phase)) continue;

      const userIds = await this.notifications.studentsWithoutGroupIn({
        roundId: round.id,
        hasSpecificRoster: (round._count?.eligibleStudents ?? 0) > 0,
        semesterId: round.semesterId,
        cohorts: round.eligibilities.map((rule) => rule.cohort),
      });

      notices.push(
        ...userIds.map((userId) => ({
          userId,
          type: NotificationType.REGISTRATION_CLOSING_SOON,
          title: 'Sắp hết hạn đăng ký đề tài',
          content: `${round.projectType.name} đóng đăng ký ngày ${formatDate(round.registrationEnd)}. Bạn chưa có nhóm — sau hạn này khoa sẽ xếp đề tài cho bạn.`,
          targetId: round.id,
          // The deadline is part of the key, so an extension is a new thing to
          // be told about rather than a repeat of the notice already sent.
          dedupeKey: `REGISTRATION_CLOSING_SOON:round=${round.id}:end=${round.registrationEnd.toISOString()}:user=${userId}`,
        })),
      );
    }

    return this.notifications.notify(notices);
  }

  private closingWindow() {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + LEAD_DAYS);

    return { gt: now, lte: until };
  }
}
