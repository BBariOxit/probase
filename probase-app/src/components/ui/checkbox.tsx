import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      onChange,
      onCheckedChange,
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const isChecked = checked !== undefined ? checked : defaultChecked;

    return (
      <label
        htmlFor={id}
        className={cn(
          'relative inline-flex items-center justify-center size-4 shrink-0 rounded-[4px] border transition-colors select-none',
          isChecked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900',
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:border-slate-400 dark:hover:border-neutral-600',
          className,
        )}
      >
        <input
          id={id}
          ref={ref}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className="peer sr-only"
          {...props}
        />
        {isChecked && <Check className="size-3 stroke-[3]" />}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
