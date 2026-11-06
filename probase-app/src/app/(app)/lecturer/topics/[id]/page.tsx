'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTopic, useUpdateTopic } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { PageHeading } from '@/components/layout/page-heading';
import { TopicDetailView } from '@/components/topics/topic-detail-view';
import { TopicForm } from '@/components/topics/topic-form';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { Button } from '@/components/ui/button';

function LecturerTopicDetailContent({ topicId }: { topicId: number }) {
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(
    searchParams.get('edit') === 'true',
  );
  const router = useRouter();
  const { data: topic, isPending, error } = useTopic(topicId);
  const update = useUpdateTopic(topicId);

  // Sync edit mode if query param changes
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Swap the raw ID in the breadcrumb for the topic title once it loads.
  useBreadcrumbLabel(String(topicId), topic?.title);

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/lecturer" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề tài
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
          render={<Link href="/lecturer" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề tài
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <p className="text-sm text-destructive font-medium">
            Không tìm thấy thông tin đề tài này.
          </p>
        </div>
      </div>
    );
  }

  if (isEditing) {
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
            toast.success('Đã cập nhật đề tài thành công!');
            setIsEditing(false);
            router.replace(`/lecturer/topics/${topicId}`);
          }}
          onCancel={() => {
            setIsEditing(false);
            router.replace(`/lecturer/topics/${topicId}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Nút quay lại danh sách đề tài */}
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/lecturer" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách đề tài</span>
        </Button>
      </div>

      {/* Chi tiết nội dung đề tài */}
      <TopicDetailView
        topic={topic}
        onEdit={() => setIsEditing(true)}
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
