'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { Button } from '@/components/ui/button';

const JOIN_SOURCE_LABEL: Record<string, string> = {
  SELF: 'Tự đăng ký',
  LINK: 'Mời qua MSSV',
  ASSIGNED: 'Khoa phân công',
};

function copyText(text: string, successMessage: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(successMessage),
    () => toast.error('Không thể sao chép vào bộ nhớ tạm.'),
  );
}

export default function LecturerGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const allowed = useRequireRole('LECTURER');
  const [copiedGroupEmails, setCopiedGroupEmails] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const { data: group, isPending, error } = useGroup(groupId);

  useBreadcrumbLabel(id, group?.topic.title);

  const groupEmails = useMemo(
    () =>
      group?.members
        .map((m) => m.student.email?.trim())
        .filter((email): email is string => Boolean(email)) ?? [],
    [group?.members],
  );

  const isFull =
    group && group.occupiedSeats >= group.topic.maxStudents;
  const remainingSeats = group
    ? Math.max(0, group.topic.maxStudents - group.occupiedSeats)
    : 0;

  function handleCopyAllEmails() {
    if (groupEmails.length === 0) return;
    copyText(
      groupEmails.join(', '),
      `Đã sao chép ${groupEmails.length} email của nhóm`,
    );
    setCopiedGroupEmails(true);
    setTimeout(() => setCopiedGroupEmails(false), 2000);
  }

  function handleCopySingleEmail(email: string) {
    copyText(email, `Đã sao chép: ${email}`);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !group) {
    return <p className="text-sm text-destructive">Không tìm thấy nhóm này.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Top bar: Nút quay lại + Thao tác */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/lecturer/groups"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary dark:text-neutral-400 dark:hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Danh sách nhóm hướng dẫn</span>
        </Link>

        {groupEmails.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-primary"
            onClick={handleCopyAllEmails}
          >
            {copiedGroupEmails ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>Sao chép toàn bộ email nhóm</span>
          </Button>
        )}
      </div>

      {/* Thẻ tóm tắt đề tài */}
      <div className="rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded border border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-neutral-300">
                {group.topic.projectType.name}
              </span>
              {isFull ? (
                <span className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Đã đủ {group.occupiedSeats}/{group.topic.maxStudents} SV
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Còn trống {remainingSeats} chỗ ({group.occupiedSeats}/{group.topic.maxStudents})
                </span>
              )}
            </div>

            <h1 className="text-lg font-bold text-slate-900 dark:text-neutral-100 leading-snug">
              {group.topic.title}
            </h1>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium shrink-0"
            render={<Link href={`/lecturer/topics/${group.topicId}`} />}
          >
            <BookOpen className="size-3.5" />
            <span>Xem & sửa đề tài</span>
          </Button>
        </div>
      </div>

      {/* Bảng danh sách thành viên */}
      <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="border-b border-slate-200 dark:border-neutral-700/80 bg-slate-50/90 dark:bg-neutral-900/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Thành viên nhóm ({group.occupiedSeats}/{group.topic.maxStudents})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          {group.members.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có sinh viên nào trong nhóm.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-700/80 bg-slate-100/60 dark:bg-neutral-900/40 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 select-none">
                  <th className="w-28 px-4 py-2.5">MSSV</th>
                  <th className="min-w-48 px-4 py-2.5">Họ và tên</th>
                  <th className="w-32 px-4 py-2.5">Lớp</th>
                  <th className="min-w-56 px-4 py-2.5">Email liên hệ</th>
                  <th className="w-32 px-4 py-2.5">Nguồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {group.members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-neutral-200">
                      {member.student.studentCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                          {member.student.fullName}
                        </span>
                        {member.isLeader && (
                          <span className="inline-flex items-center rounded border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                            Trưởng nhóm
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-neutral-400">
                      {member.student.class || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${member.student.email}`}
                          className="font-mono text-xs text-slate-600 hover:text-primary dark:text-neutral-400 dark:hover:text-primary transition-colors hover:underline"
                          title="Gửi email"
                        >
                          {member.student.email}
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopySingleEmail(member.student.email)
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
                          title="Sao chép email"
                        >
                          {copiedEmail === member.student.email ? (
                            <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-neutral-400">
                      {JOIN_SOURCE_LABEL[member.joinSource] || member.joinSource}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
