'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { GripVertical, Loader2, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  useRoundRequirements,
  useSetRoundRequirements,
} from '@/lib/api/master-data';
import type { RegistrationRound, SubmissionRequirement } from '@/lib/api/types';
import { FormError } from '@/components/shared/form-error';
import { cn } from '@/lib/utils';

export interface RoundRequirementsEditorRef {
  submit: () => Promise<boolean>;
  hasChanges: boolean;
  isValid: boolean;
}

interface Row {
  id?: number;
  name: string;
  due: string;
  isRequired: boolean;
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function toRow(requirement: SubmissionRequirement): Row {
  return {
    id: requirement.id,
    name: requirement.name,
    due: toDateInput(requirement.dueAt),
    isRequired: requirement.isRequired,
  };
}

export const RoundRequirementsEditor = forwardRef<
  RoundRequirementsEditorRef,
  {
    round: RegistrationRound;
    onDirtyChange?: (isDirty: boolean) => void;
  }
>(function RoundRequirementsEditor({ round, onDirtyChange }, ref) {
  const { data, isPending } = useRoundRequirements(round.id);
  const save = useSetRoundRequirements();
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = draft ?? data?.map(toRow) ?? [];
  const hasChanges = draft !== null;

  function edit(next: Row[]) {
    setDraft(next);
    onDirtyChange?.(true);
  }

  function patch(index: number, changes: Partial<Row>) {
    edit(
      rows.map((row, at) => (at === index ? { ...row, ...changes } : row)),
    );
  }

  function add(name = '') {
    let defaultDue = '';
    if (round.officialEndDate) {
      defaultDue = round.officialEndDate.slice(0, 10);
    }
    edit([...rows, { name, due: defaultDue, isRequired: true }]);
  }

  function remove(index: number) {
    edit(rows.filter((_, at) => at !== index));
  }

  const problems = rows.flatMap((row, index) => {
    if (row.name.trim() === '') return [`Mục ${index + 1}: chưa có tên.`];
    if (row.due === '') return [`"${row.name || `Mục ${index + 1}`}" chưa có hạn nộp.`];
    return [];
  });

  const duplicated =
    new Set(rows.map((row) => row.name.trim().toLowerCase())).size !==
    rows.length;

  const isValid = problems.length === 0 && !duplicated;

  async function submitInternal(): Promise<boolean> {
    if (!isValid) return false;
    setError(null);

    try {
      await save.mutateAsync({
        roundId: round.id,
        requirements: rows.map((row) => ({
          id: row.id,
          name: row.name.trim(),
          dueAt: new Date(row.due).toISOString(),
          isRequired: row.isRequired,
        })),
      });

      setDraft(null);
      onDirtyChange?.(false);
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
      return false;
    }
  }

  useImperativeHandle(ref, () => ({
    submit: submitInternal,
    hasChanges,
    isValid,
  }));

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Danh mục bài nộp */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
          Danh mục bài phải nộp
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
            {rows.length}
          </span>
        </h3>

        {/* Nút thêm mốc nộp bài - Màu chủ đạo primary */}
        <button
          type="button"
          onClick={() => add()}
          className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="size-3.5" />
          Thêm mốc nộp bài
        </button>
      </div>

      <FormError message={error} />

      {duplicated && (
        <p className="text-xs font-medium text-destructive">
          Có tên bài nộp bị trùng lặp. Vui lòng đặt tên phân biệt.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-600 p-8 text-center space-y-1 bg-slate-50/50 dark:bg-[#181818]">
          <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
            Chưa có mốc nộp bài nào
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
            Nhấn &ldquo;Thêm mốc nộp bài&rdquo; để thiết lập các hạn nộp tài liệu cho đợt này.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className="flex items-center gap-3">
              <span className="cursor-grab text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 shrink-0">
                <GripVertical className="h-4 w-4" />
              </span>

              {/* Ô nhập tên bài (flex-1) - Khoét lõm #141414, viền border-neutral-700 */}
              <input
                value={row.name}
                onChange={(e) => patch(index, { name: e.target.value })}
                placeholder="Tên tài liệu / bài nộp (ví dụ: Đề cương chi tiết)..."
                className="h-9 flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary"
              />

              {/* Ô chọn hạn nộp (w-40) - Khoét lõm #141414, viền border-neutral-700 */}
              <input
                type="date"
                value={row.due}
                onChange={(e) => patch(index, { due: e.target.value })}
                className="h-9 w-40 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary"
              />

              {/* Nút Bắt buộc (Pill Tag) */}
              <button
                type="button"
                onClick={() => patch(index, { isRequired: !row.isRequired })}
                className={cn(
                  'h-8 shrink-0 text-xs font-medium px-2.5 py-1 transition cursor-pointer select-none rounded-md',
                  row.isRequired
                    ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#262626] dark:text-neutral-200 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-[#333333]'
                    : 'border border-transparent bg-transparent text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#262626]/40',
                )}
                title="Nhấn để chuyển đổi giữa Bắt buộc và Tùy chọn"
              >
                {row.isRequired ? 'Bắt buộc' : 'Tùy chọn'}
              </button>

              {/* Nút xóa (Icon dạng trần, không viền) */}
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1 text-slate-400 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition cursor-pointer"
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
});
