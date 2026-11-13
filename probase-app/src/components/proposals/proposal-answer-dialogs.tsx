'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
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
import { UserAvatar } from '@/components/shared/user-avatar';

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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Nhận hướng dẫn đề tài này?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Xác nhận nhận hướng dẫn đề xuất đề tài của sinh viên
          </DialogDescription>
        </DialogHeader>

        {/* Thông tin sinh viên & loại đề tài */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/40 px-3.5 py-2.5 text-xs min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              name={proposal.student.fullName}
              src={proposal.student.avatarUrl}
              className="size-7 text-[11px] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-foreground truncate">
                  {proposal.student.fullName}
                </span>
                <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary shrink-0">
                  {proposal.student.studentCode}
                </span>
                {proposal.student.class && (
                  <span className="text-muted-foreground truncate">
                    · {proposal.student.class}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {proposal.projectType.name}
          </span>
        </div>

        <div className="space-y-4 pt-1 min-w-0 max-w-full">
          <FormError message={error} />

          {/* Ô 1: Tên đề tài chính thức dạng Textarea hiển thị đầy đủ, màu nền tương phản */}
          <div className="space-y-2 min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="officialTitle" className="text-sm font-medium">
                  Tên đề tài chính thức
                </Label>
                <InfoTooltip text="Bạn có thể chỉnh sửa lại tên đề tài cho chuẩn văn phong học thuật trước khi gửi Tổ trưởng Bộ môn thẩm định." />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {officialTitle.length}/200
              </span>
            </div>
            <Textarea
              id="officialTitle"
              maxLength={200}
              rows={3}
              value={officialTitle}
              aria-invalid={!titleValid}
              onChange={(e) => setOfficialTitle(e.target.value)}
              placeholder="Nhập tên đề tài chính thức..."
              className="min-h-[84px] text-sm leading-relaxed resize-none break-all [overflow-wrap:anywhere] bg-slate-100/80 hover:bg-slate-100 focus:bg-white dark:bg-[#121212] dark:hover:bg-[#171717] dark:focus:bg-[#0c0c0c] border-slate-300 hover:border-slate-400 dark:border-neutral-700 dark:hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-2xs"
            />
            {!titleValid && (
              <p className="text-xs text-destructive">
                Tên đề tài không được để trống.
              </p>
            )}
          </div>

          {/* Ô 2: Số sinh viên tối đa, màu nền tương phản và cân đối */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="maxStudents" className="text-sm font-medium">
                Số sinh viên tối đa
              </Label>
              <InfoTooltip text="Số lượng sinh viên tối đa được phép đăng ký đề tài này (thường từ 1 - 3 sinh viên)." />
            </div>
            <div className="flex items-center gap-2.5">
              <Input
                id="maxStudents"
                type="number"
                min={1}
                max={10}
                className="w-24 font-semibold text-sm h-9 bg-slate-100/80 hover:bg-slate-100 focus:bg-white dark:bg-[#121212] dark:hover:bg-[#171717] dark:focus:bg-[#0c0c0c] border-slate-300 hover:border-slate-400 dark:border-neutral-700 dark:hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-2xs"
                value={maxStudents}
                aria-invalid={!valid}
                onChange={(event) => setMaxStudents(event.target.value)}
              />
              <span className="text-xs font-medium text-muted-foreground">sinh viên</span>
            </div>
            {!valid && (
              <p className="text-xs text-destructive">
                Nhập một số nguyên từ 1 đến 10.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            disabled={accept.isPending}
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Huỷ
          </Button>
          <Button
            disabled={!valid || !titleValid || accept.isPending}
            onClick={submit}
            className="gap-1.5 cursor-pointer font-semibold shadow-xs bg-primary text-white hover:bg-primary/90"
          >
            {accept.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold text-destructive">
            Từ chối đề xuất này
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gửi phản hồi từ chối đề xuất đề tài của sinh viên
          </DialogDescription>
        </DialogHeader>

        {/* Thông tin đề xuất & sinh viên */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar
                name={proposal.student.fullName}
                src={proposal.student.avatarUrl}
                className="size-6 text-[10px] shrink-0"
              />
              <span className="font-semibold text-foreground truncate">
                {proposal.student.fullName}
              </span>
              <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary shrink-0">
                {proposal.student.studentCode}
              </span>
            </div>
            <span className="shrink-0 text-muted-foreground text-[11px]">
              {proposal.projectType.name}
            </span>
          </div>
          <p className="text-foreground font-medium line-clamp-2 leading-snug break-all [overflow-wrap:anywhere]">
            {proposal.title}
          </p>
        </div>

        <div className="space-y-4 pt-1 min-w-0 max-w-full">
          <FormError message={error} />

          <div className="space-y-2 min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="feedback" className="text-sm font-medium">
                Lý do từ chối
              </Label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {feedback.length}/2000
              </span>
            </div>
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
              className="min-h-[96px] text-sm leading-relaxed resize-none break-all [overflow-wrap:anywhere] bg-slate-100/80 hover:bg-slate-100 focus:bg-white dark:bg-[#121212] dark:hover:bg-[#171717] dark:focus:bg-[#0c0c0c] border-slate-300 hover:border-slate-400 dark:border-neutral-700 dark:hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-2xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            disabled={reject.isPending}
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Huỷ
          </Button>
          <Button
            variant="destructive"
            disabled={trimmed === '' || reject.isPending}
            onClick={submit}
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white font-semibold shadow-xs cursor-pointer"
          >
            {reject.isPending && <Loader2 className="size-4 animate-spin" />}
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
