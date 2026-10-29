'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Users,
} from 'lucide-react';
import { useMyReviews } from '@/lib/api/reviewers';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { Button } from '@/components/ui/button';

export default function LecturerReviewsPage() {
  const allowed = useRequireRole('LECTURER');
  const { data: reviews, isPending, error } = useMyReviews();

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Đề tài phản biện của tôi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Danh sách các nhóm đồ án do Bộ môn phân công bạn làm Giảng viên phản
          biện (GVPB). Đọc thẩm định đề cương, theo dõi tiến độ và đánh giá bản
          thảo.
        </p>
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
            const stage1 = group.progressReports.find(
              (r) => r.stage === 'STAGE_1',
            );
            const stage2 = group.progressReports.find(
              (r) => r.stage === 'STAGE_2',
            );

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                <div className="space-y-4">
                  {/* Topic Title & Badges */}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {topic.major && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {topic.major.name}
                        </span>
                      )}
                      {topic.round?.projectType && (
                        <span className="inline-flex items-center gap-1">
                          <Layers className="size-3" />
                          {topic.round.projectType.name}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-heading text-lg font-semibold leading-snug">
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
                        Nhóm sinh viên thực hiện ({group.members.length} SV):
                      </p>
                      <div className="mt-0.5 space-y-0.5">
                        {group.members.map((m) => (
                          <p key={m.student.id} className="text-foreground">
                            <span className="font-medium">
                              {m.student.fullName}
                            </span>{' '}
                            <span className="text-muted-foreground">
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
                      Tài liệu & Báo cáo tiến độ của nhóm:
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
                          Đợt 1 (20%)
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
                                Báo cáo Đợt 1
                              </a>
                            )}
                            {stage1.finalStageGrade !== null &&
                              stage1.finalStageGrade !== undefined && (
                                <p className="font-semibold text-foreground">
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

                      {/* Tiến độ 2 */}
                      <div className="rounded-lg border bg-muted/30 p-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Đợt 2 (30%)
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
                                Báo cáo Đợt 2
                              </a>
                            )}
                            {stage2.workloadPercentage !== null &&
                              stage2.workloadPercentage !== undefined && (
                                <p
                                  className={`font-semibold ${stage2.isPassed === false ? 'text-destructive' : 'text-emerald-600'}`}
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
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    Phân công lúc:{' '}
                    {new Date(item.assignedAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="font-medium text-primary">
                    Đang phản biện
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
