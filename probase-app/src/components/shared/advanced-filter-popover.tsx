'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface AdvancedFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  onReset: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  triggerClassName?: string;
  title?: string;
  applyLabel?: string;
  onApply?: () => void;
}

export function AdvancedFilterPopover({
  open,
  onOpenChange,
  activeCount,
  onReset,
  children,
  contentClassName = 'w-88 p-4 space-y-4 shadow-xl border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] rounded-xl',
  triggerClassName,
  title = 'Bộ lọc nâng cao',
  applyLabel = 'Xem kết quả',
  onApply,
}: AdvancedFilterPopoverProps) {
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && eventDetails?.reason === 'outside-press') {
          const target = eventDetails?.event?.target as HTMLElement | null;
          if (
            target?.closest?.('[data-combobox-content]') ||
            target?.closest?.('[data-combobox-trigger]') ||
            target?.closest?.('[data-slot="select-content"]') ||
            target?.closest?.('[data-slot="select-trigger"]')
          ) {
            return;
          }
        }
        onOpenChange(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={`h-9.5 px-3.5 rounded-lg border-[1.5px] transition-all cursor-pointer shadow-2xs ${
              activeCount > 0
                ? 'border-primary/50 bg-primary/8 text-primary font-semibold hover:bg-primary/12'
                : 'border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200'
            } ${triggerClassName ?? ''}`}
          />
        }
      >
        <SlidersHorizontal className="size-4 shrink-0" />
        <span>Bộ lọc</span>
        {activeCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold">
            {activeCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={8} className={contentClassName}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-900 dark:text-neutral-100">
            <SlidersHorizontal className="size-4 text-primary" />
            <span>{title}</span>
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="space-y-3">{children}</div>

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-end">
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-primary text-white hover:bg-primary/90 font-medium cursor-pointer"
            onClick={() => {
              onApply?.();
              onOpenChange(false);
            }}
          >
            {applyLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
