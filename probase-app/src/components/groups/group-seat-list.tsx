'use client';

import { useState } from 'react';
import {
  CircleHelp,
  Loader2,
  Lock,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { cn } from '@/lib/utils';

function hoursLeft(holdUntil: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(holdUntil).getTime() - Date.now()) / 3_600_000),
  );
}

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
  const claimed = group.holdActive
    ? (group.declaredSize ?? occupied)
    : occupied;
  const canClaim =
    canEdit && group.isLeader && group.holdActive && !group.isFull;
  const busy = update.isPending || removeMember.isPending;

  function setClaim(seat: number) {
    update.mutate({ declaredSize: seat <= occupied ? null : seat });
  }

  const emptySeats = Array.from(
    { length: capacity - occupied },
    (_, index) => occupied + index + 1,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-medium">Chỗ trong nhóm</h3>

        {/*
          The rule behind the empty seats, folded into a mark you can ask.
          Spelled out under the list it was a sentence about a 24-hour window
          sitting permanently under a group that had nothing to do with it —
          read once, then in the way every time after. The rows already say who
          may take each seat; this is only for the reader who wants to know why.
        */}
        {emptySeats.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Giữ chỗ nghĩa là gì?"
                  className="rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              }
            >
              <CircleHelp className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-pretty">
              {holdExplanation(group, canClaim)}
            </TooltipContent>
          </Tooltip>
        )}

        {busy && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      <ul className="divide-y rounded-lg border">
        {group.members.map((member) => (
          <MemberSeat
            key={member.id}
            member={member}
            canRemove={canEdit && group.isLeader && !member.isLeader}
            onRemove={() => removeMember.mutate(member.student.id)}
            busy={busy}
          />
        ))}

        {emptySeats.map((seat) => (
          <EmptySeat
            key={seat}
            held={seat <= claimed}
            openForJoin={group.openForJoin}
            // The two ends of the held run, and the only two moves that keep it
            // contiguous.
            action={
              !canClaim
                ? null
                : seat === claimed
                  ? { label: 'Nhả chỗ', onPress: () => setClaim(seat - 1) }
                  : seat === claimed + 1
                    ? { label: 'Giữ chỗ', onPress: () => setClaim(seat) }
                    : null
            }
            busy={busy}
          />
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
  canRemove,
  onRemove,
  busy,
}: {
  member: GroupMember;
  canRemove: boolean;
  onRemove: () => void;
  busy: boolean;
}) {
  const { student } = member;
  const [confirming, setConfirming] = useState(false);

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

      {canRemove && (
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirming(true)}
              >
                Xóa khỏi nhóm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
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

function EmptySeat({
  held,
  openForJoin,
  action,
  busy,
}: {
  held: boolean;
  openForJoin: boolean;
  action: { label: string; onPress: () => void } | null;
  busy: boolean;
}) {
  const Icon = held ? Lock : UserRoundPlus;

  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <span
        aria-hidden
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed',
          held
            ? 'border-primary/50 text-primary'
            : 'border-border text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm">{held ? 'Đang giữ chỗ' : 'Còn trống'}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {held
            ? 'Chỉ người có link mời vào được'
            : openForJoin
              ? 'Ai cũng vào được'
              : 'Nhóm đang đóng, không nhận thêm'}
        </p>
      </div>

      {action && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={action.onPress}
          className="shrink-0"
        >
          {action.label}
        </Button>
      )}
    </li>
  );
}

function holdExplanation(group: RegistrationGroup, canClaim: boolean): string {
  if (!group.holdActive) {
    return 'Nhóm được giữ chỗ trong 24 giờ đầu sau khi đăng ký, và hạn đó đã qua. Những chỗ còn trống giờ mở cho tất cả mọi người.';
  }

  const hours = hoursLeft(group.holdUntil!);
  const window = `Hạn giữ chỗ là 24 giờ sau khi đăng ký — còn ${hours} giờ nữa và không gia hạn được.`;

  if (group.heldSeats > 0) {
    return `Chỗ đang giữ chỉ người có link mời mới vào được. ${window} Hết hạn thì chỗ đó mở cho tất cả.`;
  }

  return canClaim
    ? `Giữ chỗ là để dành phần cho người bạn đã hẹn: chỗ đó chỉ người có link mời mới vào được. ${window}`
    : `Chỗ trống đang mở cho tất cả mọi người. ${window}`;
}
