import { cn } from '@/lib/utils';

const TONE_CLASS = {
  waiting:
    'bg-amber-50 text-amber-700 border border-amber-200 font-semibold dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20 dark:font-medium',
  active:
    'bg-blue-50 text-blue-700 border border-blue-200 font-semibold dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/20 dark:font-medium',
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20 dark:font-medium',
  danger:
    'bg-rose-50 text-rose-700 border border-rose-200 font-semibold dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/20 dark:font-medium',
  idle: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:font-medium',
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
