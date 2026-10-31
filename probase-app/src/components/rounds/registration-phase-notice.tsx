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
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/80 bg-linear-to-r from-muted/60 via-muted/30 to-background px-4 py-3 shadow-2xs">
      <div className="flex items-start gap-3">
        <status.icon className="mt-0.5 size-4.5 shrink-0 text-primary" />
        <div className="space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {subject ? `${subject} · ${status.headline}` : status.headline}
            </p>
            {round.targetCohort && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <GraduationCap className="size-3" />
                Lớp: {round.targetCohort}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">{status.detail}</p>
        </div>
      </div>
    </div>
  );
}
