'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EllipsisVertical, GraduationCap, Layers, Loader2, LogOut, RotateCcw, Trash2, UserPlus } from 'lucide-react';
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
  const router = useRouter();
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
    <section className="space-y-6 rounded-2xl border border-[#b8c0d0] dark:border-[#333338] bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 shadow-sm">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading min-w-0 text-lg sm:text-xl leading-snug font-bold tracking-tight text-slate-900 dark:text-neutral-100 break-words [overflow-wrap:anywhere]">
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
                    className="shrink-0 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 cursor-pointer"
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
                        router.push(`/student?switchTopicForGroup=${group.id}`)
                      }
                      className="cursor-pointer"
                    >
                      <RotateCcw className="size-4 mr-1.5 text-slate-500" />
                      <span>Đổi đề tài</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setConfirming('disband')}
                      className="cursor-pointer"
                    >
                      <Trash2 className="size-4 mr-1.5" />
                      <span>Hủy đăng ký</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirming('leave')}
                    className="cursor-pointer"
                  >
                    <LogOut className="size-4 mr-1.5" />
                    <span>Rời nhóm</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <Link
            href={`/lecturers/${topic.lecturer.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f7f8fc] hover:bg-[#eef1f8] dark:bg-[#26262a] dark:hover:bg-[#2e2e34] text-slate-700 dark:text-neutral-300 border border-[#b8c0d0] dark:border-[#383840] transition-colors font-medium"
          >
            <GraduationCap className="size-4 text-primary shrink-0" />
            <span>
              {topic.lecturer.academicTitle
                ? `${topic.lecturer.academicTitle} ${topic.lecturer.fullName}`
                : topic.lecturer.fullName}
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f7f8fc] dark:bg-[#26262a] text-slate-700 dark:text-neutral-300 border border-[#b8c0d0] dark:border-[#383840] font-medium">
            <Layers className="size-4 text-primary shrink-0" />
            <span>{topic.projectType.name}</span>
          </span>
        </div>
      </header>

      <GroupSeatList group={group} canEdit={canEdit} />

      {canEdit && group.isLeader && !group.isFull && (
        <div className="rounded-xl border border-[#b8c0d0] dark:border-[#2e2e32] bg-[#eef1f8] dark:bg-[#161618] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Mời thành viên bằng MSSV
            </h3>
          </div>

          <form onSubmit={handleInvite} className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={studentCode}
                onChange={(e) => {
                  setStudentCode(e.target.value);
                  if (inviteError) setInviteError(null);
                }}
                placeholder="Nhập mã số sinh viên (ví dụ: 2266666)…"
                className={cn(
                  'h-10 text-sm bg-white dark:bg-[#202024] border border-[#a6b0c2] dark:border-[#383840] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 shadow-2xs transition-colors',
                  inviteError
                    ? 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20'
                    : 'border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-600 focus-visible:border-primary',
                )}
                disabled={invite.isPending}
              />
              <Button
                type="submit"
                disabled={invite.isPending}
                className="shrink-0 h-10 px-5 font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs cursor-pointer"
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

      {group.isFull && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
            ✓
          </span>
          <span>Nhóm đã đủ {group.occupiedSeats}/{group.topic.maxStudents} thành viên tối đa.</span>
        </div>
      )}

      {update.error && (
        <p className="text-xs text-destructive">{update.error.message}</p>
      )}

      <ConfirmDialog
        open={confirming === 'disband'}
        onOpenChange={(open) => setConfirming(open ? 'disband' : null)}
        title="Hủy đăng ký đề tài?"
        description={`Nhóm của bạn sẽ hủy đăng ký đề tài "${topic.title}". Đề tài sẽ trở lại danh sách cho sinh viên khác đăng ký.`}
        confirmLabel="Hủy đăng ký"
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
