'use client';

import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BulkActionBarProps {
  count: number;
  itemName: string;
  onClear: () => void;
  variant?: 'inline' | 'floating';
  children: ReactNode;
}

export function BulkActionBar({
  count,
  itemName,
  onClear,
  variant = 'inline',
  children,
}: BulkActionBarProps) {
  if (count <= 0) return null;

  if (variant === 'floating') {
    return (
      <TooltipProvider delay={150}>
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div
            role="region"
            aria-label="Thao tác hàng loạt"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#18181b] px-3 py-1.5 text-neutral-100 shadow-2xl shadow-black/25 dark:border-neutral-700 dark:bg-[#242429] animate-in fade-in slide-in-from-bottom-3 duration-150"
          >
            <div className="flex items-center gap-2 pl-0.5 pr-1.5 text-xs font-semibold whitespace-nowrap">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white tabular-nums">
                {count}
              </span>
              <span>đã chọn {itemName}</span>
            </div>

            <span className="h-4 w-px bg-neutral-700" aria-hidden="true" />

            <div className="flex items-center gap-1">{children}</div>

            <span className="h-4 w-px bg-neutral-700" aria-hidden="true" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClear}
                    aria-label="Bỏ chọn"
                    className="size-8 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
                  />
                }
              >
                <X className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Bỏ chọn
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-2.5">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-slate-900 dark:text-neutral-100">
          Đã chọn{' '}
          <span className="text-primary tabular-nums">{count}</span>{' '}
          {itemName}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100 underline underline-offset-2 cursor-pointer"
        >
          Bỏ chọn
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const TONE_CLASS: Record<
  'default' | 'primary' | 'danger' | 'warning',
  string
> = {
  default: 'text-neutral-200 hover:bg-neutral-800 hover:text-white',
  primary: 'text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300',
  danger: 'text-rose-400 hover:bg-rose-500/20 hover:text-rose-300',
  warning: 'text-amber-400 hover:bg-amber-500/20 hover:text-amber-300',
};

export function BulkIconAction({
  label,
  icon,
  loading = false,
  disabled = false,
  tone = 'default',
  onClick,
}: {
  label: string;
  icon: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'warning';
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled || loading}
            onClick={onClick}
            aria-label={label}
            className={cn(
              'size-8 rounded-full transition-colors cursor-pointer disabled:opacity-40',
              TONE_CLASS[tone],
            )}
          />
        }
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

