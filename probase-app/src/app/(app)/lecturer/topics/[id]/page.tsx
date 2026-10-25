'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTopic, useUpdateTopic } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { PageHeading } from '@/components/layout/page-heading';
import { TopicForm } from '@/components/topics/topic-form';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';

export default function EditTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const topicId = Number(id);
  const allowed = useRequireRole('LECTURER');
  const router = useRouter();
  const { data: topic, isPending, error } = useTopic(topicId);
  const update = useUpdateTopic(topicId);

  // Swap the raw ID in the breadcrumb for the topic title once it loads.
  useBreadcrumbLabel(id, topic?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return <p className="text-sm text-destructive">Không tìm thấy đề tài.</p>;
  }

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

      <TopicForm
        // Only the fields the API accepts on a PATCH; the semester comes along
        // so the locked select has something to show.
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
        // Listed out rather than spread minus semesterId: a PATCH accepts
        // exactly these, and naming them keeps that visible at the call site.
        onSubmit={(values) =>
          update.mutateAsync({
            projectTypeId: values.projectTypeId,
            title: values.title,
            description: values.description,
            expectedOutcomes: values.expectedOutcomes,
            maxStudents: values.maxStudents,
          })
        }
        onCancel={() => router.push('/lecturer')}
      />
    </div>
  );
}
