'use client';

import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  GraduationCap,
  Loader2,
  MessageSquare,
  Scale,
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

  const { currentPercentage, weeklyLogs, progressReports, group, studentGrade } =
    data;
  const stage1 = progressReports.stage1;
  const stage2 = progressReports.stage2;

  const projectTypeCode = group?.topic.round?.projectType?.code;
  const isSubCouncilCourse =
    projectTypeCode === 'DACS' || projectTypeCode === 'DACN';

  const hasFinalGrade =
    studentGrade?.finalGradeNum !== null &&
    studentGrade?.finalGradeNum !== undefined;

  return (
    <div className="space-y-6">
      {/* ── BẢNG ĐIỂM TỔNG KẾT HỌC PHẦN CHÍNH THỨC (NẾU ĐÃ CÓ ĐIỂM) ── */}
      {hasFinalGrade && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-background p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Award className="size-4" />
                </span>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Kết quả Tổng kết Học phần {projectTypeCode ?? 'Đồ án'}
                </h3>
                <Badge
                  className={
                    studentGrade?.finalGradeLetter === 'F'
                      ? 'bg-destructive/10 text-destructive border-destructive/20 font-bold'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold'
                  }
                >
                  Điểm chữ: {studentGrade?.finalGradeLetter}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isSubCouncilCourse ? (
                  <>
                    Công thức: <strong className="text-foreground">50% Điểm quá trình GVHD</strong> ({studentGrade?.progress1Grade ?? '—'}đ) +{' '}
                    <strong className="text-foreground">50% Điểm Tiểu ban GVHD & GVPB</strong> ({studentGrade?.progress2Grade ?? '—'}đ).
                  </>
                ) : (
                  <>
                    Công thức: 20% TĐ1 + 30% TĐ2 + 50% Bảo vệ Hội đồng.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border bg-background/90 px-4 py-2 text-center shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Điểm hệ 10
                </span>
                <span className="font-heading text-2xl font-black text-primary">
                  {studentGrade?.finalGradeNum?.toFixed(2)}
                </span>
              </div>
              <div className="rounded-xl border bg-background/90 px-4 py-2 text-center shadow-xs">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Thang chữ
                </span>
                <span className="font-heading text-2xl font-black text-foreground">
                  {studentGrade?.finalGradeLetter ?? '—'}
                </span>
              </div>
            </div>
          </div>

          {studentGrade?.note && (
            <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-2 text-xs text-muted-foreground">
              <strong>Ghi chú:</strong> {studentGrade.note}
            </div>
          )}
        </div>
      )}

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
              {group?.topic.round?.targetCohort && (
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Lớp: {group.topic.round.targetCohort}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Đề tài: <span className="font-medium text-foreground">{group?.topic.title}</span> • GVHD:{' '}
              {group?.topic.lecturer?.fullName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag mốc Tiến độ 1 */}
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
              <span className="font-medium">
                {isSubCouncilCourse ? 'TĐ1 (Quá trình 50%):' : 'Tiến độ 1 (20%):'}
              </span>
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
              <span className="font-medium">
                {isSubCouncilCourse ? 'TĐ2 (Tiểu ban 50%):' : 'Tiến độ 2 (30%):'}
              </span>
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
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            <span>
              {isSubCouncilCourse
                ? 'Hai cột điểm đánh giá học phần (Khoa CNTT - DLU)'
                : 'Hai đợt kiểm tra tiến độ tập trung (Bắt buộc)'}
            </span>
          </h4>
          {isSubCouncilCourse && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ĐACS / ĐACN hoàn thành bằng hình thức Tiểu ban 2 Giảng viên (Không thành lập Hội đồng lớn)
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card Đợt 1 */}
          <div className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Tiến độ lần 1</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Trọng số {isSubCouncilCourse ? '50%' : '20%'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tuần 5–6 • {isSubCouncilCourse ? 'Điểm quá trình GVHD đánh giá' : 'GVHD đánh giá trực tiếp'}
                  </p>
                </div>

                {stage1?.finalStageGrade !== null && stage1?.finalStageGrade !== undefined ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
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
                    <Badge
                      variant={isSubCouncilCourse ? 'default' : 'secondary'}
                      className="text-[10px] font-semibold"
                    >
                      Trọng số {isSubCouncilCourse ? '50%' : '30%'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tuần 9–10 • {isSubCouncilCourse ? 'Tiểu ban 2 GV (GVHD + GVPB) chốt kết thúc môn' : 'Hội đồng Bộ môn (GVHD + GVPB)'}
                  </p>
                </div>

                {stage2?.finalStageGrade !== null && stage2?.finalStageGrade !== undefined ? (
                  <Badge
                    className={
                      stage2.isPassed === false
                        ? 'bg-destructive/10 text-destructive border-destructive/20 font-bold'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold'
                    }
                  >
                    {stage2.finalStageGrade}/10
                  </Badge>
                ) : stage2 ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Chờ Tiểu ban
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
                            ? 'text-emerald-600 font-semibold'
                            : 'text-destructive font-semibold'
                        }
                      >
                        {stage2.workloadPercentage}% khối lượng
                      </span>
                    </div>
                  )}

                  {/* Chi tiết điểm 2 giảng viên nếu có */}
                  {stage2.supervisorGrade !== null &&
                    stage2.supervisorGrade !== undefined &&
                    stage2.reviewerGrade !== null &&
                    stage2.reviewerGrade !== undefined && (
                      <div className="mt-1 flex items-center justify-between rounded bg-background/80 p-1.5 text-[11px] text-muted-foreground">
                        <span>GVHD: <strong className="text-foreground">{stage2.supervisorGrade}</strong></span>
                        <span>GVPB: <strong className="text-foreground">{stage2.reviewerGrade}</strong></span>
                        <span>TB: <strong className="text-primary font-bold">{stage2.finalStageGrade}</strong></span>
                      </div>
                    )}

                  {stage2.isPassed === false && (
                    <div className="mt-1 flex items-center gap-1.5 rounded bg-destructive/10 p-2 text-destructive">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>Cảnh báo: Chưa đạt 50% khối lượng, nguy cơ bị đình chỉ!</span>
                    </div>
                  )}

                  {stage2.supervisorFeedback && (
                    <div className="mt-1.5 rounded border border-border/50 bg-background/80 p-2 text-xs">
                      <span className="font-medium text-foreground">Góp ý Tiểu ban: </span>
                      <span className="text-muted-foreground">{stage2.supervisorFeedback}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Hồ sơ yêu cầu: Demo source code chạy chức năng chính, CSDL hoàn chỉnh và dự thảo báo cáo. (Phải đạt ≥ 50% để được công nhận).
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
            Chưa có ghi nhận tiến độ nào. Bấm nút <strong>&ldquo;Ghi nhận tiến độ&rdquo;</strong> ở trên để cập nhật công việc đã làm.
          </div>
        ) : (
          <div className="space-y-3">
            {weeklyLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border bg-card/50 p-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      Tuần {log.weekNumber}: {log.title ?? 'Báo cáo định kỳ'}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.completionPercentage}%
                    </Badge>
                    {log.isAcknowledged ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        <CheckCircle2 className="mr-1 size-3" />
                        GVHD đã duyệt
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 text-[10px]">
                        <Clock className="mr-1 size-3" />
                        Chờ xác nhận
                      </Badge>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(log.createdAt)} • bởi {log.submittedBy?.studentProfile?.fullName ?? 'Thành viên'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {log.summaryNotes}
                </p>

                {log.blockers && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span className="font-medium">Vướng mắc:</span>
                    <span>{log.blockers}</span>
                  </div>
                )}

                {log.gitCommitUrl && (
                  <div className="mt-2">
                    <a
                      href={log.gitCommitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <GitBranch className="size-3" />
                      Commit / Pull request
                    </a>
                  </div>
                )}

                {log.lecturerComment && (
                  <div className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground">
                    <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                      <MessageSquare className="size-3" />
                      <span>Phản hồi từ Giảng viên hướng dẫn:</span>
                    </div>
                    <p className="italic text-muted-foreground">
                      &ldquo;{log.lecturerComment}&rdquo;
                    </p>
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
