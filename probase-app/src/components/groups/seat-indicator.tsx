import type { TopicAvailability } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';

export function SeatBadge({
  topic,
  className,
}: {
  topic: TopicAvailability & { maxStudents: number; activeGroup: unknown };
  className?: string;
}) {
  return <StatusPill {...describe(topic)} className={className} />;
}

function describe(
  topic: TopicAvailability & { maxStudents: number; activeGroup: unknown },
): StatusLabel {
  if (topic.proposedByMe === true && topic.canRegister) {
    return { label: 'Chờ bạn đăng ký', tone: 'success' };
  }

  if (topic.canRegister) return { label: 'Còn trống', tone: 'success' };

  if (topic.canJoin) {
    const free = topic.maxStudents - topic.occupiedSeats;
    return {
      label: `${topic.occupiedSeats}/${topic.maxStudents} · còn ${free} chỗ`,
      tone: 'active',
    };
  }

  if (topic.isFull) {
    return {
      label: `Đủ ${topic.occupiedSeats}/${topic.maxStudents}`,
      tone: 'idle',
    };
  }

  if (topic.isMyGroup) return { label: 'Nhóm của bạn', tone: 'active' };

  if (topic.activeGroup) return { label: 'Đã có nhóm', tone: 'idle' };

  if (topic.proposedByMe === false) {
    return { label: 'SV khác đề xuất', tone: 'idle' };
  }

  if (topic.eligibleForMe === false) {
    return { label: 'Không đúng khóa', tone: 'idle' };
  }

  return { label: 'Chưa mở đăng ký', tone: 'idle' };
}

export function SeatDots({
  occupied,
  capacity,
  held = 0,
  className,
}: {
  occupied: number;
  capacity: number;
  held?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      role="img"
      aria-label={`${occupied} trên ${capacity} chỗ`}
    >
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            'size-2 rounded-full',
            index < occupied
              ? 'bg-status-success'
              : index < occupied + held
                ? 'bg-status-active/40'
                : 'bg-muted-foreground/25',
          )}
        />
      ))}
    </span>
  );
}
