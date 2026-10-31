'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Scale,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGradeProgressReport } from '@/lib/api/progress';
import type { MyReviewItem } from '@/lib/api/types';
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

interface SubCouncilEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewItem: MyReviewItem;
}

export function SubCouncilEvaluationDialog({
  open,
  onOpenChange,
  reviewItem,
}: SubCouncilEvaluationDialogProps) {
  const { topic, group } = reviewItem;
  const projectTypeCode = topic.round?.projectType?.code;
  const isSubCouncilCourse =
    projectTypeCode === 'DACS' || projectTypeCode === 'DACN';

  const stage1 = group.progressReports.find((r) => r.stage === 'STAGE_1');
  const stage2 = group.progressReports.find((r) => r.stage === 'STAGE_2');

  const gradeMutation = useGradeProgressReport();

  // Initial form values from existing review
  const initialGrade = stage2?.reviewerGrade ?? 8.0;
  const initialFeedback = stage2?.reviewerFeedback ?? '';
  const initialWorkload = stage2?.workloadPercentage ?? 70;

  const [grade, setGrade] = useState<number>(initialGrade);
  const [feedback, setFeedback] = useState<string>(initialFeedback);
  const [workload, setWorkload] = useState<number>(initialWorkload);

  // Sync when dialog opens or stage2 changes
  const supervisorGrade = stage2?.supervisorGrade ?? null;
  const supervisorFeedback = stage2?.supervisorFeedback ?? null;

  // Live calculation of Sub-council grade (Average of GVHD + GVPB)
  const hasSupervisorGrade =
    supervisorGrade !== null && supervisorGrade !== undefined;
  const liveSubCouncilGrade = hasSupervisorGrade
    ? Number(((supervisorGrade + grade) / 2).toFixed(2))
    : grade;

  // Final grade preview for DACS/DACN
  const stage1Grade = stage1?.finalStageGrade ?? stage1?.supervisorGrade ?? null;
  const liveFinalCourseGrade =
    hasSupervisorGrade && stage1Grade !== null && stage1Grade !== undefined
      ? Number((0.5 * stage1Grade + 0.5 * liveSubCouncilGrade).toFixed(2))
      : null;

  const getLetterGrade = (score: number) => {
    if (score >= 8.5) return 'A';
    if (score >= 7.8) return 'B+';
    if (score >= 7.0) return 'B';
    if (score >= 6.3) return 'C+';
    if (score >= 5.5) return 'C';
    if (score >= 4.8) return 'D+';
    if (score >= 4.0) return 'D';
    return 'F';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grade < 0 || grade > 10) {
      toast.error('Điểm đánh giá phải từ 0.0 đến 10.0.');
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        groupId: group.id,
        stage: 'STAGE_2',
        grade: Number(grade),
        feedback: feedback.trim() || undefined,
        workloadPercentage: Number(workload),
        isPassed: workload >= 50,
      });

      toast.success(
        isSubCouncilCourse
          ? 'Đã lưu đánh giá Tiểu ban kết thúc học phần!'
          : 'Đã lưu đánh giá phản biện Tiến độ 2!',
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu kết quả đánh giá.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Scale className="size-3.5" />
              {isSubCouncilCourse
                ? 'Tiểu ban 2 Giảng viên (GVHD + GVPB)'
                : 'Đánh giá Phản biện Đợt 2'}
            </span>
            {topic.round?.projectType && (
              <Badge variant="outline" className="text-xs">
                {topic.round.projectType.name}
              </Badge>
            )}
          </div>
          <DialogTitle className="mt-2 text-xl font-bold leading-snug">
            {topic.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Nhóm:{' '}
            <span className="font-semibold text-foreground">
              {group.name ?? `Nhóm #${group.id}`}
            </span>{' '}
            ({group.members.map((m) => m.student.fullName).join(', ')})
          </DialogDescription>
        </DialogHeader>

        {/* ── BẰNG CHỨNG & TÀI LIỆU DỰ THẢO ── */}
        <div className="rounded-xl border bg-muted/30 p-3 text-xs space-y-2">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
            Hồ sơ & Tài liệu của nhóm
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {group.outline?.attachmentUrl && (
              <a
                href={group.outline.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 font-medium text-primary hover:bg-muted/50 transition-colors"
              >
                <Download className="size-3.5" />
                Đề cương M03
              </a>
            )}
            {stage2?.reportFileUrl && (
              <a
                href={stage2.reportFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 font-medium text-primary hover:bg-muted/50 transition-colors"
              >
                <FileText className="size-3.5" />
                Báo cáo Đợt 2 (Bản thảo)
              </a>
            )}
            {stage2?.sourceCodeUrl && (
              <a
                href={stage2.sourceCodeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 font-medium text-primary hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                Demo / Source code
              </a>
            )}
            {!group.outline?.attachmentUrl &&
              !stage2?.reportFileUrl &&
              !stage2?.sourceCodeUrl && (
                <span className="text-muted-foreground italic">
                  Nhóm chưa đính kèm link sản phẩm hoặc báo cáo đợt 2.
                </span>
              )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── SO SÁNH ĐÁNH GIÁ 2 GIẢNG VIÊN (TIỂU BAN) ── */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* GV Hướng dẫn */}
            <div className="rounded-xl border bg-card p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                  <GraduationCap className="size-3.5 text-primary" />
                  GV Hướng dẫn
                </span>
                {hasSupervisorGrade ? (
                  <Badge className="bg-primary/10 text-primary font-bold">
                    {supervisorGrade}/10
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Chưa chấm
                  </Badge>
                )}
              </div>
              <p className="font-medium text-foreground">
                {topic.lecturer.academicTitle
                  ? `${topic.lecturer.academicTitle} `
                  : ''}
                {topic.lecturer.fullName}
              </p>
              {supervisorFeedback ? (
                <div className="rounded-lg bg-muted/40 p-2 text-muted-foreground italic">
                  &ldquo;{supervisorFeedback}&rdquo;
                </div>
              ) : (
                <p className="text-muted-foreground italic text-[11px]">
                  {hasSupervisorGrade
                    ? 'Không có nhận xét chi tiết.'
                    : 'GVHD chưa nộp điểm Tiến độ 2.'}
                </p>
              )}
            </div>

            {/* GV Phản biện (Bạn) */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Award className="size-3.5" />
                  GV Phản biện (Bạn)
                </span>
                <span className="text-[11px] font-semibold text-primary">
                  {stage2?.reviewerGrade !== null &&
                  stage2?.reviewerGrade !== undefined
                    ? `Hiện tại: ${stage2.reviewerGrade}/10`
                    : 'Chưa đánh giá'}
                </span>
              </div>

              {/* Input Điểm GVPB */}
              <div className="space-y-1">
                <Label htmlFor="reviewGrade" className="text-xs font-semibold">
                  Điểm Phản biện (0.0 - 10.0):
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="reviewGrade"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={grade}
                    onChange={(e) => setGrade(parseFloat(e.target.value) || 0)}
                    className="font-bold text-sm h-8"
                    required
                  />
                  {/* Quick preset buttons */}
                  <div className="flex gap-1">
                    {[7.5, 8.0, 8.5, 9.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGrade(preset)}
                        className={`rounded border px-1.5 py-1 text-[11px] font-medium transition-colors ${
                          grade === preset
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── KHỐI LƯỢNG HOÀN THÀNH (ĐIỀU KIỆN SỐNG CÒN >= 50%) ── */}
          <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="workloadRange" className="font-semibold text-foreground">
                Khối lượng công việc hoàn thành của nhóm:
              </Label>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs ${
                  workload >= 50
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {workload}% khối lượng
              </span>
            </div>

            <div className="space-y-1">
              <input
                id="workloadRange"
                type="range"
                min="0"
                max="100"
                step="5"
                value={workload}
                onChange={(e) => setWorkload(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span className="font-semibold text-foreground">
                  Mốc điều kiện: 50%
                </span>
                <span>100%</span>
              </div>
            </div>

            {workload < 50 ? (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cảnh báo: Không đạt yêu cầu tối thiểu</p>
                  <p className="text-[11px] opacity-90">
                    Theo quy định Khoa CNTT - DLU, đồ án dưới 50% khối lượng sẽ bị đình chỉ bảo vệ hoặc xếp loại F.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Đạt điều kiện khối lượng (≥ 50%) để xét kết thúc học phần / ra Hội đồng.</span>
              </div>
            )}
          </div>

          {/* ── NHẬN XÉT, PHẢN BIỆN CHI TIẾT ── */}
          <div className="space-y-1.5">
            <Label htmlFor="feedbackText" className="text-xs font-semibold">
              Nhận xét, phản biện & góp ý hoàn thiện:
            </Label>
            <Textarea
              id="feedbackText"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Nhận xét về tính năng phần mềm, kiến trúc cơ sở dữ liệu, giao diện, khả năng đáp ứng mục tiêu đề tài..."
              className="text-xs"
            />
          </div>

          {/* ── BẢNG TÍNH ĐIỂM TIỂU BAN & TỔNG KẾT LIVE ── */}
          <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-card to-background p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                Điểm Tiểu ban (Trung bình GVHD & GVPB):
              </span>
              <span className="text-base font-bold text-foreground">
                {liveSubCouncilGrade.toFixed(2)}/10
              </span>
            </div>

            {isSubCouncilCourse && (
              <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                <span className="text-muted-foreground">
                  Tổng kết học phần ({projectTypeCode}):
                  <span className="ml-1 font-mono text-[11px]">
                    (50% Quá trình + 50% Tiểu ban)
                  </span>
                </span>
                {liveFinalCourseGrade !== null ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-primary">
                      {liveFinalCourseGrade.toFixed(2)}/10
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                      Điểm chữ: {getLetterGrade(liveFinalCourseGrade)}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">
                    Sẽ chốt sau khi có đầy đủ điểm TĐ1 và cả 2 giảng viên.
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={gradeMutation.isPending}
              className="gap-1.5"
            >
              {gradeMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {stage2?.reviewerGrade !== null &&
              stage2?.reviewerGrade !== undefined
                ? 'Cập nhật điểm đánh giá'
                : 'Xác nhận & Lưu điểm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
