'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
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

interface AutoAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId?: number;
  majorId?: number;
}

export function AutoAssignDialog({
  open,
  onOpenChange,
  roundId,
  majorId,
}: AutoAssignDialogProps) {
  const [maxReviews, setMaxReviews] = useState<number>(7);
  const [result, setResult] = useState<AutoAssignResult | null>(null);

  const autoAssign = useAutoAssignReviewers();

  function handleStart() {
    autoAssign.mutate(
      {
        roundId,
        majorId,
        maxReviewsPerLecturer: maxReviews,
      },
      {
        onSuccess: (data) => {
          setResult(data);
        },
      },
    );
  }

  function handleClose() {
    setResult(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Phân công Giảng viên phản biện tự động
          </DialogTitle>
          <DialogDescription>
            Hệ thống sẽ chạy thuật toán cân bằng tải (Min-load Balancer), ghép
            cặp đề tài chưa có phản biện cho các giảng viên cùng bộ môn, tuyệt
            đối không trùng GVHD.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="maxReviews"
                className="text-xs font-medium text-foreground"
              >
                Số lượng đề tài phản biện tối đa / Giảng viên
              </label>
              <Input
                id="maxReviews"
                type="number"
                min={1}
                max={20}
                value={maxReviews}
                onChange={(e) => setMaxReviews(Number(e.target.value) || 7)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Khuyến nghị: 5 đến 7 đề tài để đảm bảo chất lượng đọc thẩm định.
              </p>
            </div>

            {autoAssign.error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                {autoAssign.error.message}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium">
                  Đã phân công tự động {result.assignedCount} đề tài!
                </p>
                <p className="text-xs opacity-90">
                  Các giảng viên đã được ghép cặp và nhận thông báo in-app.
                </p>
              </div>
            </div>

            {result.unassignedCount > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>
                    Còn {result.unassignedCount} đề tài chưa thể ghép:
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
                onClick={handleClose}
                disabled={autoAssign.isPending}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleStart}
                disabled={autoAssign.isPending}
              >
                {autoAssign.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Bắt đầu phân công
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose} className="w-full">
              Hoàn tất
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
