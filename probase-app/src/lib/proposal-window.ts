import type { RoundLike } from '@/lib/round-status';

export interface ProposalWindow {
  open: boolean;

  reason: string | null;
}

export function proposalWindow(
  round: RoundLike | undefined,
  hasGroup: boolean,
): ProposalWindow {
  // No round for this reader's intake this semester: not a phase problem, and
  // the faculty office is the only place that can fix it.
  if (!round) {
    return {
      open: false,
      reason:
        'Học kỳ này khoa chưa mở đợt đồ án nào cho khóa của bạn, nên chưa gửi đề xuất được.',
    };
  }

  if (round.phase === 'PREP' || round.phase === 'OPEN') {
    return { open: true, reason: null };
  }

  if (round.phase === 'EXTENDED') {
    return hasGroup
      ? {
          open: false,
          reason:
            'Đợt đăng ký đã đóng và chỉ gia hạn cho các bạn chưa có nhóm. Bạn đã có đề tài nên không gửi đề xuất mới được.',
        }
      : { open: true, reason: null };
  }

  return {
    open: false,
    reason:
      round.phase === 'RECONCILING'
        ? 'Đợt đăng ký đã đóng và khoa đang phân bổ, nên đề tài đề xuất bây giờ sẽ không kịp cho ai đăng ký.'
        : 'Học kỳ này đã chốt phân bổ, không nhận thêm đề xuất nữa.',
  };
}
