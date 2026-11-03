'use client';

import { use, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  GraduationCap,
  Info,
  Loader2,
  Lock,
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
import { getRecentCohorts } from '@/lib/utils';
import { toast } from 'sonner';
import { DateField } from '@/components/shared/date-field';
import { FormError } from '@/components/shared/form-error';
import {
  RoundRequirementsEditor,
  type RoundRequirementsEditorRef,
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

function getDaysDifference(start: string, end: string): number | null {
  if (!start || !end) return null;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
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
  const { data: rounds, isPending, error: roundsError, refetch } = useSemesterRounds(semesterId);

  const semester = semesters?.find((one) => one.id === semesterId);

  useBreadcrumbLabel(id, semester?.name);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          Đợt đăng ký · {semester?.name ?? `Học kỳ #${semesterId}`}
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    tabIndex={0}
                    className="cursor-default text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
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
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Quản lý lịch trình đăng ký, thời gian thực hiện và danh mục bài nộp cho từng loại đồ án.
        </p>
      </div>

      {roundsError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-destructive">
            Không thể tải dữ liệu đợt đăng ký ({roundsError.message}).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="cursor-pointer"
          >
            Thử lại
          </Button>
        </div>
      ) : isPending || !projectTypes || !rounds ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <PlanTabsForm
          semesterId={semesterId}
          projectTypes={projectTypes}
          rounds={rounds}
        />
      )}
    </div>
  );
}

function PlanTabsForm({
  semesterId,
  projectTypes,
  rounds,
}: {
  semesterId: number;
  projectTypes: ProjectType[];
  rounds: RegistrationRound[];
}) {
  const savePlanMutation = useSetSemesterRounds();
  const [activeTypeId, setActiveTypeId] = useState<number>(() => projectTypes[0]?.id ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editorRef = useRef<RoundRequirementsEditorRef>(null);

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
  const activeEntry = rows.find((entry) => entry.type.id === activeTypeId) ?? rows[0];

  async function handleSaveActiveTab() {
    setError(null);
    setIsSaving(true);

    try {
      // 1. Lưu kế hoạch đợt cho các loại đồ án được bật
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

      await savePlanMutation.mutateAsync({ semesterId, rounds: plan });

      // 2. Lưu danh mục bài nộp nếu có thay đổi trong tab hiện tại
      if (editorRef.current?.hasChanges) {
        const ok = await editorRef.current.submit();
        if (!ok) {
          throw new Error('Không thể lưu danh mục bài nộp. Vui lòng kiểm tra lại hạn nộp và tên bài.');
        }
      }

      toast.success(`Đã lưu cấu hình ${activeEntry.type.name} thành công.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Không kết nối được máy chủ');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <FormError message={error} />

      <Tabs
        value={String(activeTypeId)}
        onValueChange={(val) => {
          setError(null);
          setActiveTypeId(Number(val));
        }}
      >
        {/* Segmented Control Tabs - Vercel / Linear Style */}
        <TabsList className="w-full h-auto p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl grid grid-cols-3 gap-1">
          {rows.map(({ type }) => (
            <TabsTrigger
              key={type.id}
              value={String(type.id)}
              className="py-2 px-3 rounded-lg text-sm transition-all cursor-pointer"
            >
              <span className="truncate">{type.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {rows.map(({ type, row, round, locked }) => {
          const daysDiff = getDaysDifference(row.officialStart, row.officialEnd);
          const problems = describeProblems({ type, row });

          return (
            <TabsContent key={type.id} value={String(type.id)} className="mt-4">
              {/* Duy nhất 1 Primary Surface Card - Chuẩn hóa Hybrid Theming */}
              <div className="space-y-6 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121215] p-6 shadow-sm">
                {/* Header của Tab: Bật/Tắt & Trạng thái */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="size-4.5 rounded accent-black dark:accent-white cursor-pointer"
                        checked={row.enabled}
                        onChange={(e) =>
                          patch(type.id, { enabled: e.target.checked })
                        }
                      />
                      <div>
                        <span className="text-base font-bold text-slate-900 dark:text-zinc-100">
                          {type.name}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {row.enabled
                            ? 'Đang áp dụng trong học kỳ này'
                            : 'Chưa kích hoạt cho học kỳ này'}
                        </p>
                      </div>
                    </label>

                    {round && <StatusPill {...PHASE[round.phase]} />}

                    {row.enabled && row.targetCohort && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-zinc-300">
                        <GraduationCap className="size-3.5" />
                        Khóa: {row.targetCohort}
                      </span>
                    )}
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
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
                      <Calendar className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                        {type.name} chưa được kích hoạt trong học kỳ này
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                        Tích chọn &ldquo;Đang áp dụng trong học kỳ này&rdquo; ở trên để thiết lập lịch mở đăng ký và kế hoạch thực hiện.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => patch(type.id, { enabled: true })}
                      className="mt-2 inline-flex items-center rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer"
                    >
                      Kích hoạt {type.name}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Giai đoạn 1: Đăng ký đề tài */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-slate-500 dark:text-zinc-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
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
                            row.start !== '' && row.end !== '' && row.end <= row.start
                          }
                          onChange={(end) => patch(type.id, { end })}
                        />
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`cohorts-${type.id}`}
                            className="text-xs font-medium text-slate-800 dark:text-slate-100"
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
                              className="w-full h-9 text-sm rounded-lg border border-slate-300 bg-white px-3 text-slate-900 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-white/20 dark:bg-black dark:text-zinc-50 dark:focus:border-white dark:focus:ring-1 dark:focus:ring-white"
                            >
                              <SelectValue placeholder="Chọn khoá" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215]">
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

                    {/* Đường phân cách mảnh border-t */}
                    <div className="border-t border-slate-200 dark:border-white/10" />

                    {/* Giai đoạn 2: Thực hiện đồ án */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-slate-500 dark:text-zinc-400" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Giai đoạn 2: Thực hiện đồ án
                          </h3>
                        </div>
                        {daysDiff && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
                            Thời lượng: {daysDiff} ngày
                          </span>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`targetCohort-${type.id}`}
                            className="text-xs font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
                          >
                            <GraduationCap className="size-3.5 text-slate-400" />
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
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-white/20 dark:bg-black dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:ring-1 dark:focus:ring-white disabled:opacity-50"
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

                    {/* Đường phân cách mảnh border-t */}
                    <div className="border-t border-slate-200 dark:border-white/10" />

                    {/* Danh mục bài phải nộp */}
                    {round ? (
                      <RoundRequirementsEditor
                        ref={editorRef}
                        round={round}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-5 text-center text-xs text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-950/30">
                        Đợt đồ án này chưa được lưu trong cơ sở dữ liệu. Nhấn <strong>Lưu cấu hình</strong> bên dưới để tạo đợt, sau đó danh mục bài nộp sẽ sẵn sàng để thiết lập.
                      </div>
                    )}

                    {/* Footer: 1 nút Primary CTA duy nhất */}
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-5">
                      <span className="text-xs text-slate-500 dark:text-zinc-400">
                        {problems.length > 0 ? (
                          <span className="text-destructive font-medium">• {problems[0]}</span>
                        ) : (
                          <>
                            Áp dụng cho đợt:{' '}
                            <strong className="text-slate-800 dark:text-zinc-200">
                              {type.name} {row.targetCohort ? `(${row.targetCohort})` : ''}
                            </strong>
                          </>
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={problems.length > 0 || isSaving}
                        onClick={handleSaveActiveTab}
                        className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSaving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Lưu cấu hình
                      </button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
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
      `${type.name}: Ngày kết thúc thực hiện đồ án phải sau ngày bắt đầu.`,
    );
  }

  return problems;
}
