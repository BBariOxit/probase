'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Users,
} from 'lucide-react';
import { useMyReviews } from '@/lib/api/reviewers';
import type { MyReviewItem } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubCouncilEvaluationDialog } from '@/components/reviewers/sub-council-evaluation-dialog';

export default function LecturerReviewsPage() {
  const allowed = useRequireRole('LECTURER');
  const { data: reviews, isPending, error } = useMyReviews();
  const [evaluatingItem, setEvaluatingItem] = useState<MyReviewItem | null>(null);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Đề tài phản biện & Tiểu ban của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Danh sách các nhóm đồ án do Bộ môn phân công bạn làm Giảng viên phản
            biện (GVPB) hoặc Thành viên Tiểu ban 2 Giảng viên (ĐACS / ĐACN).
          </p>
        </div>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 font-semibold text-xs">
              {reviews.length} đề tài phản biện
            </Badge>
          </div>
        )}
      </div>

      {isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách đề tài phản biện: {error.message}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">Chưa có đề tài phản biện</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổ trưởng Bộ môn chưa phân công bạn phản biện nhóm đồ án nào trong học
            kỳ này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {reviews.map((item) => {
            const { topic, group } = item;
            const projectTypeCode = topic.round?.projectType?.code;
            const isSubCouncilCourse =
              projectTypeCode === 'DACS' || projectTypeCode === 'DACN';

            const stage1 = group.progressReports.find(
              (r) => r.stage === 'STAGE_1',
            );
            const stage2 = group.progressReports.find(
              (r) => r.stage === 'STAGE_2',
            );

            const hasReviewerGraded =
              stage2?.reviewerGrade !== null &&
              stage2?.reviewerGrade !== undefined;
            const hasSupervisorGraded =
              stage2?.supervisorGrade !== null &&
              stage2?.supervisorGrade !== undefined;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="space-y-4">
                  {/* Topic Title & Badges */}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {topic.major && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {topic.major.name}
                        </span>
                      )}
                      {topic.round?.projectType && (
                        <Badge
                          variant={isSubCouncilCourse ? 'default' : 'secondary'}
                          className="text-[11px] gap-1 font-medium"
                        >
                          <Layers className="size-3" />
                          {topic.round.projectType.name}
                        </Badge>
                      )}
                      {isSubCouncilCourse && (
                        <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Tiểu ban 2 GV (50%)
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-heading text-lg font-semibold leading-snug text-foreground">
                      {topic.title}
                    </h2>
                  </div>

                  {/* Supervisor & Members */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border-y border-border py-3 text-xs">
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Giảng viên hướng dẫn:
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-foreground">
                        <GraduationCap className="size-3.5 text-primary" />
                        {topic.lecturer.academicTitle
                          ? `${topic.lecturer.academicTitle} `
                          : ''}
                        {topic.lecturer.fullName}
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground">
                        Nhóm sinh viên ({group.members.length} SV):
                      </p>
                      <div className="mt-0.5 space-y-0.5">
                        {group.members.map((m) => (
                          <p key={m.student.id} className="text-foreground">
                            <span className="font-medium">
                              {m.student.fullName}
                            </span>{' '}
                            <span className="text-muted-foreground font-mono">
                              ({m.student.studentCode}
                              {m.student.class ? ` · ${m.student.class}` : ''})
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Documents & Reports */}
                  <div className="space-y-2 text-xs">
                    <p className="font-medium text-muted-foreground">
                      Tài liệu & Báo cáo tiến độ:
                    </p>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {/* Đề cương M03 */}
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Đề cương M03
                        </p>
                        {group.outline?.attachmentUrl ? (
                          <a
                            href={group.outline.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Download className="size-3" />
                            Tải bản scan
                          </a>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Chưa có file
                          </p>
                        )}
                      </div>

                      {/* Tiến độ 1 */}
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {isSubCouncilCourse ? 'TĐ1 (Quá trình 50%)' : 'Đợt 1 (20%)'}
                        </p>
                        {stage1 ? (
                          <div className="mt-1 space-y-1">
                            {stage1.reportFileUrl && (
                              <a
                                href={stage1.reportFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <Download className="size-3" />
                                Báo cáo
                              </a>
                            )}
                            {stage1.finalStageGrade !== null &&
                              stage1.finalStageGrade !== undefined && (
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  Điểm: {stage1.finalStageGrade.toFixed(1)}đ
                                </p>
                              )}
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Chưa nộp
                          </p>
                        )}
                      </div>

                      {/* Tiến độ 2 / Tiểu ban */}
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {isSubCouncilCourse
                            ? 'TĐ2 (Tiểu ban 50%)'
                            : 'Đợt 2 (30%)'}
                        </p>
                        {stage2 ? (
                          <div className="mt-1 space-y-1">
                            {stage2.reportFileUrl && (
                              <a
                                href={stage2.reportFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <Download className="size-3" />
                                Báo cáo
                              </a>
                            )}
                            {stage2.workloadPercentage !== null &&
                              stage2.workloadPercentage !== undefined && (
                                <p
                                  className={`font-semibold ${
                                    stage2.isPassed === false
                                      ? 'text-destructive'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  Khối lượng: {stage2.workloadPercentage}%
                                </p>
                              )}
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Chưa nộp
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Source code demo link */}
                    {stage2?.sourceCodeUrl && (
                      <div className="pt-1">
                        <a
                          href={stage2.sourceCodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" />
                          Kho mã nguồn / Demo dự án của nhóm
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ── KHỐI TRẠNG THÁI TIỂU BAN / ĐÁNH GIÁ ── */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <Scale className="size-3.5" />
                        Trạng thái đánh giá Tiểu ban:
                      </span>
                      {hasReviewerGraded ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                          Bạn đã chấm: {stage2?.reviewerGrade}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400">
                          Chờ bạn chấm
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-primary/10">
                      <span>
                        Điểm GVHD:{' '}
                        <strong className="text-foreground">
                          {hasSupervisorGraded
                            ? `${stage2?.supervisorGrade}/10`
                            : 'Chưa chấm'}
                        </strong>
                      </span>
                      {stage2?.finalStageGrade !== null &&
                        stage2?.finalStageGrade !== undefined && (
                          <span>
                            Điểm chốt TĐ2:{' '}
                            <strong className="text-primary font-bold">
                              {stage2.finalStageGrade.toFixed(2)}/10
                            </strong>
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {/* Footer action bar */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    Phân công lúc:{' '}
                    {new Date(item.assignedAt).toLocaleDateString('vi-VN')}
                  </span>

                  <Button
                    size="sm"
                    variant={hasReviewerGraded ? 'outline' : 'default'}
                    className="gap-1.5 text-xs"
                    onClick={() => setEvaluatingItem(item)}
                  >
                    <Scale className="size-3.5" />
                    {hasReviewerGraded
                      ? 'Chỉnh sửa đánh giá Tiểu ban'
                      : 'Đánh giá Tiểu ban / Phản biện'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Evaluation Dialog */}
      {evaluatingItem && (
        <SubCouncilEvaluationDialog
          open={!!evaluatingItem}
          onOpenChange={(open) => !open && setEvaluatingItem(null)}
          reviewItem={evaluatingItem}
        />
      )}
    </div>
  );
}
