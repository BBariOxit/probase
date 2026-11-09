'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import { useTopic } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { TopicDetailView } from '@/components/topics/topic-detail-view';
import { TopicReviewModal } from '@/components/topics/topic-review-modal';
import { Button } from '@/components/ui/button';

export default function AdminTopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const allowed = useRequireRole('ADMIN');
  const { data: topic, isPending, error } = useTopic(Number(id));
  const [reviewOpen, setReviewOpen] = useState(false);

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

  const canReview =
    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';

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
          canReview ? (
            <Button
              onClick={() => setReviewOpen(true)}
              className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <ClipboardCheck className="size-4" />
              <span>Thẩm định đề tài</span>
            </Button>
          ) : undefined
        }
      />

      <TopicReviewModal
        topicId={reviewOpen ? topic.id : null}
        onClose={() => setReviewOpen(false)}
        stage="DEPARTMENT"
        isAdmin
      />
    </div>
  );
}
