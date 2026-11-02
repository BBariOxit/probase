'use client';

import { useTopic } from '@/lib/api/topics';
import { Skeleton } from '@/components/ui/skeleton';

export function GroupTopicBrief({ topicId }: { topicId: number }) {
  const { data: topic, isPending } = useTopic(topicId);

  if (isPending) {
    return (
      <section className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </section>
    );
  }

  if (!topic) return null;

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
      {topic.description && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-foreground">
            Mô tả đề tài
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {topic.description}
          </p>
        </div>
      )}

      {topic.expectedOutcomes && (
        <div className="space-y-1 pt-2 border-t border-border/40">
          <h4 className="text-xs font-semibold text-foreground">
            Yêu cầu đầu ra
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {topic.expectedOutcomes}
          </p>
        </div>
      )}
    </section>
  );
}
