'use client';

import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { useActiveSemester, useMyRound } from '@/lib/api/master-data';
import { useMyGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { MyGroupPanel } from '@/components/groups/my-group-panel';
import { PendingInvitationsBanner } from '@/components/groups/pending-invitations-banner';
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
      <div className="max-w-4xl space-y-6">
        <PendingInvitationsBanner hasCurrentGroup={false} />
        <div className="rounded-2xl border border-[#b8c0d0] dark:border-[#333338] bg-white dark:bg-[#1e1e1e]">
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
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PendingInvitationsBanner hasCurrentGroup={true} />
      <MyGroupPanel group={group} canEdit={round?.phase === 'OPEN'} />
    </div>
  );
}

