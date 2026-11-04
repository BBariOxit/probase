'use client';

import { useState } from 'react';
import {
  Loader2,
  UserRoundPlus,
  MoreHorizontal,
} from 'lucide-react';
import { useRemoveMember, useUpdateGroup } from '@/lib/api/registration';
import type { GroupMember, RegistrationGroup } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { cn } from '@/lib/utils';

export function GroupSeatList({
  group,
  canEdit = true,
}: {
  group: RegistrationGroup;
  canEdit?: boolean;
}) {
  const update = useUpdateGroup(group.id);
  const removeMember = useRemoveMember(group.id);

  const capacity = group.topic.maxStudents;
  const occupied = group.occupiedSeats;
  const busy = update.isPending || removeMember.isPending;

  const emptySeats = Array.from(
    { length: Math.max(0, capacity - occupied) },
    (_, index) => occupied + index + 1,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Thành viên ({occupied}/{capacity})</h3>
        {busy && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      <ul className="divide-y divide-slate-200 dark:divide-neutral-700/80 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#141414]">
        {group.members.map((member) => (
          <MemberSeat
            key={member.id}
            member={member}
            canManage={canEdit && group.isLeader && !member.isLeader}
            onRemove={() => removeMember.mutate(member.student.id)}
            onTransferLeader={() => update.mutate({ leaderId: member.student.id })}
            busy={busy}
          />
        ))}

        {emptySeats.map((seat) => (
          <EmptySeat key={seat} />
        ))}
      </ul>

      {(update.error ?? removeMember.error) && (
        <p className="text-xs text-destructive">
          {(update.error ?? removeMember.error)!.message}
        </p>
      )}
    </div>
  );
}

function MemberSeat({
  member,
  canManage,
  onRemove,
  onTransferLeader,
  busy,
}: {
  member: GroupMember;
  canManage: boolean;
  onRemove: () => void;
  onTransferLeader: () => void;
  busy: boolean;
}) {
  const { student } = member;
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);

  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <UserAvatar
        name={student.fullName}
        src={student.avatarUrl}
        className="size-8 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
          <span className="truncate">{student.fullName}</span>
          {member.isLeader && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              Trưởng nhóm
            </span>
          )}
          {member.joinSource === 'ASSIGNED' && (
            <span className="rounded-md bg-status-waiting-bg px-1.5 py-0.5 text-xs font-normal text-status-waiting">
              Khoa xếp vào
            </span>
          )}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {[student.studentCode, student.class, student.major?.name]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {canManage && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  className="shrink-0 text-muted-foreground"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmingTransfer(true)}>
                Chuyển quyền trưởng nhóm
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmingRemove(true)}
              >
                Xóa khỏi nhóm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConfirmDialog
            open={confirmingTransfer}
            onOpenChange={setConfirmingTransfer}
            title="Chuyển quyền trưởng nhóm"
            description={`Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho ${student.fullName}? Sau khi chuyển, bạn sẽ trở thành thành viên thông thường trong nhóm.`}
            confirmLabel="Xác nhận chuyển"
            onConfirm={async () => onTransferLeader()}
          />

          <ConfirmDialog
            open={confirmingRemove}
            onOpenChange={setConfirmingRemove}
            title="Xóa thành viên"
            description={`Bạn có chắc chắn muốn xóa ${student.fullName} khỏi nhóm không? Họ sẽ bị mất đề tài và phải tìm nhóm khác.`}
            confirmLabel="Xóa khỏi nhóm"
            onConfirm={async () => onRemove()}
          />
        </>
      )}
    </li>
  );
}

function EmptySeat() {
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-neutral-700 text-slate-400 dark:text-neutral-500"
      >
        <UserRoundPlus className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">Chỗ còn trống</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Trưởng nhóm có thể mời thêm bạn bằng MSSV
        </p>
      </div>
    </li>
  );
}
