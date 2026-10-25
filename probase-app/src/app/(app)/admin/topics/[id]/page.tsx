'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
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
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return <p className="text-sm text-destructive">Không tìm thấy đề tài.</p>;
  }

  async function approve() {
    if (!topic) return;
    await transition.mutateAsync({ id: topic.id, to: 'approve' });
    router.push('/admin');
  }

  return (
    <div className="space-y-5">
      <TopicDetailView
        topic={topic}
        actions={
          // Only a pending topic can be approved, so once it has moved on
          // there is nothing here to offer.
          topic.status === 'PENDING' ? (
            <Button disabled={transition.isPending} onClick={approve}>
              {transition.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              Duyệt đề tài
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
