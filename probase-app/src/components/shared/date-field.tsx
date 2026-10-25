'use client';

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
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  className?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}

      <Input
        id={id}
        type="date"
        className={className}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />

      {/*
        Parsed as a plain calendar day rather than through `new Date(value)`,
        which reads `yyyy-mm-dd` as UTC midnight and can render the day before
        for anybody east of Greenwich — which is everybody here.
      */}
      {value && <p className="text-xs text-muted-foreground">{spell(value)}</p>}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function spell(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';

  return readable.format(new Date(year, month - 1, day));
}
