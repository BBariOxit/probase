'use client';

import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useFinalizeRound } from '@/lib/api/allocation';
import type { AllocationDesk } from '@/lib/api/types';
import { toast } from 'sonner';
import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function FinalizeRoundDialog({
  roundId,
  desk,
}: {
  roundId: number;
  desk: AllocationDesk;
}) {
  const finalize = useFinalizeRound();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const unplaced = desk.summary.unplacedCount;
  const trimmed = reason.trim();
  const ready = unplaced === 0 || trimmed !== '';

  // Only offered on a round that is actually being worked. Before RECONCILING
  // there is nothing to settle, and after it the round is already settled.
  if (!desk.canPlace) return null;

  async function submit() {
    setError(null);
    try {
      await finalize.mutateAsync({
        roundId,
        acknowledgeUnplaced: unplaced > 0,
        reason: unplaced > 0 ? trimmed : undefined,
      });
      toast.success('Đã chốt đợt thành công.');
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="ml-auto"
        onClick={() => setOpen(true)}
      >
        <Lock />
        Chốt phân bổ
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!finalize.isPending) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chốt phân bổ đợt này?</DialogTitle>
            <DialogDescription>
              {desk.round.projectType.name} · {desk.round.semester.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormError message={error} />

            <p className="text-sm text-muted-foreground">
              Sau khi chốt, danh sách nhóm của đợt này là chính thức: khoa không
              xếp thêm được ai, sinh viên không đổi nhóm được nữa, và mọi người
              sẽ nhận thông báo kết quả. Chốt nhầm thì mở khoá lại được, nhưng
              phải ghi lý do và có lưu vết.
            </p>

            {unplaced > 0 && (
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Lý do chốt khi còn {unplaced} sinh viên chưa có đề tài
                </Label>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Các bạn ấy sẽ kết thúc học kỳ mà không có đồ án, và sẽ nhận
                  thông báo về việc đó. Ghi lại vì sao — bảo lưu, nghỉ học,
                  không liên lạc được…
                </p>
                <Textarea
                  id="reason"
                  rows={3}
                  maxLength={500}
                  value={reason}
                  aria-invalid={trimmed === ''}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={finalize.isPending}
              onClick={() => setOpen(false)}
            >
              Huỷ
            </Button>
            <Button
              variant={unplaced > 0 ? 'destructive' : 'default'}
              disabled={!ready || finalize.isPending}
              onClick={submit}
            >
              {finalize.isPending && <Loader2 className="animate-spin" />}
              {unplaced > 0 ? `Vẫn chốt (${unplaced} SV chưa xếp)` : 'Chốt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
