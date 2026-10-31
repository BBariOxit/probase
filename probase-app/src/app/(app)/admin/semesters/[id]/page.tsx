'use client';

import { use, useState } from 'react';
import {
  Calendar,
  Clock,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
  targetCohort: string;
  officialStart: string;
  officialEnd: string;
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
            targetCohort:
              round?.targetCohort ??
              (type.code === 'DACS'
                ? 'CTK48'
                : type.code === 'DACN'
                  ? 'CTK47'
                  : 'CTK46'),
            officialStart: toDateInput(round?.officialStartDate),
            officialEnd: toDateInput(round?.officialEndDate),
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
        targetCohort: entry.row.targetCohort?.trim() || undefined,
        officialStartDate: entry.row.officialStart
          ? new Date(entry.row.officialStart).toISOString()
          : undefined,
        officialEndDate: entry.row.officialEnd
          ? new Date(entry.row.officialEnd).toISOString()
          : undefined,
        cohorts: [entry.row.cohorts],
      }));

      await save.mutateAsync({ semesterId, rounds: plan });
      toast.success('Đã lưu kế hoạch đợt đồ án thành công.');
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <div className="space-y-5">
      <FormError message={error} />

      <div className="space-y-4">
        {rows.map(({ type, row, round, locked }) => (
          <section
            key={type.id}
            className={cn(
              'space-y-4 rounded-2xl border p-5 transition-all shadow-xs',
              row.enabled
                ? 'border-border/80 bg-card hover:border-primary/40'
                : 'border-dashed border-muted bg-muted/20 opacity-75',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2.5 text-base font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    className="size-4.5 rounded-md accent-primary"
                    checked={row.enabled}
                    onChange={(event) =>
                      patch(type.id, { enabled: event.target.checked })
                    }
                  />
                  {type.name}
                </label>

                {round && <StatusPill {...PHASE[round.phase]} />}

                {row.enabled && row.targetCohort && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <GraduationCap className="size-3.5" />
                    Khóa/Lớp: {row.targetCohort}
                  </span>
                )}
              </div>

              {locked && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Lock className="size-3.5" />
                  Đợt đã đóng cổng — đổi hạn phải dùng Gia hạn
                </span>
              )}
            </div>

            {row.enabled && (
              <div className="space-y-4 pt-1">
                {/* Khối 1: Cổng đăng ký đề tài (Mở sớm trước đợt 2 tuần) */}
                <div className="space-y-3 rounded-xl border border-muted/80 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Calendar className="size-3.5 text-primary" />
                    1. Cổng đăng ký đề tài (Cuốn chiếu trước 2 tuần)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <DateField
                      id={`start-${type.id}`}
                      label="Mở đăng ký đề tài"
                      disabled={locked}
                      value={row.start}
                      onChange={(start) => patch(type.id, { start })}
                    />
                    <DateField
                      id={`end-${type.id}`}
                      label="Hạn chốt đăng ký"
                      disabled={locked}
                      value={row.end}
                      invalid={
                        row.start !== '' && row.end !== '' && row.end <= row.start
                      }
                      onChange={(end) => patch(type.id, { end })}
                    />
                    <div className="space-y-2">
                      <Label htmlFor={`cohorts-${type.id}`} className="text-xs font-medium">
                        Khóa tuyển sinh đủ điều kiện
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
                </div>

                {/* Khối 2: Kế hoạch làm đồ án chính thức (Chu kỳ 3 tháng Khoa CNTT - DLU) */}
                <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Clock className="size-3.5" />
                      2. Kế hoạch làm đồ án chính thức (3 tháng theo Kế hoạch Khoa)
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Thời lượng: 90 ngày
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`targetCohort-${type.id}`}
                        className="text-xs font-medium flex items-center gap-1.5"
                      >
                        <GraduationCap className="size-3.5 text-muted-foreground" />
                        Mã Lớp / Khóa áp dụng
                      </Label>
                      <Input
                        id={`targetCohort-${type.id}`}
                        placeholder={
                          type.code === 'DACS'
                            ? 'VD: CTK48'
                            : type.code === 'DACN'
                              ? 'VD: CTK47'
                              : 'VD: CTK46'
                        }
                        value={row.targetCohort}
                        disabled={locked}
                        onChange={(e) =>
                          patch(type.id, { targetCohort: e.target.value })
                        }
                        className="bg-background text-sm"
                      />
                    </div>
                    <DateField
                      id={`officialStart-${type.id}`}
                      label="Bắt đầu chính thức"
                      disabled={locked}
                      value={row.officialStart}
                      onChange={(officialStart) => {
                        let officialEnd = row.officialEnd;
                        if (officialStart && !officialEnd) {
                          const d = new Date(officialStart);
                          d.setDate(d.getDate() + 90);
                          officialEnd = d.toISOString().slice(0, 10);
                        }
                        patch(type.id, { officialStart, officialEnd });
                      }}
                    />
                    <DateField
                      id={`officialEnd-${type.id}`}
                      label="Kết thúc chính thức (3 tháng)"
                      disabled={locked}
                      value={row.officialEnd}
                      invalid={
                        row.officialStart !== '' &&
                        row.officialEnd !== '' &&
                        row.officialEnd <= row.officialStart
                      }
                      onChange={(officialEnd) =>
                        patch(type.id, { officialEnd })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive">
          {problems.map((problem) => (
            <li key={problem}>• {problem}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button disabled={!ready || save.isPending} onClick={submit}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Lưu kế hoạch đợt đồ án
        </Button>
        {enabled.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Bật ít nhất một loại đồ án.
          </span>
        )}
      </div>

      {rounds.some((r) => state[r.projectTypeId]?.enabled) && (
        <section className="space-y-4 border-t pt-5">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Bài phải nộp
          </h2>

          {rounds
            .filter((r) => state[r.projectTypeId]?.enabled)
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
    problems.push(`${type.name}: Chưa nhập đủ ngày mở và hạn đăng ký đề tài.`);
  } else if (row.end <= row.start) {
    problems.push(`${type.name}: Hạn đăng ký đề tài phải sau ngày mở.`);
  }

  if (
    row.officialStart !== '' &&
    row.officialEnd !== '' &&
    row.officialEnd <= row.officialStart
  ) {
    problems.push(
      `${type.name}: Ngày kết thúc 3 tháng chính thức phải sau ngày bắt đầu.`,
    );
  }

  return problems;
}
