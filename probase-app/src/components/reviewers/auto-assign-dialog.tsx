'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAutoAssignReviewers } from '@/lib/api/reviewers';
import type { AutoAssignResult } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AutoAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterId?: number;
  semesterName?: string;
  roundId?: number;
  roundName?: string;
  majorId?: number;
  majorName?: string;
}

export function AutoAssignDialog({
  open,
  onOpenChange,
  semesterId,
  semesterName,
  roundId,
  roundName,
  majorId,
  majorName,
}: AutoAssignDialogProps) {
  const [maxReviews, setMaxReviews] = useState<number>(7);
  const [result, setResult] = useState<AutoAssignResult | null>(null);

  const autoAssign = useAutoAssignReviewers();

  function handleStart() {
    const boundedMax = Math.max(1, Math.min(20, maxReviews || 7));
    autoAssign.mutate(
      {
        semesterId,
        roundId,
        majorId,
        maxReviewsPerLecturer: boundedMax,
      },
      {
        onSuccess: (data) => {
          setResult(data);
        },
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setResult(null);
      autoAssign.reset();
    }
    onOpenChange(nextOpen);
  }

  const scopeParts = [semesterName, roundName, majorName].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phân công GVPB tự động</DialogTitle>
          <DialogDescription>
            Ghép cặp các đề tài chưa có phản biện với giảng viên cùng bộ môn,
            khác GVHD và ưu tiên người đang phản biện ít đề tài hơn.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-1">
            {scopeParts.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/40 px-3 py-2 text-xs text-muted-foreground">
                Phạm vi:{' '}
                <span className="font-medium text-foreground">
                  {scopeParts.join(' · ')}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="maxReviews" className="text-xs font-medium">
                Số đề tài phản biện tối đa mỗi giảng viên
              </Label>
              <Input
                id="maxReviews"
                type="number"
                min={1}
                max={20}
                value={maxReviews}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxReviews(
                    isNaN(val) ? 1 : Math.max(1, Math.min(20, val)),
                  );
                }}
              />
            </div>

            {autoAssign.error && (
              <p className="text-xs text-destructive font-medium">
                {autoAssign.error.message}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300/60 bg-emerald-50/70 p-3 text-sm text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="size-4.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium">
                  Đã phân công {result.assignedCount} đề tài.
                </p>
                {result.message && result.assignedCount === 0 && (
                  <p className="text-xs opacity-90 mt-0.5">{result.message}</p>
                )}
              </div>
            </div>

            {result.unassignedCount > 0 && (
              <div className="space-y-1.5 rounded-lg border border-amber-300/60 bg-amber-50/70 p-3 dark:border-amber-700/40 dark:bg-amber-950/30">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>
                    Còn {result.unassignedCount} đề tài chưa phân công được:
                  </span>
                </div>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {result.unassigned.map((item) => (
                    <li key={item.groupId} className="truncate">
                      • {item.topicTitle}: {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {!result ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={autoAssign.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                onClick={handleStart}
                disabled={autoAssign.isPending}
              >
                {autoAssign.isPending && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Thực hiện phân công
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="w-full"
            >
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
