'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { useSupervisedGroups } from '@/lib/api/registration';
import type { RegistrationGroup } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function GroupRosterSection({
  group,
}: {
  group: RegistrationGroup;
}) {
  const isFull = group.occupiedSeats >= group.topic.maxStudents;

  return (
    <section className="flex flex-col h-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] overflow-hidden shadow-xs hover:border-slate-400 dark:hover:border-neutral-600 hover:shadow-sm transition-all">
      {/* Header đề tài: Nền xám nhạt tương phản rõ ràng với nền trang và nội dung card */}
      <div className="bg-slate-100/75 dark:bg-neutral-900/80 px-4 py-3 sm:px-5 border-b border-slate-200 dark:border-neutral-800 space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-xs text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
            {group.topic.projectType.name}
          </span>
          <span
            className={cn(
              'font-mono font-bold text-xs',
              isFull
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {group.occupiedSeats}/{group.topic.maxStudents}
          </span>
        </div>

        <Link
          href={`/lecturer/topics/${group.topicId}`}
          className="block font-bold text-[15px] sm:text-base text-slate-900 hover:text-primary dark:text-neutral-100 dark:hover:text-primary transition-colors leading-snug break-words"
          title={group.topic.title}
        >
          {group.topic.title}
        </Link>
      </div>

      {/* Danh sách thành viên: Gọn gàng, bỏ email, phân cấp rõ nét */}
      <div className="p-4 sm:p-5 flex-1 bg-white dark:bg-[#18181b]">
        {group.members.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            Chưa có sinh viên nào trong nhóm.
          </p>
        ) : (
          <div className="space-y-3">
            {group.members.map((member, idx) => (
              <div
                key={member.id}
                className={cn(
                  'flex items-center gap-3 pt-3 first:pt-0',
                  idx > 0 && 'border-t border-slate-100 dark:border-neutral-800/80',
                )}
              >
                {/* Ký tự đại diện tròn với viền sắc nét (đồng nhất màu) */}
                <div className="size-8.5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold font-mono border bg-slate-100 text-slate-700 border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                  {member.student.fullName.charAt(0).toUpperCase()}
                </div>

                {/* Thông tin sinh viên: Dòng 1 Họ tên + Trưởng nhóm, Dòng 2 MSSV · Lớp */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                      {member.student.fullName}
                    </span>
                    {member.isLeader && (
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded leading-none">
                        Trưởng nhóm
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
                    <span className="font-mono font-semibold text-xs text-slate-800 dark:text-neutral-200 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-neutral-700 leading-none">
                      {member.student.studentCode}
                    </span>
                    <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">•</span>
                    <span className="font-medium text-slate-600 dark:text-neutral-300">
                      {member.student.class || '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function LecturerGroupsPage() {
  const allowed = useRequireRole(['LECTURER', 'GVCN']);
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
          />
        </div>
      )}

      {/* No results from search */}
      {!isPending && !error && items.length > 0 && filteredGroups.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Không tìm thấy nhóm hoặc sinh viên phù hợp với từ khóa &ldquo;{search}&rdquo;.
        </div>
      )}

      {/* Danh sách các nhóm dạng 2 nhóm trên 1 hàng (2-column grid) */}
      {!isPending && filteredGroups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {filteredGroups.map((group) => (
            <GroupRosterSection key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
