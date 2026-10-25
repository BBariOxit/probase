import { cn } from '@/lib/utils';

const TONE_CLASS = {
  waiting: 'bg-status-waiting-bg text-status-waiting',
  active: 'bg-status-active-bg text-status-active',
  success: 'bg-status-success-bg text-status-success',
  danger: 'bg-status-danger-bg text-status-danger',
  idle: 'bg-status-idle-bg text-status-idle',
} as const;

export type StatusTone = keyof typeof TONE_CLASS;

export interface StatusLabel {
  label: string;
  tone: StatusTone;
}

export function StatusPill({
  label,
  tone,
  className,
}: StatusLabel & { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
