'use client';

import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
  id?: string;
  value?: string; // ISO 'yyyy-MM-dd' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  error?: boolean;
}

function toDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const clean = iso.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function parseDisplayDate(ddmmyyyy: string): { date: Date; iso: string } | null {
  if (ddmmyyyy.length !== 10) return null;
  const [dStr, mStr, yStr] = ddmmyyyy.split('/');
  if (!dStr || !mStr || !yStr || yStr.length !== 4) return null;

  const d = parseInt(dStr, 10);
  const m = parseInt(mStr, 10);
  const y = parseInt(yStr, 10);

  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (y < 1900 || y > 2100) return null;

  const parsed = parse(ddmmyyyy, 'dd/MM/yyyy', new Date());
  if (!isValid(parsed)) return null;
  if (format(parsed, 'dd/MM/yyyy') !== ddmmyyyy) return null;

  return {
    date: parsed,
    iso: format(parsed, 'yyyy-MM-dd'),
  };
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  disabled = false,
  className,
  invalid = false,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(() => toDisplayDate(value));
  const [hasError, setHasError] = React.useState(false);
  const isDeletingRef = React.useRef(false);

  React.useEffect(() => {
    setText(toDisplayDate(value));
    setHasError(false);
  }, [value]);

  const calendarDate = React.useMemo(() => {
    if (text && text.length === 10) {
      const res = parseDisplayDate(text);
      if (res) return res.date;
    }
    if (value) {
      const res = parseDisplayDate(toDisplayDate(value));
      if (res) return res.date;
    }
    return undefined;
  }, [text, value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      isDeletingRef.current = true;
    } else {
      isDeletingRef.current = false;
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const isDeleting = isDeletingRef.current;
    const raw = e.target.value;

    const digits = raw.replace(/\D/g, '').slice(0, 8);

    let formatted = '';
    if (isDeleting) {
      if (digits.length <= 2) {
        formatted = digits;
      } else if (digits.length <= 4) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      } else {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      }
    } else {
      if (digits.length === 0) {
        formatted = '';
      } else if (digits.length === 1) {
        formatted = digits;
      } else if (digits.length === 2) {
        formatted = `${digits}/`;
      } else if (digits.length === 3) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      } else if (digits.length === 4) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}/`;
      } else {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      }
    }

    setText(formatted);

    if (formatted.length === 10) {
      const res = parseDisplayDate(formatted);
      if (res) {
        setHasError(false);
        onChange(res.iso);
      } else {
        setHasError(true);
      }
    } else {
      setHasError(false);
    }
  }

  function handleBlur() {
    if (!text || text.trim() === '') {
      setText('');
      setHasError(false);
      if (value) onChange('');
      return;
    }

    const res = parseDisplayDate(text);
    if (res) {
      setHasError(false);
      onChange(res.iso);
    } else {
      // Incomplete or invalid date: restore previous valid date or clear
      if (value) {
        setText(toDisplayDate(value));
      } else {
        setText('');
        onChange('');
      }
      setHasError(false);
    }
  }

  function handleSelectDate(date: Date | undefined) {
    if (!date) return;
    const display = format(date, 'dd/MM/yyyy');
    const iso = format(date, 'yyyy-MM-dd');
    setText(display);
    setHasError(false);
    onChange(iso);
    setOpen(false);
  }

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          'h-9 w-full rounded-lg border-[1.5px] border-[#c4c9d9] bg-white pr-9 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]',
          'dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary disabled:opacity-50',
          (hasError || invalid || error) &&
            'border-destructive ring-1 ring-destructive dark:border-destructive dark:ring-destructive',
        )}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              tabIndex={-1}
              aria-label="Mở lịch chọn ngày"
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition cursor-pointer disabled:pointer-events-none disabled:opacity-40"
            >
              <CalendarIcon className="size-4" />
            </button>
          }
        />
        <PopoverContent
          className="w-auto p-2 rounded-xl bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-neutral-800 shadow-xl"
          align="start"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={calendarDate}
            defaultMonth={calendarDate || new Date()}
            onSelect={handleSelectDate}
            locale={vi}
            weekStartsOn={1}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
