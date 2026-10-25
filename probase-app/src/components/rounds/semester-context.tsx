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
            <div className="flex h-8 items-center justify-center text-muted-foreground">
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
    <div className="rounded-lg bg-sidebar-accent/70 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{active.name}</span>
      </p>
      <p className="mt-0.5 pl-5 text-xs text-muted-foreground">
        {subject}
        {line}
      </p>
    </div>
  );
}
