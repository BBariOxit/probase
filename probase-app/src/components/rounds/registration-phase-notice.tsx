import { GraduationCap } from 'lucide-react';
import { describeRound, type RoundLike } from '@/lib/round-status';

export function RegistrationPhaseNotice({
  subject,
  round,
  hasGroup,
}: {
  subject?: string;
  round: RoundLike;
  hasGroup: boolean;
}) {
  if (round.phase === 'OPEN') return null;

  const status = describeRound(round, hasGroup);

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white px-4 py-3 shadow-2xs dark:bg-[#1a1d26]">
      <div className="flex items-start gap-3">
        <status.icon className="mt-0.5 size-4.5 shrink-0 text-primary" />
        <div className="space-y-0.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-neutral-100">
              {subject ? `${subject} · ${status.headline}` : status.headline}
            </p>
            {round.targetCohort && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
                <GraduationCap className="size-3" />
                Lớp: {round.targetCohort}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{status.detail}</p>
        </div>
      </div>
    </div>
  );
}
