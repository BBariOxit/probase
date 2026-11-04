'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
  id?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Chọn ngày',
  disabled = false,
  className,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-10 w-full justify-start text-left font-normal border-[1.5px] border-input rounded-lg px-3 transition-colors',
              'hover:bg-muted/40 hover:text-foreground',
              'focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-ring',
              error && 'border-destructive ring-2 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
              !value && 'text-muted-foreground/80 dark:text-neutral-400 font-normal',
              className,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        {value ? (
          <span className="text-foreground">{format(value, 'dd/MM/yyyy')}</span>
        ) : (
          <span className="text-muted-foreground/80 dark:text-neutral-400">
            {placeholder}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          locale={vi}
          weekStartsOn={1}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
