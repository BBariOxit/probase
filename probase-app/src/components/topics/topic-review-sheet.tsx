'use client';

import { useState } from 'react';
import {
  Check,
  GraduationCap,
  Layers,
  Loader2,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDepartmentReviewTopic, useTopic } from '@/lib/api/topics';
import { DetailSheet } from '@/components/shared/detail-sheet';
import { TextSection } from '@/components/shared/text-section';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
      {children}
    </span>
  );
}

interface TopicReviewSheetProps {
  topicId: number | null;
  onClose: () => void;
  stage?: 'DEPARTMENT' | 'AUTO';
  isHeadOfDepartment?: boolean;
}

export function TopicReviewSheet({
  topicId,
  onClose,
  stage = 'AUTO',
  isHeadOfDepartment = false,
}: TopicReviewSheetProps) {
  const { data: topic, isPending } = useTopic(topicId ?? 0, {
    enabled: !!topicId,
  });
  const departmentReview = useDepartmentReviewTopic();

  const [draft, setDraft] = useState<{ topicId: number | null; text: string }>({
    topicId: null,
    text: '',
  });
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const feedback = draft.topicId === topicId ? draft.text : '';
  const isMutating = departmentReview.isPending;

  const canReview =
    !isPending &&
    Boolean(topic) &&
    isHeadOfDepartment &&
    (stage === 'DEPARTMENT' || stage === 'AUTO') &&
    (topic?.status === 'PENDING_DEPARTMENT' || topic?.status === 'PENDING');

  async function handleDepartmentAction(
    action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT',
  ) {
    if (!topic) return;

    if (action !== 'APPROVE' && !feedback.trim()) {
      toast.error('Vui lòng nhập nhận xét để phản hồi cho giảng viên.');
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
      setDraft({ topicId: null, text: '' });
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi duyệt đề tài.',
      );
    } finally {
      setActionInProgress(null);
    }
  }

  const meta = topic ? (
    <>
      <Meta icon={GraduationCap}>
        {topic.lecturer.academicTitle
          ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
          : topic.lecturer.fullName}
      </Meta>
      <Meta icon={Layers}>{topic.projectType.name}</Meta>
      <Meta icon={Users}>
        Sinh viên {topic.occupiedSeats ?? 0}/{topic.maxStudents}
      </Meta>
    </>
  ) : null;

  const footerActions = topic ? (
    canReview ? (
      <>
        <Button
          size="sm"
          disabled={isMutating}
          onClick={() => handleDepartmentAction('REJECT')}
          className="cursor-pointer font-semibold shadow-xs bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 dark:text-white"
        >
          {actionInProgress === 'REJECT' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <X />
          )}
          Từ chối
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isMutating}
          onClick={() => handleDepartmentAction('REQUEST_REVISION')}
          className="cursor-pointer"
        >
          {actionInProgress === 'REQUEST_REVISION' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RotateCcw />
          )}
          Yêu cầu sửa
        </Button>
        <Button
          size="sm"
          disabled={isMutating}
          onClick={() => handleDepartmentAction('APPROVE')}
          className="cursor-pointer"
        >
          {actionInProgress === 'APPROVE' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Check />
          )}
          Duyệt
        </Button>
      </>
    ) : (
      <Button variant="ghost" onClick={onClose}>
        Đóng
      </Button>
    )
  ) : null;

  return (
    <DetailSheet
      open={!!topicId}
      onOpenChange={(open) => !open && !isMutating && onClose()}
      loading={isPending}
      title={
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          {topic?.title}
        </div>
      }
      badge={
        topic ? (
          <TopicStatusBadge status={topic.status} className="mt-0.5" />
        ) : null
      }
      meta={meta}
      footer={footerActions}
      descriptionAria="Duyệt nội dung đề tài"
    >
      {topic && (
        <>
          <TextSection
            title="Mô tả"
            body={topic.description}
            bodyClassName="text-justify"
          />
          {topic.objectives && (
            <TextSection
              title="Mục tiêu đề tài"
              body={topic.objectives}
              bodyClassName="text-justify"
            />
          )}
          <TextSection
            title="Yêu cầu đầu ra"
            body={topic.expectedOutcomes}
            bodyClassName="text-justify"
          />
          {topic.techStack && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium">
                Công nghệ & Công cụ đề xuất
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {topic.techStack.split(',').map((tech, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {tech.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          {topic.departmentFeedback && (
            <TextSection
              title="Góp ý bộ môn trước đó"
              body={topic.departmentFeedback}
            />
          )}
          {canReview && (
            <div className="space-y-1.5 border-t pt-4">
              <Label
                htmlFor="department-review-feedback"
                className="text-sm font-medium"
              >
                Nhận xét chuyên môn
              </Label>
              <Textarea
                id="department-review-feedback"
                rows={3}
                value={feedback}
                onChange={(e) =>
                  setDraft({ topicId: topic.id, text: e.target.value })
                }
                placeholder="Nhập nhận xét hoặc góp ý (bắt buộc khi Yêu cầu sửa hoặc Từ chối)…"
                className="resize-none text-sm"
              />
            </div>
          )}
        </>
      )}
    </DetailSheet>
  );
}
