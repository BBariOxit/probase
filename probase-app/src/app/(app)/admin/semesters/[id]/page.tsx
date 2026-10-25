'use client';

import { use, useState } from 'react';
import { Info, Loader2, Lock } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  useProjectTypes,
  useSemesterRounds,
  useSemesters,
  useSetSemesterRounds,
} from '@/lib/api/master-data';
import type {
  ProjectType,
  RegistrationRound,
  RoundPlanInput,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DateField } from '@/components/shared/date-field';
import { FormError } from '@/components/shared/form-error';
import { RoundRequirementsEditor } from '@/components/admin/round-requirements-editor';
import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getRecentCohorts } from '@/lib/utils';

const SCHEDULE_EDITABLE = ['PREP', 'OPEN'];

const PHASE: Record<string, { label: string; tone: StatusTone }> = {
  PREP: { label: 'Chưa mở', tone: 'waiting' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  EXTENDED: { label: 'Đang gia hạn', tone: 'active' },
  RECONCILING: { label: 'Đang phân bổ', tone: 'active' },
  FINALIZED: { label: 'Đã chốt', tone: 'idle' },
};

interface RowState {
  enabled: boolean;
  start: string;
  end: string;
  cohorts: string;
}

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

export default function SemesterRoundsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const semesterId = Number(id);
  const allowed = useRequireRole('ADMIN');

  const { data: semesters } = useSemesters();
  const { data: projectTypes } = useProjectTypes();
  const { data: rounds, isPending } = useSemesterRounds(semesterId);

  const semester = semesters?.find((one) => one.id === semesterId);

  // Swap the raw ID for the semester name in the breadcrumb once data arrives.
  useBreadcrumbLabel(id, semester?.name);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
          Đợt đăng ký · {semester?.name ?? `Học kỳ #${semesterId}`}
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    tabIndex={0}
                    className="cursor-default text-muted-foreground hover:text-foreground"
                  >
                    <Info className="size-4" />
                  </span>
                }
              />
              <TooltipContent>
                Mỗi loại đồ án là một đợt riêng, mở và đóng theo lịch của nó.
                <br />
                Chỉ loại nào được bật mới có đợt trong học kỳ này.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h1>
      </div>

      {isPending || !projectTypes || !rounds ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <PlanForm
            semesterId={semesterId}
            projectTypes={projectTypes}
            rounds={rounds}
          />
        </>
      )}
    </div>
  );
}

function PlanForm({
  semesterId,
  projectTypes,
  rounds,
}: {
  semesterId: number;
  projectTypes: ProjectType[];
  rounds: RegistrationRound[];
}) {
  const save = useSetSemesterRounds();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const cohortOptions = getRecentCohorts(5);
  const byType = new Map(rounds.map((round) => [round.projectTypeId, round]));

  const [state, setState] = useState<Record<number, RowState>>(() =>
    Object.fromEntries(
      projectTypes.map((type) => {
        const round = byType.get(type.id);

        return [
          type.id,
          {
            enabled: round !== undefined,
            start: toDateInput(round?.registrationStart),
            end: toDateInput(round?.registrationEnd),
            cohorts: round?.cohorts[0] ?? cohortOptions[0].value,
          } satisfies RowState,
        ];
      }),
    ),
  );

  function patch(typeId: number, changes: Partial<RowState>) {
    setSaved(false);
    setState((current) => ({
      ...current,
      [typeId]: { ...current[typeId], ...changes },
    }));
  }

  const rows = projectTypes.map((type) => {
    const row = state[type.id];
    const round = byType.get(type.id);
    const locked =
      round !== undefined && !SCHEDULE_EDITABLE.includes(round.phase);

    return { type, row, round, locked };
  });

  const enabled = rows.filter((entry) => entry.row.enabled);
  const problems = enabled.flatMap((entry) => describeProblems(entry));
  const ready = enabled.length > 0 && problems.length === 0;

  async function submit() {
    setError(null);
    setSaved(false);
    try {
      const plan: RoundPlanInput[] = enabled.map((entry) => ({
        projectTypeId: entry.type.id,
        registrationStart: new Date(entry.row.start).toISOString(),
        registrationEnd: new Date(entry.row.end).toISOString(),
        cohorts: [entry.row.cohorts],
      }));

      await save.mutateAsync({ semesterId, rounds: plan });
      toast.success('Đã lưu kế hoạch.');
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <div className="space-y-3">
        {rows.map(({ type, row, round, locked }) => (
          <section
            key={type.id}
            className={cn(
              'space-y-3 rounded-xl border p-4 transition-colors',
              !row.enabled && 'bg-muted/30',
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={row.enabled}
                  onChange={(event) =>
                    patch(type.id, { enabled: event.target.checked })
                  }
                />
                {type.name}
              </label>

              {round && <StatusPill {...PHASE[round.phase]} />}

              {locked && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" />
                  Đợt đã đóng cổng — đổi hạn phải dùng Gia hạn
                </span>
              )}
            </div>

            {row.enabled && (
              <div className="grid gap-3 sm:grid-cols-3">
                <DateField
                  id={`start-${type.id}`}
                  label="Mở đăng ký"
                  disabled={locked}
                  value={row.start}
                  onChange={(start) => patch(type.id, { start })}
                />
                <DateField
                  id={`end-${type.id}`}
                  label="Hạn đăng ký"
                  disabled={locked}
                  value={row.end}
                  invalid={
                    row.start !== '' && row.end !== '' && row.end <= row.start
                  }
                  onChange={(end) => patch(type.id, { end })}
                />
                <div className="space-y-2">
                  <Label htmlFor={`cohorts-${type.id}`}>
                    Khóa được đăng ký
                  </Label>
                  <Select
                    disabled={locked}
                    value={row.cohorts}
                    onValueChange={(value) => {
                      if (value) patch(type.id, { cohorts: value });
                    }}
                  >
                    <SelectTrigger id={`cohorts-${type.id}`} className="w-full">
                      <SelectValue placeholder="Chọn khoá" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohortOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button disabled={!ready || save.isPending} onClick={submit}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Lưu kế hoạch
        </Button>
        {enabled.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Bật ít nhất một loại đồ án.
          </span>
        )}
      </div>

      {rounds.some((r) => state[r.projectTypeId].enabled) && (
        <section className="space-y-4 border-t pt-5">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Bài phải nộp
          </h2>

          {rounds
            .filter((r) => state[r.projectTypeId].enabled)
            .map((round) => (
              <RoundRequirementsEditor key={round.id} round={round} />
            ))}
        </section>
      )}
    </div>
  );
}

function describeProblems({
  type,
  row,
}: {
  type: ProjectType;
  row: RowState;
}): string[] {
  const problems: string[] = [];

  if (row.start === '' || row.end === '') {
    problems.push(`${type.name}: chưa nhập đủ ngày mở và hạn đăng ký.`);
  } else if (row.end <= row.start) {
    problems.push(`${type.name}: hạn đăng ký phải sau ngày mở.`);
  }

  return problems;
}
