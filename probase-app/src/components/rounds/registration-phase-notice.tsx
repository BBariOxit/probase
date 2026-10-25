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
    <div className="flex items-start gap-2.5 rounded-xl border bg-muted/40 px-4 py-3">
      <status.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="space-y-0.5 text-sm">
        <p className="font-medium">
          {subject ? `${subject} · ${status.headline}` : status.headline}
        </p>
        <p className="text-muted-foreground">{status.detail}</p>
      </div>
    </div>
  );
}
