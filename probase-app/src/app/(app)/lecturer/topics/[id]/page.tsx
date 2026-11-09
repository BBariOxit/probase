'use client';

import { Suspense, use, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMyProfile } from '@/lib/api/me';
import {
  useDepartmentReviewTopic,
  useTopic,
  useTopicTransition,
  useUpdateTopic,
} from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { sanitizeLecturerName } from '@/lib/utils';
import { PageHeading } from '@/components/layout/page-heading';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  AttachmentUploader,
  type ExistingAttachment,
} from '@/components/shared/attachment-uploader';
import { TopicDetailView } from '@/components/topics/topic-detail-view';
import { TopicForm } from '@/components/topics/topic-form';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type RawTopicAttachment = {
  id: number | string;
  fileName?: string;
  name?: string;
  fileUrl?: string;
  url?: string;
  fileSize?: number;
  size?: number;
  fileType?: string;
  type?: string;
};

type TopicWithAttachments = {
  attachments?: RawTopicAttachment[];
  sourceProposal?: { attachments?: RawTopicAttachment[] };
};

function LecturerTopicDetailContent({ topicId }: { topicId: number }) {
  const searchParams = useSearchParams();
  const isEditing = searchParams.get('edit') === 'true';
  const fromTopicReviews = searchParams.get('from') === 'topic-reviews';
  const backHref = fromTopicReviews ? '/lecturer/topic-reviews' : '/lecturer';
  const backLabel = fromTopicReviews
    ? 'Quay lại duyệt đề tài'
    : 'Quay lại danh sách đề tài';
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const { data: topic, isPending, error } = useTopic(topicId);
  const update = useUpdateTopic(topicId);
  const transition = useTopicTransition();
  const departmentReview = useDepartmentReviewTopic();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState<{
    topicId: number | null;
    text: string;
  }>({ topicId: null, text: '' });
  const [actionInProgress, setActionInProgress] = useState<
    'APPROVE' | 'REQUEST_REVISION' | 'REJECT' | null
  >(null);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<Array<number | string>>(
    [],
  );

  const feedback = draftFeedback.topicId === topicId ? draftFeedback.text : '';

  // Swap the raw ID in the breadcrumb for the topic title once it loads.
  useBreadcrumbLabel(String(topicId), topic?.title);

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href={backHref} />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Đang tải thông tin đề tài...
          </p>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href={backHref} />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <p className="text-sm text-destructive font-medium">
            Không tìm thấy thông tin đề tài này.
          </p>
        </div>
      </div>
    );
  }

  const topicWithAttachments = topic as unknown as TopicWithAttachments;
  const rawAttachments =
    topicWithAttachments.attachments ??
    topicWithAttachments.sourceProposal?.attachments ??
    [];
  const existingFiles: ExistingAttachment[] = rawAttachments
    .filter((att) => !deletedFileIds.includes(att.id))
    .map((att) => ({
      id: att.id,
      name: att.fileName ?? att.name ?? 'Tệp đính kèm',
      url: att.fileUrl ?? att.url,
      size: att.fileSize ?? att.size,
      type: att.fileType ?? att.type,
    }));

  const isOwner =
    profile?.lecturer?.id !== undefined &&
    profile.lecturer.id === topic.lecturer.id;
  const isAdmin = profile?.role === 'ADMIN';
  const canEditTopic = isOwner || isAdmin;

  if (isEditing && canEditTopic) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeading
            title="Sửa đề tài"
            description={
              topic.activeGroup
                ? `${topic.semester.name} · nhóm ${topic.activeGroup.occupiedSeats}/${topic.maxStudents}`
                : `${topic.semester.name} · chưa có nhóm`
            }
          />
          <TopicStatusBadge status={topic.status} className="mt-1.5" />
        </div>

        {topic.departmentFeedback && (
          <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <MessageSquareText className="size-3.5 shrink-0" />
              <span>
                Góp ý từ Bộ môn
                {topic.departmentReviewer &&
                  ` (${
                    sanitizeLecturerName(
                      topic.departmentReviewer.fullName,
                      topic.departmentReviewer.academicTitle,
                    ).displayName
                  })`}
              </span>
            </p>
            <p className="text-sm leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line break-words [overflow-wrap:anywhere]">
              {topic.departmentFeedback}
            </p>
          </div>
        )}

        <TopicForm
          defaultValues={{
            semesterId: topic.semesterId,
            projectTypeId: topic.projectTypeId,
            title: topic.title,
            description: topic.description,
            expectedOutcomes: topic.expectedOutcomes,
            maxStudents: topic.maxStudents,
          }}
          lockSemester
          submitLabel="Lưu thay đổi"
          onSubmit={async (values) => {
            await update.mutateAsync({
              projectTypeId: values.projectTypeId,
              title: values.title,
              description: values.description,
              expectedOutcomes: values.expectedOutcomes,
              maxStudents: values.maxStudents,
            });
            if (files.length > 0) {
              toast.success(
                `Đã cập nhật đề tài và lưu ${files.length} tệp đính kèm mới!`,
              );
            } else {
              toast.success('Đã cập nhật đề tài thành công!');
            }
            router.replace(`/lecturer/topics/${topicId}`);
          }}
          onCancel={() => {
            router.replace(`/lecturer/topics/${topicId}`);
          }}
        >
          <AttachmentUploader
            files={files}
            onChange={setFiles}
            existingFiles={existingFiles}
            onDeleteExisting={(fileId) => {
              setDeletedFileIds((prev) => [...prev, fileId]);
              toast.success('Đã xoá tệp đính kèm.');
            }}
          />
        </TopicForm>
      </div>
    );
  }

  const isHeadOfDepartment = profile?.lecturer?.isHeadOfDepartment ?? false;
  const isPendingReview =
    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';
  const topicMajorId = topic.majorId ?? topic.major?.id;
  const lecturerMajorId = profile?.lecturer?.major?.id;
  const matchesMajor =
    !lecturerMajorId || !topicMajorId || topicMajorId === lecturerMajorId;
  const canDepartmentReview =
    isHeadOfDepartment && isPendingReview && matchesMajor;
  const hasActions =
    canDepartmentReview ||
    (isOwner && (isPendingReview || topic.status === 'DRAFT'));

  async function handleDepartmentAction(
    action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT',
  ) {
    if (!topic) return;

    if (action !== 'APPROVE' && !feedback.trim()) {
      toast.error('Vui lòng nhập nhận xét để phản hồi cho giảng viên.');
      feedbackRef.current?.focus();
      return;
    }

    try {
      setActionInProgress(action);
      await departmentReview.mutateAsync({
        id: topic.id,
        data: {
          action,
          feedback: feedback.trim() || undefined,
        },
      });

      const messages = {
        APPROVE: 'Đã duyệt đề tài. Đề tài sẵn sàng để Giáo vụ mở đăng ký.',
        REQUEST_REVISION: 'Đã yêu cầu giảng viên chỉnh sửa lại đề tài.',
        REJECT: 'Đã từ chối đề tài.',
      };
      toast.success(messages[action]);
      setDraftFeedback({ topicId: null, text: '' });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi duyệt đề tài.',
      );
    } finally {
      setActionInProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Nút quay lại danh sách đề tài */}
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          size="sm"
          render={<Link href={backHref} />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>{backLabel}</span>
        </Button>
      </div>

      {/* Chi tiết nội dung đề tài */}
      <TopicDetailView
        topic={topic}
        onEdit={
          canEditTopic
            ? () => router.replace(`/lecturer/topics/${topicId}?edit=true`)
            : undefined
        }
        extraContent={
          canDepartmentReview ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label
                  htmlFor="department-review-feedback"
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                >
                  <MessageSquareText className="size-4 text-primary shrink-0" />
                  <span>Nhận xét chuyên môn (TTBM)</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  Bắt buộc khi Yêu cầu sửa hoặc Từ chối
                </span>
              </div>
              <Textarea
                ref={feedbackRef}
                id="department-review-feedback"
                rows={3}
                value={feedback}
                disabled={departmentReview.isPending}
                onChange={(e) =>
                  setDraftFeedback({ topicId: topic.id, text: e.target.value })
                }
                placeholder="Nhập nhận xét hoặc góp ý để giảng viên chỉnh sửa đề tài…"
                className="resize-y text-sm"
              />
            </div>
          ) : undefined
        }
        actions={
          hasActions ? (
            <>
              {canDepartmentReview && (
                <>
                  <Button
                    variant="default"
                    disabled={departmentReview.isPending}
                    onClick={() => handleDepartmentAction('REJECT')}
                    className="gap-1.5 font-semibold bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white cursor-pointer shadow-xs"
                  >
                    {actionInProgress === 'REJECT' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    <span>Từ chối</span>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={departmentReview.isPending}
                    onClick={() => handleDepartmentAction('REQUEST_REVISION')}
                    className="gap-1.5 font-semibold cursor-pointer shadow-xs"
                  >
                    {actionInProgress === 'REQUEST_REVISION' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}
                    <span>Yêu cầu sửa</span>
                  </Button>
                  <Button
                    variant="default"
                    disabled={departmentReview.isPending}
                    onClick={() => handleDepartmentAction('APPROVE')}
                    className="gap-1.5 font-semibold bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-xs"
                  >
                    {actionInProgress === 'APPROVE' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    <span>Duyệt</span>
                  </Button>
                </>
              )}

              {isOwner && isPendingReview && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmWithdraw(true)}
                    disabled={transition.isPending}
                    className="gap-2 font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/30 border-amber-300 dark:border-amber-700 cursor-pointer shadow-xs"
                  >
                    {transition.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Undo2 className="size-4" />
                    )}
                    <span>Thu hồi</span>
                  </Button>
                  <ConfirmDialog
                    open={confirmWithdraw}
                    onOpenChange={setConfirmWithdraw}
                    title="Thu hồi gửi duyệt đề tài?"
                    description={`Đề tài "${topic.title}" sẽ được chuyển về trạng thái Bản nháp để bạn có thể chỉnh sửa và gửi duyệt lại sau.`}
                    confirmLabel="Thu hồi về bản nháp"
                    onConfirm={async () => {
                      try {
                        await transition.mutateAsync({
                          id: topic.id,
                          to: 'withdraw',
                        });
                        toast.success(
                          'Đã thu hồi đề tài về bản nháp thành công.',
                        );
                      } catch (err: unknown) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : 'Không thể thu hồi đề tài.',
                        );
                      }
                    }}
                  />
                </>
              )}

              {isOwner && topic.status === 'DRAFT' && (
                <Button
                  variant="default"
                  onClick={() => {
                    transition
                      .mutateAsync({ id: topic.id, to: 'submit' })
                      .then(() =>
                        toast.success('Đã gửi đề tài lên Bộ môn thẩm định.'),
                      )
                      .catch(() => toast.error('Không thể gửi duyệt đề tài.'));
                  }}
                  disabled={transition.isPending}
                  className="gap-2 font-semibold bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  {transition.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>Gửi duyệt</span>
                </Button>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
}

export default function LecturerTopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const allowed = useRequireRole(['LECTURER', 'ADMIN']);

  if (!allowed) return null;

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
            <Loader2 className="mx-auto size-7 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground font-medium">
              Đang tải thông tin đề tài...
            </p>
          </div>
        </div>
      }
    >
      <LecturerTopicDetailContent topicId={Number(id)} />
    </Suspense>
  );
}
