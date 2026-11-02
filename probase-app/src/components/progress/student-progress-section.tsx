'use client';

import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileEdit,
  FileText,
  Gavel,
  GitBranch,
  Loader2,
  MapPin,
  MessageSquare,
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
      <div className="flex justify-center py-6">
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
    <div className="space-y-4">
      {/* ── BẢNG ĐIỂM TỔNG KẾT HỌC PHẦN (NẾU ĐÃ CÓ ĐIỂM) ── */}
      {hasFinalGrade && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Kết quả tổng kết học phần {projectTypeCode ?? 'đồ án'}
                </h3>
                <Badge
                  className={
                    studentGrade?.finalGradeLetter === 'F'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }
                >
                  Điểm chữ: {studentGrade?.finalGradeLetter}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isSubCouncilCourse
                  ? `50% Quá trình (${studentGrade?.progress1Grade ?? '—'}đ) + 50% Tiểu ban (${studentGrade?.progress2Grade ?? '—'}đ)`
                  : '20% Tiến độ 1 + 30% Tiến độ 2 + 50% Hội đồng'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border/40 bg-card/60 px-3 py-1.5 text-center">
                <span className="text-[10px] text-muted-foreground block">
                  Hệ 10
                </span>
                <span className="text-lg font-bold text-primary">
                  {studentGrade?.finalGradeNum?.toFixed(2)}
                </span>
              </div>
              <div className="rounded-lg border border-border/40 bg-card/60 px-3 py-1.5 text-center">
                <span className="text-[10px] text-muted-foreground block">
                  Chữ
                </span>
                <span className="text-lg font-bold text-foreground">
                  {studentGrade?.finalGradeLetter ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LỊCH BẢO VỆ CHÍNH THỨC (NẾU ĐÃ ĐƯỢC XẾP HỘI ĐỒNG) ── */}
      {(group as any)?.councilTopic && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Gavel className="size-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground">
                  Lịch bảo vệ khóa luận
                </h4>
                <Badge variant="outline" className="text-[11px] h-5 px-2">
                  {(group as any).councilTopic.council.name}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <span className="inline-flex items-center gap-1 text-foreground">
                  <MapPin className="size-3 text-primary" />
                  {(group as any).councilTopic.council.location || 'Chưa định phòng'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3 text-primary" />
                  {new Date((group as any).councilTopic.council.defenseDate).toLocaleString('vi-VN')}
                </span>
                {(group as any).councilTopic.timeSlot && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3 text-primary" />
                    Ca: {(group as any).councilTopic.timeSlot}
                  </span>
                )}
              </div>
            </div>

            {(group as any).councilTopic.isLocked ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs gap-1">
                <CheckCircle2 className="size-3" />
                Đã bảo vệ
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1">
                <Clock className="size-3" />
                Sắp bảo vệ
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* ── TỔNG QUAN TIẾN ĐỘ ── */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Tiến độ thực hiện
              </h3>
              <Badge variant="outline" className="text-xs font-mono h-5">
                {currentPercentage}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              GVHD: <span className="text-foreground">{group?.topic.lecturer?.fullName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Tag mốc Tiến độ 1 */}
            <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1">
              <span className="text-muted-foreground">
                {isSubCouncilCourse ? 'TĐ1 (50%):' : 'TĐ1 (20%):'}
              </span>
              {stage1?.finalStageGrade !== null && stage1?.finalStageGrade !== undefined ? (
                <span className="font-medium text-emerald-400">
                  {stage1.finalStageGrade}/10
                </span>
              ) : stage1 ? (
                <span className="text-blue-400">Đã nộp</span>
              ) : (
                <span className="text-muted-foreground">Chưa nộp</span>
              )}
            </div>

            {/* Tag mốc Tiến độ 2 */}
            <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1">
              <span className="text-muted-foreground">
                {isSubCouncilCourse ? 'TĐ2 (50%):' : 'TĐ2 (30%):'}
              </span>
              {stage2?.finalStageGrade !== null && stage2?.finalStageGrade !== undefined ? (
                stage2.isPassed === false ? (
                  <span className="font-medium text-rose-400">
                    {stage2.finalStageGrade}/10
                  </span>
                ) : (
                  <span className="font-medium text-emerald-400">
                    {stage2.finalStageGrade}/10
                  </span>
                )
              ) : stage2 ? (
                <span className="text-blue-400">Đã nộp</span>
              ) : (
                <span className="text-muted-foreground">Chưa nộp</span>
              )}
            </div>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, currentPercentage))}%` }}
          />
        </div>
      </div>

      {/* ── HAI ĐỢT KIỂM TRA ĐỊNH KỲ ── */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Đợt 1 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Tiến độ đợt 1</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({isSubCouncilCourse ? 'Trọng số 50%' : 'Trọng số 20%'})
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tuần 5–6 • GVHD đánh giá
                </p>
              </div>

              {stage1?.finalStageGrade !== null && stage1?.finalStageGrade !== undefined ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                  {stage1.supervisorGrade}/10
                </Badge>
              ) : stage1 ? (
                <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-xs">
                  Chờ chấm
                </Badge>
              ) : (
                <Badge variant="outline" className="text-zinc-500 border-zinc-700/40 text-xs">
                  Chưa nộp
                </Badge>
              )}
            </div>

            {stage1 ? (
              <div className="space-y-1.5 rounded-lg bg-muted/20 p-2.5 text-xs">
                {stage1.reportFileName && (
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={stage1.reportFileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary hover:underline"
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
                {stage1.supervisorFeedback && (
                  <p className="text-zinc-300 pt-1 text-[11px]">
                    <span className="text-muted-foreground">GVHD: </span>
                    {stage1.supervisorFeedback}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Báo cáo phân tích thiết kế, mô hình CSDL và giao diện mẫu.
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border/40">
            <ProgressReportModal stage="STAGE_1" existingReport={stage1} />
          </div>
        </div>

        {/* Đợt 2 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Tiến độ đợt 2</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({isSubCouncilCourse ? 'Trọng số 50%' : 'Trọng số 30%'})
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tuần 9–10 • Hội đồng Bộ môn
                </p>
              </div>

              {stage2?.finalStageGrade !== null && stage2?.finalStageGrade !== undefined ? (
                <Badge
                  className={
                    stage2.isPassed === false
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs'
                  }
                >
                  {stage2.finalStageGrade}/10
                </Badge>
              ) : stage2 ? (
                <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-xs">
                  Chờ chấm
                </Badge>
              ) : (
                <Badge variant="outline" className="text-zinc-500 border-zinc-700/40 text-xs">
                  Chưa nộp
                </Badge>
              )}
            </div>

            {stage2 ? (
              <div className="space-y-1.5 rounded-lg bg-muted/20 p-2.5 text-xs">
                {stage2.reportFileName && (
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={stage2.reportFileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary hover:underline"
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
                {stage2.workloadPercentage !== null && stage2.workloadPercentage !== undefined && (
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-muted-foreground">Khối lượng:</span>
                    <span className={stage2.workloadPercentage >= 50 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {stage2.workloadPercentage}%
                    </span>
                  </div>
                )}
                {stage2.isPassed === false && (
                  <div className="flex items-center gap-1.5 text-rose-400 text-[11px] pt-1">
                    <AlertTriangle className="size-3 shrink-0" />
                    <span>Dưới 50% khối lượng — Nguy cơ đình chỉ</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Mã nguồn chạy thử (demo), CSDL hoàn chỉnh và dự thảo báo cáo.
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border/40">
            <ProgressReportModal stage="STAGE_2" existingReport={stage2} />
          </div>
        </div>
      </div>

      {/* ── NHẬT KÝ TIẾN ĐỘ TUẦN ── */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-foreground">
              Nhật ký tiến độ
            </h4>
            <span className="text-xs text-muted-foreground">
              ({weeklyLogs.length})
            </span>
          </div>

          <WeeklyLogModal
            suggestedWeek={weeklyLogs.length > 0 ? weeklyLogs[0].weekNumber + 1 : 1}
            currentPercentage={currentPercentage}
          />
        </div>

        {weeklyLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileEdit className="size-7 text-muted-foreground/30 mb-1.5" />
            <p className="text-xs font-medium text-muted-foreground">
              Chưa có nhật ký tiến độ
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {weeklyLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-border/40 bg-muted/15 p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Tuần {log.weekNumber}
                    </span>
                    <span>{log.title}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {log.completionPercentage}%
                  </span>
                </div>

                <p className="text-zinc-300 leading-relaxed">
                  {log.summaryNotes}
                </p>

                {log.blockers && (
                  <p className="text-amber-400/90 text-[11px]">
                    Vướng mắc: {log.blockers}
                  </p>
                )}

                {log.lecturerComment && (
                  <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/30">
                    <span className="text-foreground font-medium">GVHD: </span>
                    {log.lecturerComment}
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
