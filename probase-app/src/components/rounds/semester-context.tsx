'use client';

import { CalendarClock } from 'lucide-react';
import { useActiveSemester, useMyRounds } from '@/lib/api/master-data';
import { describeRound } from '@/lib/round-status';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';

export function SemesterContext() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  const active = useActiveSemester();
  const { data: rounds } = useMyRounds(active?.id);
  const round = rounds?.[0];

  if (!active || !round) return null;

  const line = describeRound(round, false).headline;
  const subject =
    rounds && rounds.length > 1 ? `${round.projectType.name} · ` : '';

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
              <CalendarClock className="size-4" />
            </div>
          }
        />
        <TooltipContent side="right">
          {active.name} · {subject}
          {line}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-lg bg-white/4 border border-white/8 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-200">
        <CalendarClock className="size-3.5 shrink-0 text-primary" />
        <span className="truncate">{active.name}</span>
      </p>
      <p className="mt-0.5 pl-5 text-xs text-neutral-400">
        {subject}
        {line}
      </p>
    </div>
  );
}
