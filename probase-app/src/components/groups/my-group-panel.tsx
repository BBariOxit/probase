'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EllipsisVertical, GraduationCap, Layers, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDisbandGroup,
  useInviteMember,
  useLeaveGroup,
  useUpdateGroup,
} from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { GroupSeatList } from '@/components/groups/group-seat-list';
import { cn } from '@/lib/utils';

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
  const [studentCode, setStudentCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const update = useUpdateGroup(group.id);
  const disband = useDisbandGroup(group.id);
  const leave = useLeaveGroup(group.id);
  const invite = useInviteMember(group.id);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const code = studentCode.trim();
    if (!code) {
      setInviteError('Vui lòng nhập mã số sinh viên');
      return;
    }
    setInviteError(null);
    try {
      await invite.mutateAsync(code);
      toast.success(`Đã thêm sinh viên ${code} vào nhóm thành công!`);
      setStudentCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể mời sinh viên';
      setInviteError(msg);
      toast.error(msg);
    }
  }

  const { topic } = group;

  return (
    <section className="space-y-5 rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#141414] p-5 shadow-xs">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading min-w-0 text-base sm:text-lg leading-snug font-bold tracking-tight text-slate-900 dark:text-neutral-100">
            <Link
              href={`/student/topics/${topic.id}`}
              className="rounded-sm hover:text-primary hover:underline transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                    className="shrink-0 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100"
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-700 dark:text-neutral-300 font-medium">
          <Link
            href={`/lecturers/${topic.lecturer.id}`}
            className="inline-flex items-center gap-1.5 rounded-sm hover:text-primary hover:underline transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <GraduationCap className="size-4 text-primary shrink-0" />
            <span>
              {topic.lecturer.academicTitle
                ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                : topic.lecturer.fullName}
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-4 text-primary shrink-0" />
            <span>{topic.projectType.name}</span>
          </span>
        </div>
      </header>

      <GroupSeatList group={group} canEdit={canEdit} />

      {canEdit && group.isLeader && !group.isFull && (
        <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
              <UserPlus className="size-4 text-primary" />
              Mời thành viên bằng MSSV
            </p>
            <span className="text-xs text-slate-600 dark:text-neutral-400">
              Còn <strong className="text-primary font-bold text-xs">{group.topic.maxStudents - group.occupiedSeats}</strong> chỗ trống
            </span>
          </div>
          <form onSubmit={handleInvite} className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                value={studentCode}
                onChange={(e) => {
                  setStudentCode(e.target.value);
                  if (inviteError) setInviteError(null);
                }}
                placeholder="Nhập MSSV…"
                className={cn(
                  'h-10 text-xs sm:text-sm bg-white dark:bg-[#141414] border-[1.5px] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 shadow-2xs',
                  inviteError
                    ? 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20'
                    : 'border-slate-300 dark:border-neutral-700 focus-visible:border-primary',
                )}
                disabled={invite.isPending}
              />
              <Button
                type="submit"
                disabled={invite.isPending}
                className="shrink-0 h-10 px-5 font-bold bg-primary hover:bg-primary/90 text-white shadow-xs cursor-pointer"
              >
                {invite.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4 mr-1.5" />
                )}
                Mời
              </Button>
            </div>
            {inviteError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 animate-in fade-in-50 pl-0.5">
                {inviteError}
              </p>
            )}
          </form>
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
