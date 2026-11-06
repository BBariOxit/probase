import type { StatusTone } from '@/components/shared/status-pill';

export const ROUND_SCHEDULE_EDITABLE_PHASES = ['PREP', 'OPEN'] as const;

export const ROUND_PHASE_CONFIG: Record<
  string,
  { label: string; tone: StatusTone }
> = {
  PREP: { label: 'Chưa mở', tone: 'waiting' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  EXTENDED: { label: 'Đang gia hạn', tone: 'active' },
  RECONCILING: { label: 'Đang phân bổ', tone: 'active' },
  FINALIZED: { label: 'Đã chốt', tone: 'idle' },
};

export const DEFAULT_STANDARD_MILESTONES = [
  'Đề cương chi tiết',
  'Báo cáo tiến độ đợt 1',
  'Báo cáo tiến độ đợt 2',
  'Quyển báo cáo toàn văn & Sản phẩm',
] as const;

