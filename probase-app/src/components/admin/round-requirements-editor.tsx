'use client';

import {
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { DEFAULT_STANDARD_MILESTONES } from '@/constants';

export interface RequirementRow {
  id?: number;
  name: string;
  due: string;
  isRequired: boolean;
}

export function RoundRequirementsEditor({
  typeId,
  requirements,
  onChange,
  defaultDue,
  disabled,
}: {
  typeId: number;
  requirements: RequirementRow[];
  onChange: (requirements: RequirementRow[]) => void;
  defaultDue?: string;
  disabled?: boolean;
}) {
  function patch(index: number, changes: Partial<RequirementRow>) {
    onChange(
      requirements.map((row, at) => (at === index ? { ...row, ...changes } : row)),
    );
  }

  function add(name = '') {
    onChange([
      ...requirements,
      { name, due: defaultDue || '', isRequired: true },
    ]);
  }

  function remove(index: number) {
    onChange(requirements.filter((_, at) => at !== index));
  }

  function move(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= requirements.length) return;
    const next = [...requirements];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    onChange(next);
  }

  function applyPreset() {
    onChange(
      DEFAULT_STANDARD_MILESTONES.map((name) => ({
        name,
        due: defaultDue || '',
        isRequired: true,
      })),
    );
  }

  const nameCounts = new Map<string, number>();
  for (const r of requirements) {
    const trimmed = r.name.trim().toLowerCase();
    if (trimmed) {
      nameCounts.set(trimmed, (nameCounts.get(trimmed) ?? 0) + 1);
    }
  }

  const duplicated = Array.from(nameCounts.values()).some((c) => c > 1);

  return (
    <div className="space-y-4">
      {/* Header Danh mục bài nộp */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
          Danh mục bài phải nộp
          <span className="text-xs font-normal text-muted-foreground">
            ({requirements.length})
          </span>
        </h3>

        {requirements.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => add()}
              className="h-8 px-3 text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-xs cursor-pointer gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Thêm mốc nộp bài</span>
            </Button>
          </div>
        )}
      </div>

      {duplicated && (
        <p className="text-xs font-medium text-destructive">
          Có tên bài nộp bị trùng lặp. Vui lòng đặt tên phân biệt.
        </p>
      )}

      {requirements.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-slate-300 dark:border-neutral-700 p-8 text-center space-y-3 bg-slate-100 dark:bg-[#181818]">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-slate-200/80 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
              Chưa có mốc nộp bài nào
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={applyPreset}
              className="h-8 px-3.5 text-xs font-medium border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
            >
              Áp dụng mẫu
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => add()}
              className="h-8 px-3.5 text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-xs cursor-pointer gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Thêm mốc nộp bài</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requirements.map((row, index) => {
            const isRowDuplicate =
              row.name.trim() !== '' &&
              (nameCounts.get(row.name.trim().toLowerCase()) ?? 0) > 1;

            return (
              <div
                key={row.id ?? `req-${index}`}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] p-2 transition-colors"
              >
                {/* Thứ tự & nút di chuyển lên/xuống */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="size-6 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex flex-col -space-y-1 shrink-0">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      onClick={() => move(index, 'up')}
                      className="p-0.5 text-slate-400 hover:text-primary dark:text-neutral-500 dark:hover:text-primary transition disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === requirements.length - 1}
                      onClick={() => move(index, 'down')}
                      className="p-0.5 text-slate-400 hover:text-primary dark:text-neutral-500 dark:hover:text-primary transition disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ô nhập tên bài (flex-1) */}
                <input
                  id={`req-name-${typeId}-${index}`}
                  value={row.name}
                  disabled={disabled}
                  onChange={(e) => patch(index, { name: e.target.value })}
                  placeholder="Tên tài liệu / bài nộp (ví dụ: Đề cương chi tiết)..."
                  className={cn(
                    'h-9 flex-1 min-w-0 rounded-lg border-[1.5px] bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-[#121212] dark:hover:bg-[#141414] px-3 text-sm text-slate-900 dark:text-neutral-100 transition placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 shadow-xs',
                    isRowDuplicate
                      ? 'border-destructive focus:border-destructive'
                      : 'border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-500 focus:border-primary',
                  )}
                />

                {/* Ô chọn hạn nộp (w-44) - DatePicker dd/MM/yyyy */}
                <DatePicker
                  id={`req-due-${typeId}-${index}`}
                  value={row.due}
                  disabled={disabled}
                  onChange={(due) => patch(index, { due })}
                  className="w-44 shrink-0"
                  placeholder="dd/mm/yyyy"
                />

                {/* Nút Bắt buộc (Pill Tag) */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => patch(index, { isRequired: !row.isRequired })}
                  className={cn(
                    'h-8 shrink-0 text-xs font-medium px-2.5 py-1 transition cursor-pointer select-none rounded-md inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed',
                    row.isRequired
                      ? 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-neutral-800'
                      : 'bg-transparent text-slate-400 dark:text-neutral-500 border border-dashed border-slate-300 dark:border-neutral-700 hover:border-slate-400 hover:text-slate-600 dark:hover:text-neutral-300',
                  )}
                  title="Nhấn để chuyển đổi giữa Bắt buộc và Tùy chọn"
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full shrink-0',
                      row.isRequired ? 'bg-primary' : 'bg-slate-300 dark:bg-neutral-600',
                    )}
                  />
                  <span>{row.isRequired ? 'Bắt buộc' : 'Tùy chọn'}</span>
                </button>

                {/* Nút xóa */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => remove(index)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:bg-red-950/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Xóa mốc nộp này"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
