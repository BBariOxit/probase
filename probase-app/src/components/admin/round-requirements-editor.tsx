'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  useRoundRequirements,
  useSetRoundRequirements,
} from '@/lib/api/master-data';
import type { RegistrationRound, SubmissionRequirement } from '@/lib/api/types';
import { DateField } from '@/components/shared/date-field';
import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const SUGGESTED = ['Đề cương', 'Báo cáo tiến độ', 'Toàn văn & Slide', 'Mã nguồn'];

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
    // Default due date: if round has officialEndDate, suggest 7 days before
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
      const next = await save.mutateAsync({
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
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Danh mục bài phải nộp
          </h3>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {rows.length}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => add()}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <Plus className="size-3.5" />
          Thêm mốc nộp bài
        </Button>
      </div>

      <FormError message={error} />

      {duplicated && (
        <p className="text-xs font-medium text-destructive">
          Có tên bài nộp bị trùng lặp. Vui lòng đặt tên phân biệt.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center space-y-3 bg-muted/10">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Chưa có mốc nộp bài nào
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Thêm các mốc nộp đề cương, báo cáo tiến độ hoặc khóa luận để sinh viên và giảng viên theo dõi.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground mr-1">Thêm nhanh:</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium cursor-pointer"
              onClick={() => add('Đề cương chi tiết (M03)')}
            >
              + Đề cương (M03)
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium cursor-pointer"
              onClick={() => add('Báo cáo tiến độ 1')}
            >
              + Báo cáo tiến độ 1
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium cursor-pointer"
              onClick={() => add('Báo cáo toàn văn & Slide')}
            >
              + Toàn văn & Slide
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium cursor-pointer"
              onClick={() => add('Mã nguồn')}
            >
              + Mã nguồn
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, index) => (
            <div
              key={row.id ?? `new-${index}`}
              className="group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-border transition-all shadow-2xs"
            >
              {/* Index & Name */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <Input
                  placeholder="Tên bài nộp (ví dụ: Đề cương chi tiết)..."
                  value={row.name}
                  onChange={(e) => patch(index, { name: e.target.value })}
                  className="h-9 text-sm bg-background/60"
                />
              </div>

              {/* Due Date */}
              <div className="w-full sm:w-44 shrink-0">
                <DateField
                  id={`req-due-${round.id}-${index}`}
                  label=""
                  value={row.due}
                  onChange={(due) => patch(index, { due })}
                  className="h-9 text-xs bg-background/60"
                />
              </div>

              {/* Required toggle & Delete button */}
              <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => patch(index, { isRequired: !row.isRequired })}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer border select-none',
                    row.isRequired
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      : 'bg-muted text-muted-foreground border-border/60 hover:text-foreground'
                  )}
                  title="Nhấn để chuyển đổi giữa Bắt buộc và Tùy chọn"
                >
                  {row.isRequired ? 'Bắt buộc' : 'Tùy chọn'}
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Xóa mốc nộp này"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Quick add chips */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Gợi ý thêm:</span>
              {SUGGESTED.filter((s) => !rows.some((r) => r.name.includes(s))).map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => add(name)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2 py-0.5 rounded-md border border-border/40 transition-colors cursor-pointer"
                  >
                    <Plus className="size-3" />
                    {name}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
