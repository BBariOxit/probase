'use client';

import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileText,
  GraduationCap,
  ImageIcon,
  Layers,
  MessageSquareText,
  Pencil,
  Target,
  Users,
} from 'lucide-react';
import type { TopicDetail } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { useMyProfile } from '@/lib/api/me';
import { sanitizeLecturerName } from '@/lib/utils';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { Button } from '@/components/ui/button';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function TopicDetailView({
  topic,
  actions,
  extraContent,
  onEdit,
}: {
  topic: TopicDetail;
  actions?: React.ReactNode;
  extraContent?: React.ReactNode;
  onEdit?: () => void;
}) {
  const user = useSession((s) => s.user);
  const { data: profile } = useMyProfile();

  const isStudent = user?.role === 'STUDENT';
  const isLecturer = user?.role === 'LECTURER';
  const isAdmin = user?.role === 'ADMIN';

  // Kiểm tra quyền chỉnh sửa đề tài (Giảng viên tạo đề tài hoặc Quản trị viên/Giáo vụ)
  const isTopicOwner =
    isLecturer &&
    (profile?.lecturer?.id === topic.lecturer.id ||
      user?.fullName === topic.lecturer.fullName);

  const isPendingReview =
    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';

  const canEdit =
    (isTopicOwner || isAdmin) &&
    !isPendingReview &&
    topic.status !== 'REJECTED' &&
    topic.status !== 'IN_PROGRESS' &&
    topic.status !== 'COMPLETED';

  const canStudentRegister =
    isStudent &&
    !topic.alreadyInAGroup &&
    (topic.canRegister || topic.canJoin);

  const attachments: any[] =
    (topic as any).attachments ||
    (topic as any).sourceProposal?.attachments ||
    [];

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] shadow-xs overflow-hidden min-w-0 max-w-full break-words">
      {/* Header đề tài */}
      <div className="p-6 sm:p-8 space-y-4">
        {/* Hàng trạng thái & nút thao tác nhanh ở trên */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <TopicStatusBadge status={topic.status} variant="text" />
            <span className="text-muted-foreground">•</span>
            <span className="font-medium text-muted-foreground">
              {topic.projectType.name}
              {topic.major ? ` • ${topic.major.name}` : ''}
            </span>
          </div>

          {canStudentRegister && (
            <div className="flex items-center gap-2.5">
              <TopicRegisterButton
                topic={topic}
                size="default"
                buttonClassName="h-9 px-4 text-xs sm:text-sm bg-primary text-white hover:bg-primary/90 font-semibold rounded-lg shadow-xs cursor-pointer gap-1.5"
                label={topic.canRegister ? 'Đăng ký đề tài' : 'Tham gia nhóm'}
              />
            </div>
          )}
        </div>

        {/* Tiêu đề đề tài */}
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-snug break-words [overflow-wrap:anywhere]">
            {topic.title}
          </h1>
        </div>

        {/* Thông tin metadata (GVHD, Loại đồ án, Số lượng SV) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-slate-600 dark:text-neutral-400">
          <div className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-4 text-muted-foreground/80 shrink-0" />
            <Link
              href={`/lecturers/${topic.lecturer.id}`}
              className="font-medium text-slate-900 dark:text-neutral-200 hover:text-primary transition-colors hover:underline"
            >
              {
                sanitizeLecturerName(
                  topic.lecturer.fullName,
                  topic.lecturer.academicTitle,
                ).displayName
              }
            </Link>
          </div>

          <span className="text-muted-foreground/30">•</span>

          <div className="inline-flex items-center gap-1.5">
            <Layers className="size-4 text-muted-foreground/80 shrink-0" />
            <span>{topic.projectType.name}</span>
          </div>

          <span className="text-muted-foreground/30">•</span>

          <div className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground/80 shrink-0" />
            <span>
              Sinh viên {topic.occupiedSeats ?? 0}/{topic.maxStudents}
            </span>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-neutral-800 my-6" />

        {/* NỘI DUNG THEO TỪNG PHẦN */}
        <div className="space-y-6">
          {/* 1. Mô tả nội dung yêu cầu */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary shrink-0" />
              <span>Mô tả nội dung yêu cầu</span>
            </h2>
            <div className="text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify selection:bg-primary/20 break-words [overflow-wrap:anywhere]">
              {topic.description}
            </div>
          </div>

          {/* 2. Mục tiêu đề tài */}
          {topic.objectives && (
            <div className="space-y-2 pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="size-4 text-primary shrink-0" />
                <span>Mục tiêu đề tài</span>
              </h2>
              <div className="text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify selection:bg-primary/20 break-words [overflow-wrap:anywhere]">
                {topic.objectives}
              </div>
            </div>
          )}

          {/* 3. Yêu cầu đầu ra */}
          <div className="space-y-2 pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Yêu cầu đầu ra</span>
            </h2>
            <div className="text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line text-justify selection:bg-primary/20 break-words [overflow-wrap:anywhere]">
              {topic.expectedOutcomes}
            </div>
          </div>

          {/* 4. Công nghệ & Công cụ đề xuất */}
          {topic.techStack && (
            <div className="space-y-2.5 pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Cpu className="size-4 text-primary shrink-0" />
                <span>Công nghệ & Công cụ đề xuất</span>
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {topic.techStack.split(',').map((tech, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200/80 dark:border-neutral-700/80"
                  >
                    {tech.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* 5. Tài liệu & Hình ảnh đính kèm */}
          {attachments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary shrink-0" />
                <span>Tài liệu & Hình ảnh đính kèm ({attachments.length})</span>
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {attachments.map((file: any, idx: number) => {
                  const isImg =
                    file.fileType?.toLowerCase().includes('image') ||
                    /\.(jpg|jpeg|png|webp|gif)$/i.test(
                      file.fileName || file.name || '',
                    );

                  return (
                    <div
                      key={file.id || idx}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 p-3 text-xs"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-primary overflow-hidden">
                        {isImg && file.fileUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.fileUrl}
                            alt={file.fileName || 'Ảnh đính kèm'}
                            className="size-full object-cover"
                          />
                        ) : isImg ? (
                          <ImageIcon className="size-5" />
                        ) : (
                          <FileText className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-medium text-slate-900 dark:text-neutral-100"
                          title={file.fileName || file.name}
                        >
                          {file.fileName || file.name}
                        </p>
                        {file.fileSize && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatBytes(file.fileSize)}
                          </p>
                        )}
                      </div>
                      {file.fileUrl && (
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-2.5 py-1 font-medium text-slate-700 dark:text-neutral-300 hover:text-primary transition-colors shrink-0"
                        >
                          <span>Xem</span>
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Góp ý từ Bộ môn (chỉ hiển thị cho giảng viên & giáo vụ) */}
          {!isStudent && topic.departmentFeedback && (
            <div className="space-y-2 pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquareText className="size-4 text-amber-500 shrink-0" />
                <span>
                  Góp ý từ Bộ môn
                  {topic.departmentReviewer && (
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-xs text-muted-foreground">
                      (
                      {
                        sanitizeLecturerName(
                          topic.departmentReviewer.fullName,
                          topic.departmentReviewer.academicTitle,
                        ).displayName
                      }
                      )
                    </span>
                  )}
                </span>
              </h2>
              <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                {topic.departmentFeedback}
              </div>
            </div>
          )}

          {extraContent && (
            <div className="pt-4 border-t border-slate-200/80 dark:border-neutral-800/80">
              {extraContent}
            </div>
          )}
        </div>
      </div>

      {/* Footer Card */}
      <div className="bg-slate-50/70 dark:bg-neutral-900/40 px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {topic.round && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              Thời hạn đăng ký:{' '}
              {dateFormat.format(new Date(topic.round.registrationStart))} –{' '}
              {dateFormat.format(new Date(topic.round.registrationEnd))}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Phía sinh viên */}
          {isStudent && (
            <>
              {canStudentRegister && (
                <TopicRegisterButton
                  topic={topic}
                  size="default"
                  buttonClassName="h-10 px-6 text-sm bg-primary text-white hover:bg-primary/90 font-semibold rounded-lg shadow-sm cursor-pointer gap-2"
                  label={topic.canRegister ? 'Đăng ký đề tài' : 'Tham gia nhóm'}
                />
              )}

              {topic.alreadyInAGroup && topic.isMyGroup && (
                <Button
                  variant="outline"
                  render={<Link href="/student/groups" />}
                  className="gap-2 font-semibold text-primary border-primary/30 bg-primary/8 hover:bg-primary/12 cursor-pointer"
                >
                  <CheckCircle className="size-4" />
                  <span>Nhóm của bạn đang làm đề tài này</span>
                </Button>
              )}

              {topic.alreadyInAGroup && !topic.isMyGroup && (
                <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-neutral-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-neutral-700">
                  Bạn đã có nhóm đề tài trong học kỳ này
                </span>
              )}

              {!topic.alreadyInAGroup &&
                !topic.canRegister &&
                !topic.canJoin && (
                  <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-neutral-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-neutral-700">
                    {topic.isFull
                      ? `Đề tài đã đủ ${topic.occupiedSeats}/${topic.maxStudents} SV`
                      : !topic.isRegistrationOpen
                        ? 'Chưa mở thời hạn đăng ký'
                        : 'Không đủ điều kiện đăng ký'}
                  </span>
                )}
            </>
          )}

          {/* Phía người tạo đề tài (Giảng viên / Admin) */}
          {canEdit && (
            <Button
              variant="default"
              onClick={onEdit}
              render={!onEdit ? <Link href={`/lecturer/topics/${topic.id}?edit=true`} /> : undefined}
              className="gap-2 font-semibold bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              <Pencil className="size-4" />
              <span>Chỉnh sửa đề tài</span>
            </Button>
          )}

          {actions}
        </div>
      </div>
    </article>
  );
}
