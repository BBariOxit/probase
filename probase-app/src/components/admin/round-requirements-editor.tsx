'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

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

  const duplicated =
    new Set(
      requirements
        .map((row) => row.name.trim().toLowerCase())
        .filter(Boolean),
    ).size !== requirements.filter((row) => row.name.trim() !== '').length;

  return (
    <div className="space-y-4">
      {/* Header Danh mục bài nộp */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
          Danh mục bài phải nộp
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
            {requirements.length}
          </span>
        </h3>

        {/* Nút thêm mốc nộp bài - Màu chủ đạo primary */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => add()}
          className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="size-3.5" />
          Thêm mốc nộp bài
        </button>
      </div>

      {duplicated && (
        <p className="text-xs font-medium text-destructive">
          Có tên bài nộp bị trùng lặp. Vui lòng đặt tên phân biệt.
        </p>
      )}

      {requirements.length === 0 ? (
        <div className="rounded-xl border-[1.5px] border-dashed border-[#b0b8cc] dark:border-neutral-600 p-8 text-center space-y-1 bg-slate-50/50 dark:bg-[#181818]">
          <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
            Chưa có mốc nộp bài nào
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
            Nhấn &ldquo;Thêm mốc nộp bài&rdquo; để thiết lập các hạn nộp tài liệu cho đợt này.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((row, index) => (
            <div key={row.id ?? `req-${index}`} className="flex items-center gap-3">
              <span className="cursor-grab text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 shrink-0">
                <GripVertical className="h-4 w-4" />
              </span>

              {/* Ô nhập tên bài (flex-1) */}
              <input
                id={`req-name-${typeId}-${index}`}
                value={row.name}
                disabled={disabled}
                onChange={(e) => patch(index, { name: e.target.value })}
                placeholder="Tên tài liệu / bài nộp (ví dụ: Đề cương chi tiết)..."
                className="h-9 flex-1 min-w-0 rounded-lg border-[1.5px] border-[#c4c9d9] bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary disabled:opacity-50"
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
                  'h-8 shrink-0 text-xs font-medium px-2.5 py-1 transition cursor-pointer select-none rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
                  row.isRequired
                    ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#262626] dark:text-neutral-200 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-[#333333]'
                    : 'border border-transparent bg-transparent text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#262626]/40',
                )}
                title="Nhấn để chuyển đổi giữa Bắt buộc và Tùy chọn"
              >
                {row.isRequired ? 'Bắt buộc' : 'Tùy chọn'}
              </button>

              {/* Nút xóa */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(index)}
                className="p-1 text-slate-400 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Xóa mốc nộp này"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
