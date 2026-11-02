'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RegistrationGroup } from '@/lib/api/types';
import { SeatDots } from '@/components/groups/seat-indicator';

export function MyGroupBanner({ group }: { group: RegistrationGroup }) {
  return (
    <Link
      href="/student/groups"
      className="group flex items-center gap-3 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white px-4 py-3 shadow-xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:border-l-blue-500 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">Đề tài nhóm bạn đã đăng ký</p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{group.topic.title}</p>
      </div>

      <SeatDots
        occupied={group.occupiedSeats}
        capacity={group.topic.maxStudents}
        held={group.heldSeats}
        className="shrink-0"
      />
      <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
        {group.occupiedSeats}/{group.topic.maxStudents} thành viên
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
    </Link>
  );
}
