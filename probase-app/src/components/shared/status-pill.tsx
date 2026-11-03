import { cn } from '@/lib/utils';

const TONE_CLASS = {
  waiting:
    'bg-amber-50 text-amber-700 border border-amber-300 font-semibold dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 dark:font-semibold',
  active:
    'bg-blue-50 text-blue-700 border border-blue-200 font-semibold dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 dark:font-semibold',
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 dark:font-semibold',
  danger:
    'bg-rose-50 text-rose-700 border border-rose-300 font-semibold dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 dark:font-semibold',
  idle: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:font-medium',
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
        'inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      <span>{label}</span>
    </span>
  );
}
