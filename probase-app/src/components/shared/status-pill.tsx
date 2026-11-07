import { cn } from '@/lib/utils';

const TEXT_TONE_CLASS = {
  waiting: 'text-amber-600 dark:text-amber-400 font-medium',
  active: 'text-primary font-medium',
  success: 'text-green-600 dark:text-green-400 font-medium',
  danger: 'text-rose-600 dark:text-rose-400 font-medium',
  idle: 'text-slate-500 dark:text-neutral-400 font-medium',
} as const;

const TAG_TONE_CLASS = {
  waiting:
    'bg-amber-50 text-amber-700 border-amber-300/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-600/30',
  active:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-600/30',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-300/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-600/30',
  danger:
    'bg-rose-50 text-rose-700 border-rose-300/70 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-600/30',
  idle:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#262626] dark:text-neutral-300 dark:border-neutral-700',
} as const;

export type StatusTone = keyof typeof TEXT_TONE_CLASS;

export interface StatusLabel {
  label: string;
  tone: StatusTone;
}

export function StatusPill({
  label,
  tone,
  variant = 'text',
  className,
}: StatusLabel & {
  variant?: 'text' | 'tag';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center text-xs whitespace-nowrap',
        variant === 'tag'
          ? cn(
              'px-2.5 py-0.5 rounded-md border font-semibold',
              TAG_TONE_CLASS[tone],
            )
          : cn('font-medium', TEXT_TONE_CLASS[tone]),
        className,
      )}
    >
      {label}
    </span>
  );
}
