'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EllipsisVertical, GraduationCap, Layers } from 'lucide-react';
import {
  useDisbandGroup,
  useLeaveGroup,
  useUpdateGroup,
} from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { GroupSeatList } from '@/components/groups/group-seat-list';
import { JoinLinkField } from '@/components/shared/join-link-field';

export function MyGroupPanel({
  group,
  canEdit = true,
}: {
  group: RegistrationGroup;
  canEdit?: boolean;
}) {
  const [confirming, setConfirming] = useState<'disband' | 'leave' | null>(
    null,
  );
  const update = useUpdateGroup(group.id);
  const disband = useDisbandGroup(group.id);
  const leave = useLeaveGroup(group.id);

  const { topic } = group;

  return (
    <section className="space-y-5 rounded-xl border bg-card p-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading min-w-0 text-lg leading-tight font-semibold tracking-tight">
            <Link
              href={`/student/topics/${topic.id}`}
              className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {topic.title}
            </Link>
          </h2>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Thao tác với nhóm"
                    className="shrink-0"
                  />
                }
              >
                <EllipsisVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {group.isLeader ? (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        update.mutate({ openForJoin: !group.openForJoin })
                      }
                    >
                      {group.openForJoin
                        ? 'Đóng nhóm, không nhận thêm'
                        : 'Mở lại cho người khác vào'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setConfirming('disband')}
                    >
                      Giải tán nhóm
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirming('leave')}
                  >
                    Rời nhóm
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {/* The supervisor is a person you will be working with for a term,
              so their name goes where their name is: to their page. */}
          <Link
            href={`/lecturers/${topic.lecturer.id}`}
            className="inline-flex items-center gap-1.5 rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <GraduationCap className="size-3.5 shrink-0" />
            {topic.lecturer.academicTitle
              ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
              : topic.lecturer.fullName}
          </Link>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5 shrink-0" />
            {topic.projectType.name}
          </span>
        </div>
      </header>

      <GroupSeatList group={group} canEdit={canEdit} />

      {canEdit && group.isLeader && group.joinCode && !group.isFull && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Link mời</p>
          <JoinLinkField code={group.joinCode} />
        </div>
      )}

      {update.error && (
        <p className="text-xs text-destructive">{update.error.message}</p>
      )}

      <ConfirmDialog
        open={confirming === 'disband'}
        onOpenChange={(open) => setConfirming(open ? 'disband' : null)}
        title="Giải tán nhóm?"
        description={`Đề tài "${topic.title}" sẽ trở lại danh sách cho sinh viên khác đăng ký, và cả nhóm sẽ không còn đề tài nào.`}
        confirmLabel="Giải tán"
        onConfirm={() => disband.mutateAsync()}
      />

      <ConfirmDialog
        open={confirming === 'leave'}
        onOpenChange={(open) => setConfirming(open ? 'leave' : null)}
        title="Rời nhóm?"
        description="Bạn sẽ không còn trong nhóm này nữa, và chỗ của bạn sẽ được nhả lại cho người khác."
        confirmLabel="Rời nhóm"
        onConfirm={() => leave.mutateAsync()}
      />
    </section>
  );
}
