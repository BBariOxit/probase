'use client';

import Link from 'next/link';
import { GraduationCap, Layers, Pencil, Users } from 'lucide-react';
import { useTopic } from '@/lib/api/topics';
import { useSession } from '@/lib/auth/session';
import { useMyProfile } from '@/lib/api/me';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { TextSection } from '@/components/shared/text-section';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { Button } from '@/components/ui/button';
import { DetailSheet } from '@/components/shared/detail-sheet';

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

interface TopicDetailSheetProps {
  topicId: number | null;
  onClose: () => void;
  hideRegisterButton?: boolean;
}

export function TopicDetailSheet({
  topicId,
  onClose,
  hideRegisterButton,
}: TopicDetailSheetProps) {
  const { data: topic, isPending } = useTopic(topicId ?? 0, {
    enabled: !!topicId,
  });

  const meta = topic ? (
    <>
      <Meta icon={GraduationCap}>
        {topic.lecturer.academicTitle
          ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
          : topic.lecturer.fullName}
      </Meta>
      <Meta icon={Layers}>{topic.projectType.name}</Meta>
      <Meta icon={Users}>Sinh viên {topic.occupiedSeats ?? 0}/{topic.maxStudents}</Meta>
    </>
  ) : null;

  const user = useSession((s) => s.user);
  const { data: profile } = useMyProfile();
  const isLecturer = user?.role === 'LECTURER';
  const isAdmin = user?.role === 'ADMIN';
  const isOwner =
    isLecturer &&
    (profile?.lecturer?.id === topic?.lecturer.id ||
      user?.fullName === topic?.lecturer.fullName);
  const isPendingReview =
    topic?.status === 'PENDING_DEPARTMENT' || topic?.status === 'PENDING';
  const canEdit =
    (isOwner || isAdmin) &&
    !isPendingReview &&
    topic?.status !== 'IN_PROGRESS' &&
    topic?.status !== 'COMPLETED';

  const footerActions = topic ? (
    <>
      <Button variant="ghost" onClick={onClose}>
        Đóng
      </Button>
      {canEdit && (
        <Button
          variant="outline"
          render={<Link href={`/lecturer/topics/${topic.id}?edit=true`} />}
          className="gap-1.5 font-semibold"
        >
          <Pencil className="size-3.5" />
          <span>Sửa</span>
        </Button>
      )}
      {!hideRegisterButton && <TopicRegisterButton topic={topic} idle={null} />}
    </>
  ) : null;

  return (
    <DetailSheet
      open={!!topicId}
      onOpenChange={(open) => !open && onClose()}
      loading={isPending}
      title={
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          {topic?.title}
        </div>
      }
      badge={topic ? <TopicStatusBadge status={topic.status} /> : null}
      meta={meta}
      footer={footerActions}
      descriptionAria="Xem nội dung đề tài"
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
              <h4 className="text-sm font-medium">Công nghệ & Công cụ đề xuất</h4>
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
        </>
      )}
    </DetailSheet>
  );
}
