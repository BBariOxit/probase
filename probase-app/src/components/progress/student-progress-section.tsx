'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useMyGroupProgress } from '@/lib/api/progress';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressReportModal } from './progress-report-modal';
import { WeeklyLogModal } from './weekly-log-modal';

export function StudentProgressSection() {
  const { data, isPending, error } = useMyGroupProgress();

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data || !data.hasGroup || !data.hasTopic) {
    return null;
  }

  const { currentPercentage, weeklyLogs, progressReports, group } = data;
  const stage1 = progressReports.stage1;
  const stage2 = progressReports.stage2;

  return (
    <div className="space-y-6">
      {/* ── CARD TỔNG QUAN TIẾN ĐỘ ── */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Tiến độ thực hiện đồ án
              </h3>
              <Badge variant="outline" className="font-mono text-xs">
                {currentPercentage}% hoàn thành
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Đề tài: <span className="font-medium text-foreground">{group?.topic.title}</span> • GVHD: {group?.topic.lecturer?.fullName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag mốc Tiến độ 1 */}
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
              <span className="font-medium">Tiến độ 1 (20%):</span>
              {stage1?.finalStageGrade !== null && stage1?.finalStageGrade !== undefined ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {stage1.finalStageGrade}/10
                </span>
              ) : stage1 ? (
                <span className="text-blue-600 dark:text-blue-400">Đã nộp</span>
              ) : (
                <span className="text-muted-foreground">Chưa nộp</span>
              )}
            </div>

            {/* Tag mốc Tiến độ 2 */}
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
              <span className="font-medium">Tiến độ 2 (30%):</span>
              {stage2?.finalStageGrade !== null && stage2?.finalStageGrade !== undefined ? (
                stage2.isPassed === false ? (
                  <span className="font-semibold text-destructive">
                    {stage2.finalStageGrade}/10 (Chưa đạt)
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stage2.finalStageGrade}/10 (Đủ ĐK)
                  </span>
                )
              ) : stage2 ? (
                <span className="text-blue-600 dark:text-blue-400">Đã nộp</span>
              ) : (
                <span className="text-muted-foreground">Chưa nộp</span>
              )}
            </div>
          </div>
        </div>

        {/* Thanh tiến độ trực quan */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, currentPercentage))}%` }}
          />
        </div>
      </div>

      {/* ── HAI ĐỢT KIỂM TRA TẬP TRUNG CỦA KHOA ── */}
      <div>
        <h4 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
          Hai đợt kiểm tra tiến độ tập trung (Bắt buộc)
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Card Đợt 1 */}
          <div className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Tiến độ lần 1</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Trọng số 20%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tuần 5–6 • GVHD đánh giá trực tiếp
                  </p>
                </div>

                {stage1?.finalStageGrade !== null && stage1?.finalStageGrade !== undefined ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {stage1.supervisorGrade}/10
                  </Badge>
                ) : stage1 ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Chờ chấm
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Chưa nộp
                  </Badge>
                )}
              </div>

              {/* Chi tiết bài nộp đợt 1 */}
              {stage1 ? (
                <div className="space-y-1.5 rounded-lg bg-muted/30 p-2.5 text-xs">
                  {stage1.reportFileName && (
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={stage1.reportFileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline font-medium"
                      >
                        {stage1.reportFileName}
                      </a>
                    </div>
                  )}
                  {stage1.sourceCodeUrl && (
                    <div className="flex items-center gap-1.5 truncate">
                      <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={stage1.sourceCodeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {stage1.sourceCodeUrl}
                      </a>
                    </div>
                  )}
                  <div className="text-[11px] text-muted-foreground pt-0.5">
                    Nộp ngày: {formatDate(stage1.submittedAt)}
                  </div>
                  {stage1.supervisorFeedback && (
                    <div className="mt-1.5 rounded border border-border/50 bg-background/80 p-2 text-xs">
                      <span className="font-medium text-foreground">Nhận xét GVHD: </span>
                      <span className="text-muted-foreground">{stage1.supervisorFeedback}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Hồ sơ yêu cầu: Báo cáo phân tích thiết kế, mô hình CSDL và giao diện mẫu (prototype).
                </p>
              )}
            </div>

            <div className="mt-4 pt-2 border-t">
              <ProgressReportModal stage="STAGE_1" existingReport={stage1} />
            </div>
          </div>

          {/* Card Đợt 2 */}
          <div className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Tiến độ lần 2</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Trọng số 30%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tuần 9–10 • Hội đồng Bộ môn (GVHD + GVPB)
                  </p>
                </div>

                {stage2?.finalStageGrade !== null && stage2?.finalStageGrade !== undefined ? (
                  <Badge
                    className={
                      stage2.isPassed === false
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }
                  >
                    {stage2.finalStageGrade}/10
                  </Badge>
                ) : stage2 ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Chờ Hội đồng
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Chưa nộp
                  </Badge>
                )}
              </div>

              {/* Chi tiết bài nộp đợt 2 */}
              {stage2 ? (
                <div className="space-y-1.5 rounded-lg bg-muted/30 p-2.5 text-xs">
                  {stage2.reportFileName && (
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={stage2.reportFileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline font-medium"
                      >
                        {stage2.reportFileName}
                      </a>
                    </div>
                  )}
                  {stage2.sourceCodeUrl && (
                    <div className="flex items-center gap-1.5 truncate">
                      <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={stage2.sourceCodeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {stage2.sourceCodeUrl}
                      </a>
                    </div>
                  )}

                  {/* Trạng thái Pass/Fail 50% */}
                  {stage2.workloadPercentage !== null && stage2.workloadPercentage !== undefined && (
                    <div className="mt-1 flex items-center justify-between font-medium">
                      <span>Đánh giá khối lượng:</span>
                      <span
                        className={
                          stage2.workloadPercentage >= 50
                            ? 'text-emerald-600'
                            : 'text-destructive'
                        }
                      >
                        {stage2.workloadPercentage}% khối lượng
                      </span>
                    </div>
                  )}

                  {stage2.isPassed === false && (
                    <div className="mt-1 flex items-center gap-1.5 rounded bg-destructive/10 p-2 text-destructive">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>Cảnh báo: Chưa đạt 50% khối lượng, nguy cơ bị đình chỉ bảo vệ!</span>
                    </div>
                  )}

                  {stage2.supervisorFeedback && (
                    <div className="mt-1.5 rounded border border-border/50 bg-background/80 p-2 text-xs">
                      <span className="font-medium text-foreground">Góp ý Hội đồng: </span>
                      <span className="text-muted-foreground">{stage2.supervisorFeedback}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Hồ sơ yêu cầu: Demo source code chạy chức năng chính, CSDL hoàn chỉnh và dự thảo báo cáo. (Phải đạt $\ge 50\%$ để được bảo vệ).
                </p>
              )}
            </div>

            <div className="mt-4 pt-2 border-t">
              <ProgressReportModal stage="STAGE_2" existingReport={stage2} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SỔ TAY TIẾN ĐỘ NỘI BỘ (WEEKLY LOG / SPRINT FEED) ── */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <span>Sổ tay tiến độ nội bộ với GVHD</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({weeklyLogs.length} ghi nhận)
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kênh trao đổi định kỳ để GVHD theo dõi và xác nhận tiến độ thực tế.
            </p>
          </div>

          <WeeklyLogModal
            suggestedWeek={weeklyLogs.length > 0 ? weeklyLogs[0].weekNumber + 1 : 1}
            currentPercentage={currentPercentage}
          />
        </div>

        {weeklyLogs.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
            Chưa có ghi nhận tiến độ nào. Bấm nút <strong>"Ghi nhận tiến độ"</strong> ở trên để cập nhật công việc đã làm.
          </div>
        ) : (
          <div className="space-y-3">
            {weeklyLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border bg-background p-3.5 transition-colors hover:border-border/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                      Tuần {log.weekNumber}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {log.title || `Báo cáo Tuần ${log.weekNumber}`}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {log.completionPercentage}%
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {log.isAcknowledged && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        GVHD đã xem
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Nội dung đã làm */}
                <p className="mt-2 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {log.summaryNotes}
                </p>

                {/* Link Git */}
                {log.gitCommitUrl && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <GitBranch className="size-3.5 text-muted-foreground" />
                    <a
                      href={log.gitCommitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <span>Xem commit / repository minh chứng</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {/* Vướng mắc (nếu có) */}
                {log.blockers && (
                  <div className="mt-2 rounded bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Vướng mắc: </span>
                    <span>{log.blockers}</span>
                  </div>
                )}

                {/* Phản hồi từ GVHD */}
                {log.lecturerComment && (
                  <div className="mt-2.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                      <MessageSquare className="size-3.5" />
                      <span>Phản hồi của GVHD:</span>
                    </div>
                    <p className="text-foreground/90">{log.lecturerComment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
