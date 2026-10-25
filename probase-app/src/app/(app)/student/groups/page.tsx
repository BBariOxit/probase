'use client';

import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { useActiveSemester, useMyRound } from '@/lib/api/master-data';
import { useMyGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { GroupTopicBrief } from '@/components/groups/group-topic-brief';
import { MyGroupPanel } from '@/components/groups/my-group-panel';
import { PageWithRail } from '@/components/layout/page-with-rail';
import { RoundTimeline } from '@/components/rounds/round-timeline';
import { Button } from '@/components/ui/button';

export default function StudentGroupPage() {
  const allowed = useRequireRole('STUDENT');
  const semester = useActiveSemester();
  const round = useMyRound(semester?.id);
  const { data: group, isPending, error } = useMyGroup();

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">Không tải được nhóm của bạn.</p>
    );
  }

  if (!group) {
    return (
      <PageWithRail
        rail={round && <RoundTimeline round={round} hasGroup={false} />}
      >
        <div className="rounded-xl border">
          <EmptyState
            icon={Users}
            title="Bạn chưa đăng ký đề tài nào."
            action={
              <Button render={<Link href="/student" />}>
                Xem danh sách đề tài
              </Button>
            }
          />
        </div>
      </PageWithRail>
    );
  }

  return (
    <PageWithRail rail={round && <RoundTimeline round={round} hasGroup />}>
      {/*
        Editable only while the gate is genuinely open. An extension does not
        count: it reopens registration for students who ended up without a group,
        and leaves every group already formed exactly as it is.
      */}
      <MyGroupPanel group={group} canEdit={round?.phase === 'OPEN'} />
      <GroupTopicBrief topicId={group.topicId} />
    </PageWithRail>
  );
}
