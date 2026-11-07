'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  useAcceptProposal,
  useRejectProposal,
} from '@/lib/api/proposals';
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
  const [officialTitle, setOfficialTitle] = useState(proposal.title);
  const [maxStudents, setMaxStudents] = useState(
    String(proposal.maxStudents ?? 1),
  );
  const [error, setError] = useState<string | null>(null);

  const size = Number(maxStudents);
  const valid = Number.isInteger(size) && size >= 1 && size <= 10;
  const titleValid = officialTitle.trim().length > 0;

  async function submit() {
    setError(null);
    try {
      await accept.mutateAsync({
        id: proposal.id,
        maxStudents: size,
        officialTitle: officialTitle.trim(),
      });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            Nhận hướng dẫn đề tài này?
            <InfoTooltip text="Đề tài được tạo ở trạng thái chờ khoa duyệt, giống như đề tài bạn tự ra. Sau khi khoa duyệt và bạn mở đăng ký, sinh viên mới giữ chỗ được." />
          </DialogTitle>
          <DialogDescription className="break-words [overflow-wrap:anywhere]">
            Sinh viên đề xuất: {proposal.student.fullName} ({proposal.student.studentCode})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="officialTitle">Tên đề tài chính thức</Label>
              <InfoTooltip text="Bạn có thể chỉnh sửa lại tên đề tài cho chuẩn văn phong học thuật trước khi gửi duyệt Khoa." />
            </div>
            <Input
              id="officialTitle"
              maxLength={200}
              value={officialTitle}
              aria-invalid={!titleValid}
              onChange={(e) => setOfficialTitle(e.target.value)}
            />
            {!titleValid && (
              <p className="text-xs text-destructive">
                Tên đề tài không được để trống.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="maxStudents">Số sinh viên tối đa</Label>
              <InfoTooltip text="Số lượng sinh viên tối đa được phép đăng ký đề tài này." />
            </div>
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
          <Button
            disabled={!valid || !titleValid || accept.isPending}
            onClick={submit}
            className="cursor-pointer font-semibold shadow-xs bg-primary text-white hover:bg-primary/90"
          >
            {accept.isPending && <Loader2 className="animate-spin" />}
            Xác nhận nhận hướng dẫn
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
          <DialogDescription className="break-words [overflow-wrap:anywhere]">
            {proposal.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="feedback">Lý do từ chối</Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Vài câu ngắn gọn vì sao chưa thể nhận hướng dẫn đề tài này (ví dụ: đã hết chỉ tiêu, không đúng chuyên môn...).
            </p>
            <Textarea
              id="feedback"
              rows={4}
              maxLength={2000}
              placeholder="Nhập lý do từ chối..."
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
            className="bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white font-semibold shadow-xs"
          >
            {reject.isPending && <Loader2 className="animate-spin" />}
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
