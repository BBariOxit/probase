'use client';

import { useState } from 'react';
import { LockOpen, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useUnlockRound } from '@/lib/api/allocation';
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

export function UnlockRoundDialog({
  roundId,
  desk,
}: {
  roundId: number;
  desk: AllocationDesk;
}) {
  const unlock = useUnlockRound();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = reason.trim();

  // Only a settled round has anything to unlock. Anywhere else the desk is
  // already open, or the round has not got that far.
  if (desk.round.phase !== 'FINALIZED') return null;

  async function submit() {
    setError(null);
    try {
      await unlock.mutateAsync({ roundId, reason: trimmed });
      toast.success('Đã mở khóa đợt.');
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
        <LockOpen />
        Mở khoá đợt
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!unlock.isPending) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mở khoá đợt đã chốt?</DialogTitle>
            <DialogDescription>
              {desk.round.projectType.name} · {desk.round.semester.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FormError message={error} />

            <p className="text-sm text-muted-foreground">
              Đợt quay lại bước phân bổ: khoa xếp và gỡ sinh viên được như cũ,
              đề tài mở lại để đếm chỗ trống. Sinh viên không nhận thông báo —
              các bạn ấy chỉ được báo lại khi bạn chốt lần nữa.
            </p>

            <div className="space-y-2">
              <Label htmlFor="unlock-reason">Lý do mở khoá</Label>
              <Textarea
                id="unlock-reason"
                rows={3}
                maxLength={500}
                value={reason}
                aria-invalid={trimmed === ''}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={unlock.isPending}
              onClick={() => setOpen(false)}
            >
              Huỷ
            </Button>
            <Button
              disabled={trimmed === '' || unlock.isPending}
              onClick={submit}
            >
              {unlock.isPending && <Loader2 className="animate-spin" />}
              Mở khoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
