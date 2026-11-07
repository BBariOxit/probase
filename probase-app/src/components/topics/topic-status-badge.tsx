import type { ActiveGroup, TopicStatus } from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';

const TOPIC_STATUS: Record<TopicStatus, StatusLabel> = {
  DRAFT: { label: 'Bản nháp', tone: 'idle' },
  PENDING: { label: 'Chờ duyệt', tone: 'waiting' },
  PENDING_DEPARTMENT: { label: 'Chờ Bộ môn duyệt', tone: 'waiting' },
  PENDING_FACULTY: { label: 'Chờ Khoa duyệt', tone: 'active' },
  APPROVED_OPEN: { label: 'Đã duyệt mở', tone: 'success' },
  APPROVED: { label: 'Khoa đã duyệt', tone: 'success' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  ASSIGNED: { label: 'Đã giao nhóm', tone: 'idle' },
  IN_PROGRESS: { label: 'Đang thực hiện', tone: 'active' },
  COMPLETED: { label: 'Hoàn thành', tone: 'idle' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
};

export function TopicStatusBadge({
  status,
  variant = 'text',
  className,
}: {
  status: TopicStatus;
  variant?: 'text' | 'tag';
  className?: string;
}) {
  return (
    <StatusPill
      {...TOPIC_STATUS[status]}
      variant={variant}
      className={className}
    />
  );
}

export function TopicOwnerBadge({
  status,
  activeGroup,
  variant = 'text',
  className,
}: {
  status: TopicStatus;
  activeGroup: ActiveGroup | null;
  variant?: 'text' | 'tag';
  className?: string;
}) {
  if (status === 'OPEN' && activeGroup) {
    const owned =
      activeGroup.status === 'SUBMITTED'
        ? ({ label: 'Đã đủ người', tone: 'success' } as const)
        : ({ label: 'Đang lập nhóm', tone: 'active' } as const);

    return <StatusPill {...owned} variant={variant} className={className} />;
  }

  return (
    <StatusPill
      {...TOPIC_STATUS[status]}
      variant={variant}
      className={className}
    />
  );
}
