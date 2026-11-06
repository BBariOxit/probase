'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  MessageSquare,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useFeedbackWeeklyLog,
  useGradeProgressReport,
  useLecturerGroupProgressDetail,
} from '@/lib/api/progress';
import { formatDate } from '@/lib/utils';
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

interface LecturerProgressEvaluationProps {
  groupId: number;
}

export function LecturerProgressEvaluation({
  groupId,
}: LecturerProgressEvaluationProps) {
  const { data, isPending, error } = useLecturerGroupProgressDetail(groupId);
  const feedbackMutation = useFeedbackWeeklyLog();
  const gradeMutation = useGradeProgressReport();

  // Feedback modal state
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [comment, setComment] = useState('');
  const [isAck, setIsAck] = useState(true);

  // Grade modal state
  const [gradingStage, setGradingStage] = useState<'STAGE_1' | 'STAGE_2' | null>(
    null,
  );
  const [grade, setGrade] = useState<number>(8);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [workload, setWorkload] = useState<number>(60);

  if (isPending) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) return null;

  const { weeklyLogs, progressReports, isSupervisor, isReviewer, group } = data;
  const stage1 = progressReports?.stage1;
  const stage2 = progressReports?.stage2;

  const projectTypeCode = group?.topic?.round?.projectType?.code;
  const isSubCouncilCourse =
    projectTypeCode === 'DACS' || projectTypeCode === 'DACN';

  const bothGradedStage2 =
    stage2?.supervisorGrade !== null &&
    stage2?.supervisorGrade !== undefined &&
    stage2?.reviewerGrade !== null &&
    stage2?.reviewerGrade !== undefined;

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

  const handleOpenFeedback = (log: any) => {
    setSelectedLog(log);
    setComment(log.lecturerComment ?? '');
    setIsAck(log.isAcknowledged ?? true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedLog) return;
    try {
      await feedbackMutation.mutateAsync({
        logId: selectedLog.id,
        lecturerComment: comment.trim() || undefined,
        isAcknowledged: isAck,
      });
      toast.success('Đã lưu phản hồi tiến độ.');
      setSelectedLog(null);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu phản hồi.');
    }
  };

  const handleOpenGrade = (stage: 'STAGE_1' | 'STAGE_2') => {
    setGradingStage(stage);
    if (stage === 'STAGE_1') {
      setGrade(stage1?.supervisorGrade ?? 8);
      setGradeFeedback(stage1?.supervisorFeedback ?? '');
    } else {
      const currentGrade = isSupervisor
        ? stage2?.supervisorGrade
        : stage2?.reviewerGrade;
      setGrade(currentGrade ?? 8);
      setGradeFeedback(
        (isSupervisor ? stage2?.supervisorFeedback : stage2?.reviewerFeedback) ?? '',
      );
      setWorkload(stage2?.workloadPercentage ?? 60);
    }
  };

  const handleSubmitGrade = async () => {
    if (!gradingStage) return;
    try {
      await gradeMutation.mutateAsync({
        groupId,
        stage: gradingStage,
        grade,
        feedback: gradeFeedback.trim() || undefined,
        ...(gradingStage === 'STAGE_2' && {
          workloadPercentage: workload,
          isPassed: workload >= 50,
        }),
      });
      toast.success(
        `Đã lưu điểm ${gradingStage === 'STAGE_1' ? 'Tiến độ 1' : 'Tiến độ 2'}.`,
      );
      setGradingStage(null);
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi chấm điểm.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HAI ĐỢT KIỂM TRA TẬP TRUNG (CHẤM ĐIỂM) ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <span>Đánh giá tiến độ</span>
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Đợt 1 */}
          <div className="flex flex-col justify-between rounded-lg border bg-background p-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">
                  {isSubCouncilCourse
                    ? 'Tiến độ 1 (GVHD - 50%)'
                    : 'Tiến độ 1 (20%)'}
                </span>
                {stage1?.finalStageGrade !== null && stage1?.finalStageGrade !== undefined ? (
                  <span className="text-xs font-semibold text-primary">
                    {stage1.supervisorGrade}/10
                  </span>
                ) : stage1 ? (
                  <span className="text-xs text-muted-foreground">Đã nộp</span>
                ) : null}
              </div>

              {stage1 ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {stage1.reportFileName && (
                    <a
                      href={stage1.reportFileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline truncate"
                    >
                      <FileText className="size-3.5 shrink-0" />
                      <span className="truncate">{stage1.reportFileName}</span>
                    </a>
                  )}
                  {stage1.sourceCodeUrl && (
                    <a
                      href={stage1.sourceCodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline truncate"
                    >
                      <GitBranch className="size-3.5 shrink-0" />
                      <span className="truncate">{stage1.sourceCodeUrl}</span>
                    </a>
                  )}
                  {stage1.supervisorFeedback && (
                    <p className="mt-1 text-foreground/80 italic">
                      &ldquo;{stage1.supervisorFeedback}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Chưa có báo cáo.</p>
              )}
            </div>

            {isSupervisor && (
              <div className="mt-3 pt-2 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="w-full text-xs h-8"
                  onClick={() => handleOpenGrade('STAGE_1')}
                >
                  {stage1?.finalStageGrade !== null ? 'Chỉnh sửa điểm TĐ1' : 'Chấm điểm TĐ1'}
                </Button>
              </div>
            )}
          </div>

          {/* Đợt 2 */}
          <div className="flex flex-col justify-between rounded-lg border bg-background p-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">
                  {isSubCouncilCourse
                    ? 'Tiến độ 2 (Tiểu ban - 50%)'
                    : 'Tiến độ 2 (Hội đồng - 30%)'}
                </span>
                {stage2?.finalStageGrade !== null && stage2?.finalStageGrade !== undefined ? (
                  <span
                    className={
                      stage2.isPassed === false
                        ? 'text-xs font-semibold text-destructive'
                        : 'text-xs font-semibold text-primary'
                    }
                  >
                    {stage2.finalStageGrade}/10
                  </span>
                ) : stage2 ? (
                  <span className="text-xs text-muted-foreground">Đã nộp</span>
                ) : null}
              </div>

              {stage2 ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {stage2.reportFileName && (
                    <a
                      href={stage2.reportFileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline truncate"
                    >
                      <FileText className="size-3.5 shrink-0" />
                      <span className="truncate">{stage2.reportFileName}</span>
                    </a>
                  )}
                  {stage2.sourceCodeUrl && (
                    <a
                      href={stage2.sourceCodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline truncate"
                    >
                      <GitBranch className="size-3.5 shrink-0" />
                      <span className="truncate">{stage2.sourceCodeUrl}</span>
                    </a>
                  )}
                  {stage2.workloadPercentage !== null && (
                    <div className="flex items-center justify-between text-xs font-medium pt-1">
                      <span>Khối lượng:</span>
                      <span
                        className={
                          stage2.workloadPercentage >= 50
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-destructive font-semibold'
                        }
                      >
                        {stage2.workloadPercentage}%
                      </span>
                    </div>
                  )}

                  {/* Chi tiết 2 GV */}
                  <div className="flex items-center justify-between rounded bg-muted/30 p-1.5 text-[11px]">
                    <span>
                      GVHD:{' '}
                      <strong className="text-foreground">
                        {stage2.supervisorGrade !== null && stage2.supervisorGrade !== undefined
                          ? `${stage2.supervisorGrade}/10`
                          : 'Chưa chấm'}
                      </strong>
                    </span>
                    <span>
                      GVPB:{' '}
                      <strong className="text-foreground">
                        {stage2.reviewerGrade !== null && stage2.reviewerGrade !== undefined
                          ? `${stage2.reviewerGrade}/10`
                          : 'Chưa chấm'}
                      </strong>
                    </span>
                  </div>

                  {stage2.isPassed === false && (
                    <div className="flex items-center gap-1 text-destructive font-medium text-xs">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>Khối lượng chưa đạt (&lt; 50%)</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Chưa có báo cáo.</p>
              )}
            </div>

            {(isSupervisor || isReviewer) && (
              <div className="mt-3 pt-2 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="w-full text-xs h-8"
                  onClick={() => handleOpenGrade('STAGE_2')}
                >
                  {stage2?.finalStageGrade !== null
                    ? 'Chỉnh sửa điểm TĐ2'
                    : isSupervisor
                      ? 'GVHD Chấm điểm TĐ2'
                      : 'GVPB Chấm điểm TĐ2'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Live Sub-council course grade result banner */}
        {isSubCouncilCourse &&
          bothGradedStage2 &&
          stage1?.finalStageGrade !== null &&
          stage1?.finalStageGrade !== undefined &&
          stage2?.finalStageGrade !== null &&
          stage2?.finalStageGrade !== undefined && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>
                  <strong>Tổng kết học phần:</strong> 50% TĐ1 ({stage1.finalStageGrade}đ) + 50% Tiểu ban ({stage2.finalStageGrade}đ)
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-primary text-sm">
                  {(0.5 * stage1.finalStageGrade + 0.5 * stage2.finalStageGrade).toFixed(2)}/10
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  (Điểm chữ: {getLetterGrade(0.5 * stage1.finalStageGrade + 0.5 * stage2.finalStageGrade)})
                </span>
              </div>
            </div>
          )}
      </div>

      {/* ── SỔ TAY TIẾN ĐỘ NỘI BỘ (WEEKLY LOGS) ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm text-foreground">
            Nhật ký tiến độ ({weeklyLogs.length})
          </h4>
        </div>

        {weeklyLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            Chưa có nhật ký tiến độ.
          </p>
        ) : (
          <div className="space-y-3">
            {weeklyLogs.map((log: any) => (
              <div
                key={log.id}
                className="rounded-lg border bg-background p-3 text-xs space-y-2 hover:border-border/80 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      Tuần {log.weekNumber}
                    </span>
                    <span className="font-medium text-foreground">
                      {log.title || `Báo cáo Tuần ${log.weekNumber}`}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      ({log.completionPercentage}%)
                    </span>
                    {log.isAcknowledged && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Đã xem
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </span>
                </div>

                <p className="text-foreground/90 whitespace-pre-wrap">{log.summaryNotes}</p>

                {log.gitCommitUrl && (
                  <div className="flex items-center gap-1.5 text-primary">
                    <GitBranch className="size-3.5" />
                    <a
                      href={log.gitCommitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate hover:underline"
                    >
                      {log.gitCommitUrl}
                    </a>
                  </div>
                )}

                {log.blockers && (
                  <div className="rounded bg-amber-500/10 p-2 text-amber-800 dark:text-amber-400">
                    <span className="font-semibold">Vướng mắc: </span>
                    <span>{log.blockers}</span>
                  </div>
                )}

                {log.lecturerComment && (
                  <div className="rounded bg-muted/40 p-2 text-foreground/80">
                    <span className="font-semibold text-primary">Nhận xét: </span>
                    <span>{log.lecturerComment}</span>
                  </div>
                )}

                {isSupervisor && (
                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleOpenFeedback(log)}
                    >
                      <MessageSquare className="size-3" />
                      {log.lecturerComment ? 'Sửa nhận xét' : 'Nhận xét'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL PHẢN HỒI NHẬT KÝ ── */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Góp ý tiến độ Tuần {selectedLog?.weekNumber}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                id="ackCheck"
                type="checkbox"
                checked={isAck}
                onChange={(e) => setIsAck(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              <Label htmlFor="ackCheck" className="text-xs font-medium cursor-pointer">
                Đánh dấu đã xem và xác nhận tiến độ
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="commentText" className="text-xs">
                Góp ý chuyên môn
              </Label>
              <Textarea
                id="commentText"
                rows={4}
                placeholder="Nhập nhận xét cho sinh viên..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={feedbackMutation.isPending}>
              {feedbackMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Lưu nhận xét
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL CHẤM ĐIỂM TIẾN ĐỘ ── */}
      <Dialog open={!!gradingStage} onOpenChange={(open) => !open && setGradingStage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {gradingStage === 'STAGE_1' ? 'Chấm điểm Tiến độ 1' : 'Chấm điểm Tiến độ 2'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gradeVal">Điểm đánh giá (thang 10)</Label>
                <span className="text-sm font-bold text-primary">{grade}/10</span>
              </div>
              <Input
                id="gradeVal"
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              />
            </div>

            {gradingStage === 'STAGE_2' && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="workloadVal" className="text-xs">
                    % Khối lượng hoàn thành:
                  </Label>
                  <span className="text-xs font-bold">{workload}%</span>
                </div>
                <Input
                  id="workloadVal"
                  type="number"
                  min={0}
                  max={100}
                  value={workload}
                  onChange={(e) => setWorkload(Number(e.target.value))}
                />
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {workload >= 50 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đạt yêu cầu (≥ 50%)</span>
                  ) : (
                    <span className="text-destructive font-medium">Chưa đạt yêu cầu (&lt; 50%)</span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="gradeFeedbackText">Nhận xét đánh giá</Label>
              <Textarea
                id="gradeFeedbackText"
                rows={3}
                placeholder="Nhập nhận xét đánh giá..."
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setGradingStage(null)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitGrade} disabled={gradeMutation.isPending}>
              {gradeMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Lưu điểm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
