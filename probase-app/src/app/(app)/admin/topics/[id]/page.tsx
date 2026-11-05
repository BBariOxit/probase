'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useTopic, useTopicTransition } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { TopicDetailView } from '@/components/topics/topic-detail-view';
import { Button } from '@/components/ui/button';

export default function AdminTopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const allowed = useRequireRole('ADMIN');
  const router = useRouter();
  const { data: topic, isPending, error } = useTopic(Number(id));
  const transition = useTopicTransition();

  // Swap the raw ID in the breadcrumb for the topic title once it loads.
  useBreadcrumbLabel(id, topic?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/admin/topic-registry" />}
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
          render={<Link href="/admin/topic-registry" />}
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

  async function approve() {
    if (!topic) return;
    await transition.mutateAsync({ id: topic.id, to: 'approve' });
    router.push('/admin/topic-registry');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/admin/topic-registry" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách đề tài</span>
        </Button>
      </div>

      <TopicDetailView
        topic={topic}
        actions={
          topic.status === 'PENDING' ? (
            <Button
              disabled={transition.isPending}
              onClick={approve}
              className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              {transition.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              <span>Duyệt đề tài</span>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
