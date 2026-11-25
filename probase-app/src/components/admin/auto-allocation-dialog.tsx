'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import {
  useAutoAllocationPreview,
  useBatchPlaceStudents,
} from '@/lib/api/allocation';
import type {
  AllocationDesk,
  AutoAllocateStrategy,
  AutoAllocationPreview,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { FormError } from '@/components/shared/form-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STRATEGY_LABELS: Record<AutoAllocateStrategy, string> = {
  FILL_EXISTING: 'Lấp đầy nhóm sẵn có trước (gom cùng lớp)',
  BALANCE_LECTURER: 'Cân bằng số lượng theo giảng viên hướng dẫn',
};

export function AutoAllocationDialog({
  roundId,
  desk,
  selectedStudentIds,
  onCommitted,
}: {
  roundId: number;
  desk: AllocationDesk;
  selectedStudentIds: number[];
  onCommitted: () => void;
}) {
  const previewMutation = useAutoAllocationPreview();
  const batchPlace = useBatchPlaceStudents();

  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] =
    useState<AutoAllocateStrategy>('FILL_EXISTING');
  const [allowCrossMajor, setAllowCrossMajor] = useState(false);
  const [onlySelected, setOnlySelected] = useState(false);
  const [preview, setPreview] = useState<AutoAllocationPreview | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const hasSelected = selectedStudentIds.length > 0;
  const effectiveOnlySelected = hasSelected && onlySelected;

  const selectedMatches = useMemo(
    () =>
      preview?.matched.filter((item) => checkedIds.has(item.student.id)) ?? [],
    [preview, checkedIds],
  );

  if (!desk.canPlace || desk.students.length === 0) return null;

  function openDialog() {
    setError(null);
    setPreview(null);
    setCheckedIds(new Set());
    setOnlySelected(hasSelected);
    setOpen(true);
  }

  async function runPreview() {
    setError(null);
    try {
      const result = await previewMutation.mutateAsync({
        roundId,
        strategy,
        allowCrossMajor,
        ...(effectiveOnlySelected && { studentIds: selectedStudentIds }),
      });
      setPreview(result);
      setCheckedIds(new Set(result.matched.map((item) => item.student.id)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không tạo được gợi ý phân bổ.',
      );
    }
  }

  function toggleStudent(studentId: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function commit() {
    if (selectedMatches.length === 0) return;
    setError(null);
    try {
      const res = await batchPlace.mutateAsync({
        roundId,
        placements: selectedMatches.map((item) => ({
          studentId: item.student.id,
          topicId: item.topic.id,
        })),
      });
      toast.success(res.message);
      setOpen(false);
      setPreview(null);
      onCommitted();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không lưu được kết quả phân bổ tự động.',
      );
    }
  }

  const busy = previewMutation.isPending || batchPlace.isPending;

  return (
    <>
      <Button
        variant="outline"
        className="h-9.5 px-3.5 border-[1.5px] border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold shadow-2xs gap-2 cursor-pointer"
        disabled={desk.topics.length === 0}
        onClick={openDialog}
      >
        <Sparkles className="size-4" />
        <span>Phân bổ tự động</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>Phân bổ tự động (Xem trước trước khi lưu)</span>
            </DialogTitle>
            <DialogDescription>
              {desk.round.projectType.name} · {desk.round.semester.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <FormError message={error} />

            {/* Tuỳ chọn thuật toán */}
            <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/50 p-3.5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="auto-strategy" className="text-xs font-semibold">
                    Chiến lược ưu tiên
                  </Label>
                  <Select
                    value={strategy}
                    onValueChange={(value) => {
                      setStrategy(value as AutoAllocateStrategy);
                      setPreview(null);
                    }}
                  >
                    <SelectTrigger id="auto-strategy" className="h-9">
                      <SelectValue>
                        {(val) => STRATEGY_LABELS[val as AutoAllocateStrategy]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FILL_EXISTING">
                        {STRATEGY_LABELS.FILL_EXISTING}
                      </SelectItem>
                      <SelectItem value="BALANCE_LECTURER">
                        {STRATEGY_LABELS.BALANCE_LECTURER}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  onClick={runPreview}
                  disabled={busy}
                  className="h-9 gap-1.5 cursor-pointer"
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  <span>{preview ? 'Tính lại gợi ý' : 'Xem trước gợi ý'}</span>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={allowCrossMajor}
                    onCheckedChange={(checked) => {
                      setAllowCrossMajor(Boolean(checked));
                      setPreview(null);
                    }}
                  />
                  <span>
                    Cho phép ghép khác chuyên ngành nếu hết đề tài cùng chuyên ngành
                  </span>
                </label>

                {hasSelected && (
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={effectiveOnlySelected}
                      onCheckedChange={(checked) => {
                        setOnlySelected(Boolean(checked));
                        setPreview(null);
                      }}
                    />
                    <span>
                      Chỉ xếp {selectedStudentIds.length} sinh viên đang chọn
                    </span>
                  </label>
                )}
              </div>
            </div>

            {preview && (
              <div className="space-y-3">
                {/* Tóm tắt kết quả gợi ý */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Ghép được: {preview.summary.matchedCount} SV
                  </Badge>
                  {preview.summary.crossMajorCount > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-400/70 text-amber-600 dark:text-amber-400"
                    >
                      <TriangleAlert className="size-3.5" />
                      Khác chuyên ngành: {preview.summary.crossMajorCount} SV
                    </Badge>
                  )}
                  {preview.summary.unmatchedCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      Chưa ghép được: {preview.summary.unmatchedCount} SV
                    </Badge>
                  )}
                  {preview.summary.unopenedTopics > 0 && (
                    <span className="text-muted-foreground">
                      (Còn {preview.summary.unopenedTopics} đề tài đã duyệt chưa mở đăng ký ·{' '}
                      {preview.summary.unopenedSeats} chỗ)
                    </span>
                  )}
                </div>

                {/* Danh sách đề xuất ghép */}
                {preview.matched.length > 0 && (
                  <div className="rounded-lg border border-slate-200 dark:border-neutral-700 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-100/70 dark:bg-neutral-800/70 border-b border-slate-200 dark:border-neutral-700 text-xs font-semibold">
                      <span>
                        Đề xuất phân bổ ({selectedMatches.length}/{preview.matched.length})
                      </span>
                      <button
                        type="button"
                        className="text-primary hover:underline cursor-pointer"
                        onClick={() =>
                          setCheckedIds(
                            checkedIds.size === preview.matched.length
                              ? new Set()
                              : new Set(
                                  preview.matched.map((item) => item.student.id),
                                ),
                          )
                        }
                      >
                        {checkedIds.size === preview.matched.length
                          ? 'Bỏ chọn tất cả'
                          : 'Chọn tất cả'}
                      </button>
                    </div>
                    <ul className="max-h-60 divide-y divide-slate-100 dark:divide-neutral-800 overflow-y-auto">
                      {preview.matched.map((item) => {
                        const checked = checkedIds.has(item.student.id);
                        return (
                          <li key={item.student.id}>
                            <label
                              className={cn(
                                'flex items-start gap-3 px-3 py-2.5 text-xs cursor-pointer hover:bg-slate-50/70 dark:hover:bg-neutral-800/40',
                                !checked && 'opacity-55',
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  toggleStudent(item.student.id)
                                }
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                                    {item.student.fullName}
                                  </span>
                                  <span className="font-mono text-primary font-semibold">
                                    {item.student.studentCode}
                                  </span>
                                  {item.student.major && (
                                    <Badge
                                      variant="outline"
                                      className="h-4 px-1.5 text-[10px]"
                                    >
                                      {item.student.major.code}
                                    </Badge>
                                  )}
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-medium text-slate-800 dark:text-neutral-200 truncate">
                                    {item.topic.title}
                                  </span>
                                  {item.topic.major && (
                                    <Badge
                                      variant="secondary"
                                      className="h-4 px-1.5 text-[10px]"
                                    >
                                      {item.topic.major.code}
                                    </Badge>
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    'text-[11px]',
                                    item.matchType === 'CROSS_MAJOR'
                                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  {item.reason} · GV:{' '}
                                  {item.topic.lecturer.academicTitle
                                    ? `${item.topic.lecturer.academicTitle} ${item.topic.lecturer.fullName}`
                                    : item.topic.lecturer.fullName}
                                </p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Sinh viên chưa ghép được */}
                {preview.unmatched.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 overflow-hidden">
                    <div className="px-3 py-2 border-b border-destructive/20 text-xs font-semibold text-destructive">
                      Chưa thể ghép tự động ({preview.unmatched.length})
                    </div>
                    <ul className="max-h-36 divide-y divide-destructive/10 overflow-y-auto px-3 py-1 text-xs">
                      {preview.unmatched.map((item) => (
                        <li
                          key={item.student.id}
                          className="py-1.5 flex flex-wrap items-center justify-between gap-2"
                        >
                          <span>
                            <span className="font-semibold">
                              {item.student.fullName}
                            </span>{' '}
                            <span className="font-mono text-primary">
                              {item.student.studentCode}
                            </span>
                            {item.student.major && ` (${item.student.major.code})`}
                          </span>
                          <span className="text-muted-foreground">
                            {item.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              Đóng
            </Button>
            {preview && (
              <Button
                type="button"
                disabled={selectedMatches.length === 0 || busy}
                onClick={commit}
                className="gap-1.5 cursor-pointer"
              >
                {batchPlace.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                <span>Áp dụng phân bổ ({selectedMatches.length} SV)</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

