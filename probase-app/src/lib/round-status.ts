import {
  CalendarClock,
  CircleCheck,
  DoorOpen,
  Info,
  type LucideIcon,
} from 'lucide-react';
import type { RegistrationRound } from '@/lib/api/types';
import { daysUntilDay } from '@/lib/named-day';

export type RoundLike = Pick<
  RegistrationRound,
  'phase' | 'registrationStart' | 'registrationEnd'
>;

export interface RoundStatus {
  icon: LucideIcon;

  headline: string;

  detail: string;

  urgent: boolean;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
});

export function describeRound(
  round: RoundLike,
  hasGroup: boolean,
): RoundStatus {
  const { phase, registrationStart, registrationEnd } = round;

  if (phase === 'PREP') {
    const opensIn = daysUntilDay(registrationStart);

    return {
      icon: CalendarClock,
      headline:
        opensIn > 0 ? `Mở đăng ký sau ${opensIn} ngày` : 'Chưa mở đăng ký',
      detail: `Cổng đăng ký mở ngày ${dateFormat.format(new Date(registrationStart))}. Bạn có thể xem trước danh sách đề tài từ giờ.`,
      urgent: false,
    };
  }

  if (phase === 'OPEN' || phase === 'EXTENDED') {
    const closesIn = daysUntilDay(registrationEnd);
    const extended = phase === 'EXTENDED';
    const noun = extended ? 'gia hạn' : 'đăng ký';
    const closingDate = dateFormat.format(new Date(registrationEnd));

    return {
      icon: extended ? DoorOpen : CalendarClock,
      headline:
        closesIn <= 0
          ? `Hôm nay là hạn ${noun}`
          : `Còn ${closesIn} ngày ${noun}`,
      detail: hasGroup
        ? extended
          ? 'Cổng mở lại cho các bạn chưa có nhóm. Nhóm của bạn giữ nguyên và không thay đổi được thành viên nữa.'
          : `Hết ngày ${closingDate} là chốt. Sau đó nhóm không đổi được thành viên nữa, nên còn thiếu ai thì rủ từ giờ.`
        : `Bạn còn thời gian tự chọn đề tài, tới hết ngày ${closingDate}. Sau đó khoa sẽ xếp bạn vào một đề tài còn chỗ.`,
      urgent: closesIn <= 3,
    };
  }

  if (phase === 'RECONCILING') {
    return {
      icon: Info,
      headline: 'Khoa đang phân bổ',
      detail: hasGroup
        ? 'Cổng đăng ký đã đóng và khoa đang rà soát phân bổ. Nhóm của bạn giữ nguyên, chỉ không thay đổi được thành viên nữa.'
        : 'Bạn chưa có nhóm, nên khoa sẽ xếp bạn vào một đề tài còn chỗ. Bạn sẽ nhận được thông báo khi kết quả được chốt.',
      urgent: false,
    };
  }

  return {
    icon: CircleCheck,
    headline: 'Đã chốt phân bổ',
    detail: hasGroup
      ? 'Đề tài và nhóm của bạn đã chính thức. Từ đây là phần làm đồ án.'
      : 'Học kỳ này bạn không được phân đề tài. Liên hệ giáo vụ khoa nếu đây là sai sót.',
    urgent: false,
  };
}

export interface RoundStep {
  label: string;

  date: string | null;

  note: string | null;
  state: 'done' | 'current' | 'upcoming';
}

export function roundTimeline(round: RoundLike): RoundStep[] {
  const { phase } = round;
  const opened = phase !== 'PREP';
  const closed = phase === 'RECONCILING' || phase === 'FINALIZED';
  const opensIn = daysUntilDay(round.registrationStart);
  const closesIn = daysUntilDay(round.registrationEnd);

  return [
    {
      label: 'Mở đăng ký',
      date: dateFormat.format(new Date(round.registrationStart)),
      note: opened ? null : opensIn > 0 ? `còn ${opensIn} ngày` : 'hôm nay',
      state: opened ? 'done' : 'current',
    },
    {
      label: phase === 'EXTENDED' ? 'Hạn gia hạn' : 'Hạn đăng ký',
      date: dateFormat.format(new Date(round.registrationEnd)),
      note:
        opened && !closed
          ? closesIn > 0
            ? `còn ${closesIn} ngày`
            : 'hôm nay'
          : null,
      state: closed ? 'done' : opened ? 'current' : 'upcoming',
    },
    {
      label: 'Khoa phân bổ',
      date: null,
      note: phase === 'RECONCILING' ? 'đang diễn ra' : null,
      state:
        phase === 'FINALIZED'
          ? 'done'
          : phase === 'RECONCILING'
            ? 'current'
            : 'upcoming',
    },
    {
      label: 'Chốt danh sách',
      date: null,
      note: null,
      state: phase === 'FINALIZED' ? 'done' : 'upcoming',
    },
  ];
}
