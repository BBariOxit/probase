import { cn } from '@/lib/utils';

const TONE_CLASS = {
  waiting: 'text-amber-600 dark:text-amber-400 font-medium',
  active: 'text-primary font-medium',
  success: 'text-emerald-600 dark:text-emerald-400 font-medium',
  danger: 'text-rose-600 dark:text-rose-400 font-medium',
  idle: 'text-slate-500 dark:text-neutral-400 font-medium',
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
        'inline-flex shrink-0 items-center text-xs whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
