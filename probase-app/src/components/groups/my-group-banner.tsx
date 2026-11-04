'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RegistrationGroup } from '@/lib/api/types';
import { SeatDots } from '@/components/groups/seat-indicator';

export function MyGroupBanner({ group }: { group: RegistrationGroup }) {
  return (
    <Link
      href="/student/groups"
      className="group flex items-center gap-3 rounded-xl border border-slate-300 dark:border-neutral-700 border-l-4 border-l-primary bg-card px-4 py-3 shadow-2xs transition-colors hover:border-slate-400 dark:hover:border-neutral-600"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-neutral-400">Đề tài nhóm bạn đã đăng ký</p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">{group.topic.title}</p>
      </div>

      <SeatDots
        occupied={group.occupiedSeats}
        capacity={group.topic.maxStudents}
        held={group.heldSeats}
        className="shrink-0"
      />
      <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-neutral-400">
        {group.occupiedSeats}/{group.topic.maxStudents} thành viên
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary dark:group-hover:text-primary" />
    </Link>
  );
}
