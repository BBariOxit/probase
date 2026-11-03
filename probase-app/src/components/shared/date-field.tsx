'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const readable = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function DateField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled = false,
  invalid = false,
  error,
  className,
  showWeekday = false,
}: {
  id: string;
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  className?: string;
  showWeekday?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className="text-xs font-medium text-slate-800 dark:text-neutral-300">
          {label}
        </Label>
      )}
      {hint && <p className="-mt-1 text-xs text-slate-500 dark:text-neutral-400">{hint}</p>}

      <Input
        id={id}
        type="date"
        className={cn(
          'text-sm h-9 rounded-lg border border-slate-300 bg-white text-slate-900 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          'dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary disabled:opacity-50',
          className,
        )}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />

      {showWeekday && value && (
        <p className="text-xs text-slate-500 dark:text-neutral-400">{spell(value)}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function spell(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';

  return readable.format(new Date(year, month - 1, day));
}
