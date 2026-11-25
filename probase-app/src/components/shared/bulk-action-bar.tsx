'use client';

import type { ReactNode } from 'react';

interface BulkActionBarProps {
  count: number;
  itemName: string;
  onClear: () => void;
  children: ReactNode;
}

export function BulkActionBar({
  count,
  itemName,
  onClear,
  children,
}: BulkActionBarProps) {
  if (count <= 0) return null;

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
