'use client';

import { useTopic } from '@/lib/api/topics';
import { Skeleton } from '@/components/ui/skeleton';
import { TextSection } from '@/components/shared/text-section';

export function GroupTopicBrief({ topicId }: { topicId: number }) {
  const { data: topic, isPending } = useTopic(topicId);

  if (isPending) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </section>
    );
  }

  // Silence rather than an error box: this is supporting reading matter, and the
  // group above it — the thing the page is for — is already on screen.
  if (!topic) return null;

  return (
    <section className="space-y-5 rounded-xl border bg-card p-5">
      <TextSection
        title="Mô tả"
        body={topic.description}
        bodyClassName="leading-relaxed"
      />
      <TextSection
        title="Yêu cầu đầu ra"
        body={topic.expectedOutcomes}
        bodyClassName="leading-relaxed"
      />
    </section>
  );
}
