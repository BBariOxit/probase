'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupervisedGroups } from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function copyText(text: string, successMessage: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(successMessage),
    () => toast.error('Không thể sao chép vào bộ nhớ tạm.'),
  );
}

function GroupRosterSection({
  group,
  index,
}: {
  group: RegistrationGroup;
  index: number;
}) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const isFull = group.occupiedSeats >= group.topic.maxStudents;

  function handleCopySingleEmail(email: string) {
    copyText(email, `Đã sao chép: ${email}`);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-2xs">
      {/* Header bar của nhóm: Tên đề tài, loại đồ án, số chỗ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="font-mono text-xs font-bold text-slate-400 dark:text-neutral-500 shrink-0">
            #{String(index + 1).padStart(2, '0')}
          </span>

          <Link
            href={`/lecturer/topics/${group.topicId}`}
            className="font-bold text-sm sm:text-base text-slate-900 hover:text-primary dark:text-neutral-100 dark:hover:text-primary transition-colors leading-snug break-words"
            title="Bấm để xem chi tiết đề tài"
          >
            {group.topic.title}
          </Link>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          <span className="font-medium text-slate-500 dark:text-neutral-400">
            {group.topic.projectType.name}
          </span>
          <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
            •
          </span>
          <span
            className={cn(
              'font-mono font-bold',
              isFull
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {group.occupiedSeats}/{group.topic.maxStudents}
          </span>
        </div>
      </div>

      {/* Danh sách thành viên: dạng section gạch ngang từng dòng */}
      {group.members.length === 0 ? (
        <div className="px-5 py-4 text-xs text-muted-foreground">
          Chưa có sinh viên nào trong nhóm.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 sm:px-5 hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors"
            >
              {/* Cụm 1: Ký tự đại diện + Họ tên + (Trưởng nhóm) */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-7 shrink-0 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center justify-center text-xs font-bold font-mono">
                  {member.student.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                    {member.student.fullName}
                  </span>
                  {member.isLeader && (
                    <span className="text-xs font-medium text-primary">
                      (Trưởng nhóm)
                    </span>
                  )}
                </div>
              </div>

              {/* Cụm 2: MSSV • Lớp • Email liên hệ */}
              <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-600 dark:text-neutral-400 flex-wrap pl-10 sm:pl-0">
                <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                  {member.student.studentCode}
                </span>

                <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
                  •
                </span>

                <span className="font-mono text-slate-600 dark:text-neutral-400">
                  {member.student.class || '—'}
                </span>

                <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
                  •
                </span>

                <div className="flex items-center gap-1">
                  <a
                    href={`mailto:${member.student.email}`}
                    className="font-mono text-slate-600 hover:text-primary dark:text-neutral-400 dark:hover:text-primary transition-colors hover:underline"
                    title="Gửi email"
                  >
                    {member.student.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopySingleEmail(member.student.email)}
                    className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    title="Sao chép email"
                  >
                    {copiedEmail === member.student.email ? (
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LecturerGroupsPage() {
  const allowed = useRequireRole('LECTURER');
  const [search, setSearch] = useState('');

  // Tự động lấy danh sách nhóm thuộc học kỳ hiện tại
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

  if (!allowed) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar: Ô tìm kiếm + thống kê tinh gọn */}
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
          <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
            Đang hướng dẫn <strong className="text-slate-800 dark:text-neutral-200">{items.length}</strong> nhóm ({totalStudents} sinh viên)
          </span>
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
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b]">
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

      {/* Danh sách các nhóm dạng Section gạch ngang */}
      {!isPending && filteredGroups.length > 0 && (
        <div className="space-y-3.5">
          {filteredGroups.map((group, idx) => (
            <GroupRosterSection key={group.id} group={group} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
