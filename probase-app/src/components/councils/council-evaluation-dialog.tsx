'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Loader2, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  type CouncilTopicItem,
  useEvaluateCouncilTopic,
} from '@/lib/api/councils';
import { sanitizeLecturerName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';

interface CouncilEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicItem: CouncilTopicItem | null;
  onSuccess?: () => void;
}

export function CouncilEvaluationDialog({
  open,
  onOpenChange,
  topicItem,
  onSuccess,
}: CouncilEvaluationDialogProps) {
  if (!topicItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open && (
          <CouncilEvaluationForm
            key={`${topicItem.id}-${topicItem.myEvaluation?.submittedAt ?? 'new'}`}
            topicItem={topicItem}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CouncilEvaluationForm({
  topicItem,
  onOpenChange,
  onSuccess,
}: {
  topicItem: CouncilTopicItem;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const evaluateMutation = useEvaluateCouncilTopic();

  const [score, setScore] = useState<string>(() =>
    topicItem.myEvaluation?.score !== undefined
      ? String(topicItem.myEvaluation.score)
      : '',
  );
  const [feedback, setFeedback] = useState<string>(
    () => topicItem.myEvaluation?.feedback ?? '',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      toast.error('Điểm đánh giá phải từ 0 đến 10 (thang điểm 10).');
      return;
    }

    try {
      await evaluateMutation.mutateAsync({
        councilTopicId: topicItem.id,
        data: {
          score: scoreNum,
          feedback: feedback.trim() || null,
        },
      });

      toast.success('Đã lưu điểm đánh giá.');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu điểm.',
      );
    }
  };

  const latestSub = topicItem.group.latestSubmission;
  const supName = sanitizeLecturerName(
    topicItem.topic.lecturer.fullName,
    topicItem.topic.lecturer.academicTitle,
  ).displayName;
  const revName = topicItem.reviewer
    ? sanitizeLecturerName(
        topicItem.reviewer.fullName,
        topicItem.reviewer.academicTitle,
      ).displayName
    : 'Chưa gán';

  return (
    <>
      <DialogHeader>
        {topicItem.timeSlot && (
          <div className="mb-1">
            <Badge variant="outline" className="text-xs">
              Ca: {topicItem.timeSlot}
            </Badge>
          </div>
        )}
        <DialogTitle className="text-base font-semibold leading-snug">
          {topicItem.topic.title}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Chấm điểm bảo vệ độc lập theo thang điểm 10.
        </DialogDescription>
      </DialogHeader>

      {/* Thông tin nhóm sinh viên & liên kết hồ sơ */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">GVHD: </span>
            <span className="font-semibold text-foreground">{supName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">GVPB: </span>
            <span className="font-semibold text-foreground">{revName}</span>
          </div>
        </div>

        <div className="text-xs">
          <span className="text-muted-foreground">Sinh viên thực hiện: </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {topicItem.group.members.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 border text-xs"
              >
                <User className="size-3 text-muted-foreground" />
                <span className="font-medium">{m.fullName}</span>
                <span className="text-muted-foreground">({m.studentCode})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hồ sơ đính kèm */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t text-xs">
          {latestSub?.fileUrl ? (
            <a
              href={latestSub.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <FileText className="size-3.5" />
              Xem báo cáo toàn văn ({latestSub.fileName || 'PDF'})
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">Chưa có file báo cáo</span>
          )}

          {latestSub?.submissionUrl && (
            <a
              href={latestSub.submissionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium ml-3"
            >
              <ExternalLink className="size-3.5" />
              Mã nguồn / Demo
            </a>
          )}
        </div>
      </div>

      {/* Form chấm điểm */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Lock className="size-4 shrink-0" />
          <span>
            Điểm của từng thành viên được lưu độc lập cho tới khi hội đồng khóa
            sổ.
          </span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="council-score" className="text-xs font-semibold">
            Điểm đánh giá (thang 10) <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="council-score"
              type="number"
              step="0.1"
              min="0"
              max="10"
              className="w-32 text-base font-bold text-primary"
              placeholder="VD: 8.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
              disabled={topicItem.isLocked}
            />
            <span className="text-xs text-muted-foreground">/ 10 điểm</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="council-feedback" className="text-xs font-semibold">
            Nhận xét chuyên môn
          </Label>
          <Textarea
            id="council-feedback"
            placeholder="Nhận xét về sản phẩm, trình bày và trả lời phản biện..."
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={topicItem.isLocked}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={evaluateMutation.isPending || topicItem.isLocked}
          >
            {evaluateMutation.isPending && (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            )}
            {topicItem.myEvaluation ? 'Cập nhật điểm' : 'Lưu điểm'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
