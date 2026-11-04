'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from '@/hooks/use-pagination';

/**
 * Hàm thuần tính dãy số trang rút gọn:
 * - Luôn hiện trang đầu (1), trang cuối (total), trang hiện tại (current) và 1 trang mỗi bên.
 * - Khoảng trống thay bằng 'ellipsis'.
 * - Nếu tổng số trang <= 7 thì hiển thị đầy đủ.
 */
export function getPageRange(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 0) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const safeCurrent = Math.max(1, Math.min(total, current));
  const start = Math.max(2, safeCurrent - 1);
  const end = Math.min(total - 1, safeCurrent + 1);

  const range: (number | 'ellipsis')[] = [1];

  if (start > 2) {
    range.push('ellipsis');
  }

  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  if (end < total - 1) {
    range.push('ellipsis');
  }

  range.push(total);

  return range;
}

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemName?: string;
}

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemName = 'mục',
}: PaginationBarProps) {
  const [jumpPage, setJumpPage] = useState('');

  if (totalPages <= 1 && (!total || total === 0) && !onPageSizeChange) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const from = pageSize && total !== undefined && total > 0 ? (page - 1) * pageSize + 1 : undefined;
  const to = pageSize && total !== undefined && total > 0 ? Math.min(page * pageSize, total) : undefined;

  const pages = getPageRange(page, safeTotalPages);

  const handleJump = () => {
    const trimmed = jumpPage.trim();
    if (!trimmed) return;
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) {
      setJumpPage('');
      return;
    }
    const clamped = Math.max(1, Math.min(safeTotalPages, num));
    setJumpPage('');
    if (clamped !== page) {
      onPageChange(clamped);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 text-sm select-none">
      {/* Bên trái: "Hiển thị x-y trong số z" */}
      <div className="text-xs text-slate-500 dark:text-neutral-400">
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

      {/* Bên phải: dropdown số dòng/trang, các nút phân trang và ô "Đến trang" */}
      <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
        {/* Dropdown số dòng/trang */}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Số dòng:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[92px] text-xs bg-white dark:bg-[#1e1e1e] border-[#d1d5e0] dark:border-neutral-700 font-medium cursor-pointer shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[100px]">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs cursor-pointer">
                    {opt} / trang
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Các nút bấm phân trang: « ‹ 1 2 3 … › » */}
        <div className="flex items-center gap-1">
          {/* Nút về trang đầu («) */}
          <button
            type="button"
            aria-label="Trang đầu"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            className="size-8 rounded-lg border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
          >
            <ChevronsLeft className="size-4" />
          </button>

          {/* Nút trang trước (‹) */}
          <button
            type="button"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="size-8 rounded-lg border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Dãy số trang rút gọn */}
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
                    : 'border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] text-slate-700 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40',
                )}
              >
                {p}
              </button>
            ),
          )}

          {/* Nút trang sau (›) */}
          <button
            type="button"
            aria-label="Trang sau"
            disabled={page >= safeTotalPages}
            onClick={() => onPageChange(page + 1)}
            className="size-8 rounded-lg border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Nút về trang cuối (») */}
          <button
            type="button"
            aria-label="Trang cuối"
            disabled={page >= safeTotalPages}
            onClick={() => onPageChange(safeTotalPages)}
            className="size-8 rounded-lg border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>

        {/* Ô "Đến trang": chỉ hiển thị khi tổng số trang > 7, ẩn trên mobile nếu thiếu chỗ */}
        {safeTotalPages > 7 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400 pl-1 border-l border-slate-200 dark:border-neutral-700">
            <span>Đến trang</span>
            <Input
              type="number"
              min={1}
              max={safeTotalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJump();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={handleJump}
              placeholder={String(page)}
              className="h-8 w-16 px-1.5 text-center text-xs rounded-lg border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
              aria-label="Đến trang số"
            />
          </div>
        )}
      </div>
    </div>
  );
}
