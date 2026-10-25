import type { ActiveGroup, TopicStatus } from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';

const TOPIC_STATUS: Record<TopicStatus, StatusLabel> = {
  PENDING: { label: 'Chờ duyệt', tone: 'waiting' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  IN_PROGRESS: { label: 'Đang thực hiện', tone: 'active' },
  COMPLETED: { label: 'Hoàn thành', tone: 'idle' },
};

export function TopicStatusBadge({
  status,
  className,
}: {
  status: TopicStatus;
  className?: string;
}) {
  return <StatusPill {...TOPIC_STATUS[status]} className={className} />;
}

export function TopicOwnerBadge({
  status,
  activeGroup,
  className,
}: {
  status: TopicStatus;
  activeGroup: ActiveGroup | null;
  className?: string;
}) {
  if (status === 'OPEN' && activeGroup) {
    const owned =
      activeGroup.status === 'SUBMITTED'
        ? ({ label: 'Đã đủ người', tone: 'success' } as const)
        : ({ label: 'Đang lập nhóm', tone: 'active' } as const);

    return <StatusPill {...owned} className={className} />;
  }

  return <StatusPill {...TOPIC_STATUS[status]} className={className} />;
}
