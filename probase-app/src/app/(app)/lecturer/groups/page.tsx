'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupervisedGroups } from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

function GroupRosterStrip({
  group,
  index,
}: {
  group: RegistrationGroup;
  index: number;
}) {
  const [copiedGroupEmails, setCopiedGroupEmails] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const groupEmails = useMemo(
    () =>
      group.members
        .map((m) => m.student.email?.trim())
        .filter((email): email is string => Boolean(email)),
    [group.members],
  );

  const isFull = group.occupiedSeats >= group.topic.maxStudents;
  const remainingSeats = Math.max(0, group.topic.maxStudents - group.occupiedSeats);

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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
      {/* Header bar của nhóm */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-700/80 bg-slate-50/90 dark:bg-neutral-900/80 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <span className="rounded bg-slate-200/80 dark:bg-neutral-800 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:text-neutral-300">
            #{String(index + 1).padStart(2, '0')}
          </span>

          <Link
            href={`/lecturer/topics/${group.topicId}`}
            className="truncate text-sm font-bold text-slate-900 hover:text-primary dark:text-neutral-100 dark:hover:text-primary transition-colors cursor-pointer"
            title={group.topic.title}
          >
            {group.topic.title}
          </Link>

          <span className="rounded border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#202022] px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-neutral-300 whitespace-nowrap">
            {group.topic.projectType.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Trạng thái chỗ ngồi */}
          {isFull ? (
            <span className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Đã đủ {group.occupiedSeats}/{group.topic.maxStudents} SV
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Còn trống {remainingSeats} chỗ ({group.occupiedSeats}/{group.topic.maxStudents})
            </span>
          )}

          {/* Nút sao chép toàn bộ email nhóm */}
          {groupEmails.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-primary"
              onClick={handleCopyAllEmails}
              title="Sao chép toàn bộ email của nhóm để gửi mail/lên lịch họp"
            >
              {copiedGroupEmails ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span>Sao chép email nhóm</span>
            </Button>
          )}

          {/* Chi tiết nhóm */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-medium text-slate-600 dark:text-neutral-400"
            render={<Link href={`/lecturer/groups/${group.id}`} />}
            title="Xem chi tiết nhóm"
          >
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Bảng thành viên nhóm */}
      <div className="overflow-x-auto">
        {group.members.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
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
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800 dark:text-neutral-200">
                    {member.student.studentCode}
                  </td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {member.student.class || '—'}
                  </td>
                  <td className="px-4 py-2.5">
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
                        onClick={() => handleCopySingleEmail(member.student.email)}
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
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-neutral-400">
                    {JOIN_SOURCE_LABEL[member.joinSource] || member.joinSource}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function LecturerGroupsPage() {
  const allowed = useRequireRole('LECTURER');
  const [search, setSearch] = useState('');

  // Không cần dropdown chọn học kỳ: Luôn lấy danh sách nhóm thuộc học kỳ hiện tại
  const { data: groups, isPending, error } = useSupervisedGroups();

  const items = groups ?? [];

  // Tìm kiếm realtime theo tên đề tài, tên sinh viên, MSSV, lớp hoặc email
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter((g) => {
      const matchTopic =
        g.topic.title.toLowerCase().includes(q) ||
        g.topic.projectType.name.toLowerCase().includes(q);
      const matchMember = g.members.some(
        (m) =>
          m.student.fullName.toLowerCase().includes(q) ||
          m.student.studentCode.toLowerCase().includes(q) ||
          (m.student.class && m.student.class.toLowerCase().includes(q)) ||
          m.student.email.toLowerCase().includes(q),
      );
      return matchTopic || matchMember;
    });
  }, [items, search]);

  const totalStudents = useMemo(
    () => items.reduce((acc, g) => acc + g.occupiedSeats, 0),
    [items],
  );
  const fullGroupsCount = useMemo(
    () => items.filter((g) => g.occupiedSeats >= g.topic.maxStudents).length,
    [items],
  );

  if (!allowed) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar: Tìm kiếm + Thống kê tinh gọn chuẩn Enterprise */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên đề tài, sinh viên, MSSV, lớp..."
            className="pl-9 text-sm"
          />
        </div>

        {!isPending && !error && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 shadow-2xs">
              <Users className="size-3.5 text-primary" />
              <strong className="font-semibold text-slate-900 dark:text-neutral-100">
                {items.length}
              </strong>{' '}
              nhóm hướng dẫn
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 shadow-2xs">
              <strong className="font-semibold text-slate-900 dark:text-neutral-100">
                {totalStudents}
              </strong>{' '}
              sinh viên
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <strong className="font-semibold">{fullGroupsCount}</strong> nhóm đủ người
            </span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách nhóm hướng dẫn.
        </p>
      )}

      {/* Empty state */}
      {!isPending && !error && items.length === 0 && (
        <div className="rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#18181b]">
          <EmptyState
            icon={Users}
            title="Học kỳ này chưa có nhóm sinh viên đăng ký đề tài của bạn."
            description="Khi sinh viên đăng ký đề tài bạn hướng dẫn, danh sách nhóm và thành viên sẽ tự động hiển thị tại đây."
          />
        </div>
      )}

      {/* No results from search */}
      {!isPending && !error && items.length > 0 && filteredGroups.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Không tìm thấy nhóm hoặc sinh viên phù hợp với từ khóa &ldquo;{search}&rdquo;.
        </div>
      )}

      {/* Danh sách các nhóm dạng Roster Strips */}
      {!isPending && filteredGroups.length > 0 && (
        <div className="space-y-4">
          {filteredGroups.map((group, idx) => (
            <GroupRosterStrip key={group.id} group={group} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
