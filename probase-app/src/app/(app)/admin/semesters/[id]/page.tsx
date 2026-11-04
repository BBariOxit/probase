'use client';

import { use, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  GraduationCap,
  Info,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
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
  SubmissionRequirement,
} from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { cn, getRecentCohorts } from '@/lib/utils';
import { DateField } from '@/components/shared/date-field';
import { FormError } from '@/components/shared/form-error';
import {
  RoundRequirementsEditor,
  type RequirementRow,
} from '@/components/admin/round-requirements-editor';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SCHEDULE_EDITABLE = ['PREP', 'OPEN'];

const PHASE: Record<string, { label: string; tone: StatusTone }> = {
  PREP: { label: 'Chưa mở', tone: 'waiting' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  EXTENDED: { label: 'Đang gia hạn', tone: 'active' },
  RECONCILING: { label: 'Đang phân bổ', tone: 'active' },
  FINALIZED: { label: 'Đã chốt', tone: 'idle' },
};

interface TabFormState {
  enabled: boolean;
  start: string;
  end: string;
  cohorts: string;
  targetCohort: string;
  officialStart: string;
  officialEnd: string;
  requirements: RequirementRow[];
}

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

interface ValidationError {
  typeId: number;
  elementId: string;
  message: string;
}

function validateAllTabs(
  projectTypes: ProjectType[],
  formState: Record<number, TabFormState>,
): ValidationError | null {
  for (const type of projectTypes) {
    const tab = formState[type.id];
    if (!tab || !tab.enabled) continue;

    if (!tab.start) {
      return {
        typeId: type.id,
        elementId: `start-${type.id}`,
        message: `${type.name}: Chưa nhập ngày bắt đầu đăng ký.`,
      };
    }

    if (!tab.end) {
      return {
        typeId: type.id,
        elementId: `end-${type.id}`,
        message: `${type.name}: Chưa nhập hạn chốt đăng ký.`,
      };
    }

    if (tab.end <= tab.start) {
      return {
        typeId: type.id,
        elementId: `end-${type.id}`,
        message: `${type.name}: Hạn đăng ký phải sau ngày mở.`,
      };
    }

    if (
      tab.officialStart !== '' &&
      tab.officialEnd !== '' &&
      tab.officialEnd <= tab.officialStart
    ) {
      return {
        typeId: type.id,
        elementId: `officialEnd-${type.id}`,
        message: `${type.name}: Ngày kết thúc phải sau ngày bắt đầu.`,
      };
    }

    const seenNames = new Map<string, number>();
    for (let i = 0; i < tab.requirements.length; i++) {
      const req = tab.requirements[i];
      const trimmedName = req.name.trim();

      if (!trimmedName) {
        return {
          typeId: type.id,
          elementId: `req-name-${type.id}-${i}`,
          message: `${type.name}: Mục bài nộp #${i + 1} chưa có tên.`,
        };
      }

      if (!req.due) {
        return {
          typeId: type.id,
          elementId: `req-due-${type.id}-${i}`,
          message: `${type.name}: "${trimmedName}" chưa có hạn nộp.`,
        };
      }

      const lowerName = trimmedName.toLowerCase();
      if (seenNames.has(lowerName)) {
        return {
          typeId: type.id,
          elementId: `req-name-${type.id}-${i}`,
          message: `${type.name}: Tên bài nộp "${trimmedName}" bị trùng lặp.`,
        };
      }
      seenNames.set(lowerName, i);
    }
  }

  return null;
}

function checkTabDirty(
  current: TabFormState | undefined,
  initial: TabFormState | undefined,
): boolean {
  if (!current || !initial) return false;

  if (current.enabled !== initial.enabled) return true;
  if (current.start !== initial.start) return true;
  if (current.end !== initial.end) return true;
  if (current.cohorts !== initial.cohorts) return true;
  if (current.targetCohort !== initial.targetCohort) return true;
  if (current.officialStart !== initial.officialStart) return true;
  if (current.officialEnd !== initial.officialEnd) return true;

  if (current.requirements.length !== initial.requirements.length) return true;
  for (let i = 0; i < current.requirements.length; i++) {
    const cReq = current.requirements[i];
    const iReq = initial.requirements[i];
    if (
      cReq.id !== iReq.id ||
      cReq.name !== iReq.name ||
      cReq.due !== iReq.due ||
      cReq.isRequired !== iReq.isRequired
    ) {
      return true;
    }
  }

  return false;
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
  const {
    data: rounds,
    isPending: roundsPending,
    error: roundsError,
    refetch: refetchRounds,
  } = useSemesterRounds(semesterId);

  const semester = semesters?.find((one) => one.id === semesterId);

  useBreadcrumbLabel(id, semester?.name);

  const requirementsQueries = useQueries({
    queries: (rounds ?? []).map((round) => ({
      queryKey: ['rounds', round.id, 'requirements'],
      queryFn: () =>
        api<SubmissionRequirement[]>(`/rounds/${round.id}/requirements`),
      staleTime: 60_000,
    })),
  });

  const isPending =
    roundsPending ||
    !projectTypes ||
    !rounds ||
    requirementsQueries.some((q) => q.isPending);

  const [version, setVersion] = useState(0);

  const initialRequirements = useMemo(() => {
    const map = new Map<number, RequirementRow[]>();
    (rounds ?? []).forEach((round, idx) => {
      const q = requirementsQueries[idx];
      if (q?.data) {
        map.set(
          round.projectTypeId,
          q.data.map((r) => ({
            id: r.id,
            name: r.name,
            due: r.dueAt.slice(0, 10),
            isRequired: r.isRequired,
          })),
        );
      }
    });
    return map;
  }, [rounds, requirementsQueries]);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-neutral-100">
          Đợt đăng ký · {semester?.name ?? `Học kỳ #${semesterId}`}
        </h1>
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="cursor-default text-primary hover:opacity-80 transition"
                >
                  <Info className="size-4" />
                </span>
              }
            />
            <TooltipContent>
              Mỗi loại đồ án là một đợt riêng, mở và đóng theo lịch của nó.
              <br />
              Chỉ loại nào được kích hoạt mới mở đợt trong học kỳ này.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {roundsError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-destructive">
            Không thể tải dữ liệu đợt đăng ký ({roundsError.message}).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRounds()}
            className="cursor-pointer"
          >
            Thử lại
          </Button>
        </div>
      ) : isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <PlanTabsForm
          key={`${semesterId}-${version}`}
          semesterId={semesterId}
          projectTypes={projectTypes}
          rounds={rounds}
          initialRequirements={initialRequirements}
          onSaved={async () => {
            await refetchRounds();
            requirementsQueries.forEach((q) => q.refetch());
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function PlanTabsForm({
  semesterId,
  projectTypes,
  rounds,
  initialRequirements,
  onSaved,
}: {
  semesterId: number;
  projectTypes: ProjectType[];
  rounds: RegistrationRound[];
  initialRequirements: Map<number, RequirementRow[]>;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const savePlanMutation = useSetSemesterRounds();
  const [activeTypeId, setActiveTypeId] = useState<number>(
    () => projectTypes[0]?.id ?? 1,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cohortOptions = getRecentCohorts(5);
  const byType = useMemo(
    () => new Map(rounds.map((round) => [round.projectTypeId, round])),
    [rounds],
  );

  const initialFormState: Record<number, TabFormState> = useMemo(() => {
    return Object.fromEntries(
      projectTypes.map((type) => {
        const round = byType.get(type.id);
        const reqs = initialRequirements.get(type.id) ?? [];

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
            requirements: reqs,
          } satisfies TabFormState,
        ];
      }),
    );
  }, [projectTypes, byType, initialRequirements, cohortOptions]);

  const [formState, setFormState] =
    useState<Record<number, TabFormState>>(initialFormState);

  function patch(typeId: number, changes: Partial<TabFormState>) {
    setFormState((current) => ({
      ...current,
      [typeId]: { ...current[typeId], ...changes },
    }));
  }

  function isTabDirty(typeId: number): boolean {
    return checkTabDirty(formState[typeId], initialFormState[typeId]);
  }

  const hasAnyChanges = projectTypes.some((type) => isTabDirty(type.id));

  const rows = projectTypes.map((type) => {
    const row = formState[type.id];
    const round = byType.get(type.id);
    const locked =
      round !== undefined && !SCHEDULE_EDITABLE.includes(round.phase);

    return { type, row, round, locked };
  });

  async function handleSaveAll() {
    setError(null);

    const validationError = validateAllTabs(projectTypes, formState);
    if (validationError) {
      setActiveTypeId(validationError.typeId);
      setError(validationError.message);
      toast.error('Vui lòng kiểm tra lại thông tin ở các tab');
      setTimeout(() => {
        const el = document.getElementById(validationError.elementId);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    const enabledTabs = projectTypes
      .map((type) => ({ type, tab: formState[type.id] }))
      .filter((entry) => entry.tab?.enabled);

    if (enabledTabs.length === 0) {
      toast.error('Cần kích hoạt ít nhất một đợt đồ án');
      return;
    }

    setIsSaving(true);
    try {
      const plan: RoundPlanInput[] = enabledTabs.map((entry) => ({
        projectTypeId: entry.type.id,
        registrationStart: new Date(entry.tab.start).toISOString(),
        registrationEnd: new Date(entry.tab.end).toISOString(),
        targetCohort: entry.tab.targetCohort?.trim() || undefined,
        officialStartDate: entry.tab.officialStart
          ? new Date(entry.tab.officialStart).toISOString()
          : undefined,
        officialEndDate: entry.tab.officialEnd
          ? new Date(entry.tab.officialEnd).toISOString()
          : undefined,
        cohorts: [entry.tab.cohorts],
      }));

      const savedRounds = await savePlanMutation.mutateAsync({
        semesterId,
        rounds: plan,
      });

      const savedRoundMap = new Map(savedRounds.map((r) => [r.projectTypeId, r]));

      await Promise.all(
        enabledTabs.map(async (entry) => {
          const savedRound = savedRoundMap.get(entry.type.id);
          if (!savedRound) return;

          await api(`/rounds/${savedRound.id}/requirements`, {
            method: 'PUT',
            body: {
              requirements: entry.tab.requirements.map((req) => ({
                id: req.id,
                name: req.name.trim(),
                dueAt: new Date(req.due).toISOString(),
                isRequired: req.isRequired,
              })),
            },
          });
        }),
      );

      await queryClient.invalidateQueries({
        queryKey: ['semesters', semesterId, 'rounds'],
      });
      await queryClient.invalidateQueries({ queryKey: ['rounds'] });

      toast.success('Đã lưu cấu hình đợt đăng ký thành công');
      onSaved();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không kết nối được máy chủ';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />

      <Tabs
        value={String(activeTypeId)}
        onValueChange={(val) => {
          setError(null);
          setActiveTypeId(Number(val));
        }}
      >
        <TabsList className="w-full h-auto p-1.5 bg-slate-200/80 dark:bg-[#141414] border border-slate-300 dark:border-neutral-800 rounded-xl grid grid-cols-3 gap-1.5">
          {rows.map(({ type }) => {
            const isActive = activeTypeId === type.id;
            const dirty = isTabDirty(type.id);

            return (
              <TabsTrigger
                key={type.id}
                value={String(type.id)}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-sm transition-all cursor-pointer font-medium flex items-center justify-center gap-2',
                  isActive
                    ? 'bg-primary text-white dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-300/40 dark:hover:bg-neutral-800/40',
                )}
              >
                <span
                  className={cn(
                    'truncate',
                    isActive ? 'text-white dark:text-white font-bold' : '',
                  )}
                >
                  {type.name}
                </span>
                {dirty && (
                  <span
                    className={cn(
                      'size-2 rounded-full shrink-0',
                      isActive ? 'bg-white' : 'bg-primary',
                    )}
                    title="Có thay đổi chưa lưu"
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {rows.map(({ type, row, round, locked }) => {
          return (
            <TabsContent key={type.id} value={String(type.id)} className="mt-4">
              <div className="space-y-6 rounded-xl border border-[#d1d5e0] dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#d1d5e0] dark:border-neutral-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="size-4 rounded accent-primary cursor-pointer"
                        checked={row.enabled}
                        onChange={(e) =>
                          patch(type.id, { enabled: e.target.checked })
                        }
                      />
                      <span className="text-base font-bold text-slate-900 dark:text-neutral-100">
                        {type.name}
                      </span>
                    </label>

                    {round && <StatusPill {...PHASE[round.phase]} />}
                  </div>

                  {locked && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <Lock className="size-3.5" />
                      Đợt đã đóng cổng — đổi hạn phải dùng Gia hạn
                    </span>
                  )}
                </div>

                {!row.enabled ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-[#262626] text-primary">
                      <Calendar className="size-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                      {type.name} chưa kích hoạt
                    </p>
                    <button
                      type="button"
                      onClick={() => patch(type.id, { enabled: true })}
                      className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                    >
                      Kích hoạt đợt
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-primary" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                          Giai đoạn 1: Đăng ký đề tài
                        </h3>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <DateField
                          id={`start-${type.id}`}
                          label="Bắt đầu đăng ký"
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
                            row.start !== '' &&
                            row.end !== '' &&
                            row.end <= row.start
                          }
                          onChange={(end) => patch(type.id, { end })}
                        />
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`cohorts-${type.id}`}
                            className="text-xs font-medium text-slate-800 dark:text-neutral-300"
                          >
                            Khóa tuyển sinh đủ điều kiện
                          </Label>
                          <Select
                            disabled={locked}
                            value={row.cohorts}
                            onValueChange={(value) => {
                              if (value) patch(type.id, { cohorts: value });
                            }}
                          >
                            <SelectTrigger
                              id={`cohorts-${type.id}`}
                              className="w-full h-9 text-sm rounded-lg border-[1.5px] border-[#c4c9d9] bg-white px-3 text-slate-900 transition focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary"
                            >
                              <SelectValue placeholder="Chọn khoá" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]">
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

                    <div className="border-t border-[#d1d5e0] dark:border-neutral-800 my-6" />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                          Giai đoạn 2: Thực hiện đồ án
                        </h3>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`targetCohort-${type.id}`}
                            className="text-xs font-medium text-slate-800 dark:text-neutral-300 flex items-center gap-1.5"
                          >
                            <GraduationCap className="size-3.5 text-primary" />
                            Mã Lớp / Khóa áp dụng
                          </Label>
                          <input
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
                            className="h-9 w-full rounded-lg border-[1.5px] border-[#c4c9d9] bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] dark:border-neutral-700 dark:bg-[#141414] dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary dark:focus:ring-1 dark:focus:ring-primary disabled:opacity-50"
                          />
                        </div>

                        <DateField
                          id={`officialStart-${type.id}`}
                          label="Ngày bắt đầu"
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
                          label="Ngày kết thúc"
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

                    <div className="border-t border-[#d1d5e0] dark:border-neutral-800 my-6" />

                    <RoundRequirementsEditor
                      typeId={type.id}
                      requirements={row.requirements}
                      disabled={locked}
                      defaultDue={row.officialEnd || row.end}
                      onChange={(requirements) =>
                        patch(type.id, { requirements })
                      }
                    />

                    <div className="pt-2 text-xs text-slate-500 dark:text-neutral-400">
                      Áp dụng cho đợt:{' '}
                      <strong className="text-slate-800 dark:text-neutral-200">
                        {type.name}{' '}
                        {row.targetCohort ? `(${row.targetCohort})` : ''}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex items-center justify-between pt-6 border-t border-[#d1d5e0] dark:border-neutral-800">
        <div className="text-xs text-slate-500 dark:text-neutral-400">
          {hasAnyChanges ? (
            <span className="flex items-center gap-1.5 text-primary font-medium">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Có thay đổi chưa lưu trên các tab
            </span>
          ) : (
            <span>Đã lưu tất cả thay đổi</span>
          )}
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveAll}
          className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}
