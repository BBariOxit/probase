'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useAcceptProposal, useRejectProposal } from '@/lib/api/proposals';
import type { TopicProposal } from '@/lib/api/types';
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
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AcceptProposalDialog({
  proposal,
  open,
  onOpenChange,
}: {
  proposal: TopicProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const accept = useAcceptProposal();
  const [maxStudents, setMaxStudents] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const size = Number(maxStudents);
  const valid = Number.isInteger(size) && size >= 1 && size <= 10;

  async function submit() {
    setError(null);
    try {
      await accept.mutateAsync({ id: proposal.id, maxStudents: size });
      toast.success('Đã chấp nhận đề xuất.');
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!accept.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            Nhận hướng dẫn đề tài này?
            <InfoTooltip text="Đề tài được tạo ở trạng thái chờ khoa duyệt, giống như đề tài bạn tự ra. Sau khi khoa duyệt và bạn mở đăng ký, sinh viên mới giữ chỗ được." />
          </DialogTitle>
          <DialogDescription>{proposal.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="maxStudents">Số sinh viên tối đa</Label>
            <Input
              id="maxStudents"
              type="number"
              min={1}
              max={10}
              className="w-24"
              value={maxStudents}
              aria-invalid={!valid}
              onChange={(event) => setMaxStudents(event.target.value)}
            />
            {!valid && (
              <p className="text-xs text-destructive">
                Nhập một số từ 1 đến 10.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={accept.isPending}
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button disabled={!valid || accept.isPending} onClick={submit}>
            {accept.isPending && <Loader2 className="animate-spin" />}
            Nhận hướng dẫn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectProposalDialog({
  proposal,
  open,
  onOpenChange,
}: {
  proposal: TopicProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reject = useRejectProposal();
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = feedback.trim();

  async function submit() {
    setError(null);
    try {
      await reject.mutateAsync({ id: proposal.id, feedback: trimmed });
      toast.success('Đã gửi phản hồi.');
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!reject.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối đề xuất này</DialogTitle>
          <DialogDescription>{proposal.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="feedback">Nhận xét cho sinh viên</Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Vài câu là đủ: vì sao từ chối, và sinh viên nên sửa hướng nào.
              Sinh viên sẽ đọc được nguyên văn.
            </p>
            <Textarea
              id="feedback"
              rows={4}
              maxLength={2000}
              value={feedback}
              aria-invalid={trimmed === ''}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={reject.isPending}
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={trimmed === '' || reject.isPending}
            onClick={submit}
          >
            {reject.isPending && <Loader2 className="animate-spin" />}
            Gửi nhận xét
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
