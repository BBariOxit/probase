import type { ProposalStatus, TopicStatus } from '@/lib/api/types';

export const TOPIC_STATUS_FILTERS = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'DRAFT', label: 'Bản nháp (Chưa gửi duyệt)' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
] as const;

export const PROPOSAL_STATUS_FILTERS: { value: ProposalStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt / Đang trao đổi' },
  { value: 'ACCEPTED', label: 'Đã nhận hướng dẫn' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'ALL', label: 'Mọi trạng thái' },
];
