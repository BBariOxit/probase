'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from '@/hooks/use-pagination';

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemName = 'mục',
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemName?: string;
}) {
  if (totalPages <= 1 && (!total || total === 0) && !onPageSizeChange) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const from = pageSize && total !== undefined && total > 0 ? (page - 1) * pageSize + 1 : undefined;
  const to = pageSize && total !== undefined && total > 0 ? Math.min(page * pageSize, total) : undefined;

  // Tính danh sách các trang cần hiển thị (ví dụ 1, 2, 3...)
  const pages: (number | 'ellipsis')[] = [];
  if (safeTotalPages <= 7) {
    for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(safeTotalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < safeTotalPages - 2) pages.push('ellipsis');
    pages.push(safeTotalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 pb-1 text-sm select-none">
      {/* Thông tin số lượng hiển thị + dropdown chọn số hàng/trang (bên trái) */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
        <div>
          {from !== undefined && to !== undefined && total !== undefined && total > 0 ? (
            <>
              Hiển thị{' '}
              <strong className="font-semibold text-slate-800 dark:text-neutral-200">
                {from}–{to}
              </strong>{' '}
              trong số <strong className="text-primary font-bold">{total}</strong> {itemName}
            </>
          ) : total !== undefined ? (
            <>
              Tổng cộng: <strong className="text-primary font-bold">{total}</strong> {itemName}
            </>
          ) : (
            <span>
              Trang {page} / {safeTotalPages}
            </span>
          )}
        </div>

        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-200 dark:border-neutral-700">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Số hàng:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-7 w-[96px] text-xs bg-white dark:bg-[#1a1d26] border-slate-300 dark:border-neutral-700 font-medium cursor-pointer shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[100px]">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs cursor-pointer">
                    {opt} / trang
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Các nút bấm phân trang sử dụng màu Primary (bên phải) */}
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-8 rounded-lg border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1a1d26] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
        >
          <ChevronLeft className="size-4" />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span
              key={'ellipsis-' + idx}
              className="size-8 flex items-center justify-center text-slate-400 dark:text-neutral-500 select-none"
            >
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'size-8 rounded-lg text-xs font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer',
                p === page
                  ? 'bg-primary text-white border border-primary font-bold shadow-xs'
                  : 'border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1a1d26] text-slate-700 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Trang sau"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-8 rounded-lg border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1a1d26] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
