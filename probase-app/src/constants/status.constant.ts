import type { ProposalStatus, TopicStatus } from '@/lib/api/types';

export const TOPIC_STATUS_FILTERS = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'DRAFT', label: 'Bản nháp (Chưa gửi duyệt)' },
  { value: 'PENDING_DEPARTMENT', label: 'Chờ Bộ môn duyệt' },
  { value: 'PENDING_FACULTY', label: 'Chờ Khoa duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'OPEN', label: 'Đang mở đăng ký' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'REJECTED', label: 'Bị từ chối' },
] as const;

export const TOPIC_STATUS_LABELS: Record<
  TopicStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: 'Bản nháp', className: 'text-muted-foreground' },
  PENDING: { label: 'Chờ duyệt', className: 'text-amber-600 dark:text-amber-400' },
  PENDING_DEPARTMENT: {
    label: 'Chờ Bộ môn duyệt',
    className: 'text-orange-600 dark:text-orange-400',
  },
  PENDING_FACULTY: {
    label: 'Chờ Khoa duyệt',
    className: 'text-blue-600 dark:text-blue-400',
  },
  APPROVED_OPEN: {
    label: 'Đã duyệt mở',
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  APPROVED: {
    label: 'Khoa đã duyệt',
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  OPEN: {
    label: 'Đang mở đăng ký',
    className: 'text-green-600 dark:text-green-400',
  },
  ASSIGNED: {
    label: 'Đã giao nhóm',
    className: 'text-purple-600 dark:text-purple-400',
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    className: 'text-indigo-600 dark:text-indigo-400',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    className: 'text-slate-600 dark:text-slate-400',
  },
  REJECTED: {
    label: 'Bị từ chối',
    className: 'text-rose-600 dark:text-rose-400',
  },
};

export const PROPOSAL_STATUS_FILTERS: {
  value: ProposalStatus | 'ALL';
  label: string;
}[] = [
  { value: 'PENDING', label: 'Chờ duyệt / Đang trao đổi' },
  { value: 'ACCEPTED', label: 'Đã nhận hướng dẫn' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'ALL', label: 'Mọi trạng thái' },
];
