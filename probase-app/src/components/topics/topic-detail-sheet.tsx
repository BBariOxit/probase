'use client';

import { GraduationCap, Layers, Users } from 'lucide-react';
import { useTopic } from '@/lib/api/topics';
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
  const { data: topic, isPending } = useTopic(topicId ?? 0);

  const meta = topic ? (
    <>
      <Meta icon={GraduationCap}>
        {topic.lecturer.academicTitle
          ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
          : topic.lecturer.fullName}
      </Meta>
      <Meta icon={Layers}>{topic.projectType.name}</Meta>
      <Meta icon={Users}>{topic.maxStudents} sinh viên</Meta>
    </>
  ) : null;

  const footerActions = topic ? (
    <>
      <Button variant="ghost" onClick={onClose}>
        Đóng
      </Button>
      {!hideRegisterButton && <TopicRegisterButton topic={topic} idle={null} />}
    </>
  ) : null;

  return (
    <DetailSheet
      open={!!topicId}
      onOpenChange={(open) => !open && onClose()}
      loading={isPending}
      title={topic?.title}
      badge={topic ? <TopicStatusBadge status={topic.status} /> : null}
      meta={meta}
      footer={footerActions}
      descriptionAria="Xem nội dung đề tài"
    >
      {topic && (
        <>
          <TextSection title="Mô tả" body={topic.description} />
          <TextSection title="Yêu cầu đầu ra" body={topic.expectedOutcomes} />
        </>
      )}
    </DetailSheet>
  );
}
