'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RegistrationGroup } from '@/lib/api/types';
import { SeatDots } from '@/components/groups/seat-indicator';

export function MyGroupBanner({ group }: { group: RegistrationGroup }) {
  return (
    <Link
      href="/student/groups"
      className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-foreground/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Đề tài của bạn</p>
        <p className="truncate text-sm font-medium">{group.topic.title}</p>
      </div>

      <SeatDots
        occupied={group.occupiedSeats}
        capacity={group.topic.maxStudents}
        held={group.heldSeats}
        className="shrink-0"
      />
      <span className="shrink-0 text-sm text-muted-foreground">
        {group.occupiedSeats}/{group.topic.maxStudents}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
