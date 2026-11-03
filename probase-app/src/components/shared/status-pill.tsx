import { cn } from '@/lib/utils';

const TONE_CLASS = {
  waiting:
    'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  active:
    'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  danger:
    'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  idle: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10',
} as const;

const DOT_CLASS = {
  waiting: 'bg-amber-500',
  active: 'bg-blue-600 dark:bg-blue-400',
  success: 'bg-emerald-500',
  danger: 'bg-rose-500',
  idle: 'bg-slate-400 dark:bg-zinc-500',
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_CLASS[tone])} />
      <span>{label}</span>
    </span>
  );
}
