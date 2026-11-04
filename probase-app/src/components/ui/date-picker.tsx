'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }

  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { date, iso };
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function MiniCalendar({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (date: Date) => void;
}) {
  const [viewDate, setViewDate] = React.useState<Date>(() => selected || new Date());

  React.useEffect(() => {
    if (selected && !isNaN(selected.getTime())) {
      setViewDate(selected);
    }
  }, [selected]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  const isSameDay = (d1: Date, d2?: Date) =>
    d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  return (
    <div className="p-3 w-64 select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 transition cursor-pointer"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100">
          Tháng {month + 1}, {year}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 transition cursor-pointer"
          aria-label="Tháng sau"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const isSelected = isSameDay(cell.date, selected);
          const isCurrentToday = isSameDay(cell.date, today);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(cell.date)}
              className={cn(
                'size-8 text-xs rounded-lg flex items-center justify-center transition cursor-pointer',
                cell.isCurrentMonth
                  ? 'text-slate-900 dark:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800'
                  : 'text-slate-300 dark:text-neutral-600 hover:bg-slate-50 dark:hover:bg-neutral-800/40',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary/90 dark:text-white font-bold shadow-xs',
                isCurrentToday && !isSelected && 'border border-primary font-bold text-primary',
              )}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
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
      if (value) {
        setText(toDisplayDate(value));
      } else {
        setText('');
        onChange('');
      }
      setHasError(false);
    }
  }

  function handleSelectDate(date: Date) {
    const iso = formatIso(date);
    const display = toDisplayDate(iso);
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
          className="w-auto p-0 rounded-xl bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-neutral-800 shadow-xl"
          align="start"
          sideOffset={4}
        >
          <MiniCalendar
            selected={calendarDate}
            onSelect={handleSelectDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
