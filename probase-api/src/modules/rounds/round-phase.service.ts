import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberStatus,
  RegistrationGroupStatus,
  RoundPhase,
} from '../../../generated/prisma/client';
import {
  endOfNamedDay,
  startOfNamedDay,
} from '../../common/utils/named-day.util';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class RoundPhaseService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(roundId: number): Promise<RoundPhase> {
    const round = await this.load(roundId);

    return this.advance(round);
  }

  async requireCanJoin(roundId: number, studentId: number): Promise<void> {
    const round = await this.load(roundId);
    const phase = await this.advance(round);

    if (phase === RoundPhase.OPEN) return;

    if (phase === RoundPhase.EXTENDED) {
      // Asked here rather than left to the caller's own "already in a group"
      // check, so the rule that defines this phase lives where the phase does.
      // The two refusals also read differently, and a student in an extension
      // deserves the one that explains why the reopened gate is not for them.
      if (!(await this.hasGroup(studentId, round.semesterId))) return;

      throw new ConflictException(
        'Đợt gia hạn chỉ dành cho sinh viên chưa có nhóm, nhóm hiện tại không thể thay đổi.',
      );
    }

    throw new ConflictException(REFUSAL_BY_PHASE[phase]);
  }

  async requireCanPropose(roundId: number, studentId: number): Promise<void> {
    const round = await this.load(roundId);
    const phase = await this.advance(round);

    if (phase === RoundPhase.PREP || phase === RoundPhase.OPEN) return;

    if (phase === RoundPhase.EXTENDED) {
      if (!(await this.hasGroup(studentId, round.semesterId))) return;

      throw new ConflictException(
        'Đợt gia hạn chỉ dành cho sinh viên chưa có nhóm — bạn đã có đề tài trong học kỳ này.',
      );
    }

    throw new ConflictException(REFUSAL_BY_PHASE[phase]);
  }

  async requireCanAcceptProposal(roundId: number): Promise<void> {
    const phase = await this.resolve(roundId);

    if (
      phase === RoundPhase.PREP ||
      phase === RoundPhase.OPEN ||
      phase === RoundPhase.EXTENDED
    ) {
      return;
    }

    throw new ConflictException(
      'Đợt đăng ký đã đóng, không thể phê duyệt thêm đề tài mới.',
    );
  }

  async requireCanLeave(roundId: number): Promise<void> {
    const phase = await this.resolve(roundId);

    if (phase === RoundPhase.OPEN) return;

    throw new ConflictException(
      phase === RoundPhase.EXTENDED
        ? 'Cổng đăng ký đã đóng. Đợt gia hạn chỉ dành cho sinh viên chưa có nhóm, nhóm hiện tại không thể thay đổi.'
        : REFUSAL_BY_PHASE[phase],
    );
  }

  private async load(roundId: number) {
    const round = await this.prisma.registrationRound.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        semesterId: true,
        phase: true,
        registrationStart: true,
        registrationEnd: true,
      },
    });

    if (!round) {
      throw new NotFoundException(`Không tìm thấy đợt đăng ký #${roundId}`);
    }

    return round;
  }

  async resolveMany<T extends PhaseRow>(
    rounds: T[],
  ): Promise<Map<number, RoundPhase>> {
    const current = new Map<number, RoundPhase>();
    const moved: { id: number; from: RoundPhase; to: RoundPhase }[] = [];

    for (const round of rounds) {
      const due = duePhase(round);
      current.set(round.id, due);

      if (due !== round.phase) {
        moved.push({ id: round.id, from: round.phase, to: due });
      }
    }

    // Guarded on the phase that was read rather than a plain update, so two
    // requests arriving together cannot fight: the second matches no rows and
    // does nothing, instead of writing over a phase that has since moved on.
    await Promise.all(
      moved.map((move) =>
        this.prisma.registrationRound.updateMany({
          where: { id: move.id, phase: move.from },
          data: { phase: move.to },
        }),
      ),
    );

    return current;
  }

  private async advance(round: PhaseRow): Promise<RoundPhase> {
    const phases = await this.resolveMany([round]);

    return phases.get(round.id) ?? round.phase;
  }

  private async hasGroup(studentId: number, semesterId: number) {
    const membership = await this.prisma.registrationGroupMember.findFirst({
      where: {
        studentId,
        semesterId,
        status: GroupMemberStatus.ACCEPTED,
        group: { status: { not: RegistrationGroupStatus.REJECTED } },
      },
      select: { id: true },
    });

    return membership !== null;
  }
}

interface PhaseRow {
  id: number;
  phase: RoundPhase;
  registrationStart: Date;
  registrationEnd: Date;
}

export function duePhase(round: {
  phase: RoundPhase;
  registrationStart: Date;
  registrationEnd: Date;
}): RoundPhase {
  const now = Date.now();
  const opens = startOfNamedDay(round.registrationStart);
  const closes = endOfNamedDay(round.registrationEnd);

  if (round.phase === RoundPhase.PREP) {
    if (now >= closes) return RoundPhase.RECONCILING;

    return now >= opens ? RoundPhase.OPEN : RoundPhase.PREP;
  }

  if (round.phase === RoundPhase.OPEN || round.phase === RoundPhase.EXTENDED) {
    return now >= closes ? RoundPhase.RECONCILING : round.phase;
  }

  return round.phase;
}

const REFUSAL_BY_PHASE: Record<
  Exclude<RoundPhase, 'OPEN' | 'EXTENDED'>,
  string
> = {
  [RoundPhase.PREP]:
    'Đợt đăng ký chưa mở — sinh viên chưa thể chọn đề tài trong thời gian chuẩn bị.',
  [RoundPhase.RECONCILING]:
    'Cổng đăng ký đã đóng. Giáo vụ đang xử lý phân bổ cho sinh viên chưa có nhóm, không thể thay đổi nhóm.',
  [RoundPhase.FINALIZED]:
    'Danh sách phân bổ đợt này đã chốt chính thức, không thể thay đổi.',
};
