'use client';

import { useMemo, useState } from 'react';
import {
  CalendarRange,
  Loader2,
  Search,
  Shuffle,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMajors } from '@/lib/api/majors';
import { useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import {
  useAssignReviewer,
  useReviewAssignmentsOverview,
  useUnassignReviewer,
} from '@/lib/api/reviewers';
import type { ReviewAssignmentGroupItem } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { sanitizeLecturerName } from '@/lib/utils';
import { AutoAssignDialog } from '@/components/reviewers/auto-assign-dialog';
import { DefenseEligibilityAdminView } from '@/components/reviews/defense-eligibility-admin-view';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ASSIGNMENT_STATUS_OPTIONS: Array<{
  value: 'ALL' | 'UNASSIGNED' | 'ASSIGNED';
  label: string;
}> = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'UNASSIGNED', label: 'Chưa phân công' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
];

export default function ReviewersAdminPage() {
  const allowed = useRequireRole('ADMIN');
  const {
    data: semesters,
    isPending: semestersPending,
    error: semestersError,
  } = useSemesters();
  const { data: majors } = useMajors();

  const defaultSemesterId = useMemo(
    () => semesters?.find((s) => s.isActive)?.id ?? semesters?.[0]?.id,
    [semesters],
  );

  const [activeTab, setActiveTab] = useState<'ASSIGNMENT' | 'ELIGIBILITY'>(
    'ASSIGNMENT',
  );
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [roundId, setRoundId] = useState<string>('ALL');
  const [majorId, setMajorId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] =
    useState<ReviewAssignmentGroupItem | null>(null);
  const [assigningGroupId, setAssigningGroupId] = useState<number | null>(null);

  const currentSemesterId = semesterId ?? defaultSemesterId;
  const { data: rounds } = useRoundsForSemester(currentSemesterId);
  const debouncedSearch = useDebouncedValue(searchQuery);

  const parsedRoundId = roundId === 'ALL' ? undefined : Number(roundId);
  const parsedMajorId = majorId === 'ALL' ? undefined : Number(majorId);

  const {
    data: overview,
    isPending,
    error,
  } = useReviewAssignmentsOverview(
    {
      semesterId: currentSemesterId,
      roundId: parsedRoundId,
      majorId: parsedMajorId,
      status: selectedStatus,
      q: debouncedSearch.trim() || undefined,
    },
    { enabled: allowed && currentSemesterId !== undefined },
  );

  const assign = useAssignReviewer();
  const unassign = useUnassignReviewer();

  if (!allowed) return null;

  if (!semestersPending && !semestersError && !currentSemesterId) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <h1 className="text-lg font-semibold">Phân công GVPB</h1>
        <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <EmptyState
            icon={CalendarRange}
            title="Chưa có học kỳ nào trong hệ thống."
          />
        </div>
      </div>
    );
  }

  const activeSemesterObj = semesters?.find((s) => s.id === currentSemesterId);
  const activeRoundObj = rounds?.find((r) => r.id === parsedRoundId);
  const activeMajorObj = majors?.find((m) => m.id === parsedMajorId);

  async function handleAssignChange(
    group: ReviewAssignmentGroupItem,
    nextVal: string,
  ) {
    if (!nextVal) return;
    const reviewerId = Number(nextVal);
    if (!reviewerId || group.assignment?.reviewerId === reviewerId) return;

    setAssigningGroupId(group.id);
    try {
      await assign.mutateAsync({ groupId: group.id, reviewerId });
      toast.success('Đã cập nhật giảng viên phản biện.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không phân công được GVPB.',
      );
    } finally {
      setAssigningGroupId(null);
    }
  }

  return (
    <TooltipProvider delay={200}>
      <div className="w-full min-w-0 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Phân công GVPB</h1>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {semesters && semesters.length > 0 && (
              <Select
                value={currentSemesterId ? String(currentSemesterId) : ''}
                onValueChange={(val) => {
                  setSemesterId(val ? Number(val) : undefined);
                  setRoundId('ALL');
                }}
              >
                <SelectTrigger className="w-52" aria-label="Chọn học kỳ">
                  <SelectValue>
                    {(value) => {
                      const sem = semesters.find(
                        (s) => String(s.id) === String(value),
                      );
                      return sem
                        ? `${sem.name}${sem.isActive ? ' (Hiện tại)' : ''}`
                        : 'Chọn học kỳ';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      {s.isActive ? ' (Hiện tại)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={roundId}
              onValueChange={(val) => setRoundId(val ?? 'ALL')}
            >
              <SelectTrigger className="w-44" aria-label="Lọc theo đợt đồ án">
                <SelectValue>
                  {(value) => {
                    if (value === 'ALL') return 'Mọi đợt đồ án';
                    return (
                      rounds?.find((r) => String(r.id) === String(value))
                        ?.projectType.name ?? 'Mọi đợt đồ án'
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Mọi đợt đồ án</SelectItem>
                {rounds?.map((round) => (
                  <SelectItem key={round.id} value={String(round.id)}>
                    {round.projectType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === 'ASSIGNMENT' && (
              <Button
                onClick={() => setAutoAssignOpen(true)}
                disabled={!currentSemesterId}
                className="gap-1.5 cursor-pointer"
              >
                <Shuffle className="size-4" />
                <span>Phân công tự động</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            setActiveTab(val as 'ASSIGNMENT' | 'ELIGIBILITY')
          }
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="ASSIGNMENT">Phân công GVPB</TabsTrigger>
            <TabsTrigger value="ELIGIBILITY">Điều kiện bảo vệ</TabsTrigger>
          </TabsList>

          <TabsContent value="ASSIGNMENT" className="space-y-4">
            {/* Summary Strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] px-5 py-3 shadow-2xs text-sm">
              <SummaryFigure
                value={overview?.stats.totalGroups ?? 0}
                label="tổng đề tài"
              />
              <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
              <SummaryFigure
                value={overview?.stats.assignedCount ?? 0}
                label="đã phân công"
                valueClass="text-emerald-600 dark:text-emerald-400"
              />
              <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
              <SummaryFigure
                value={overview?.stats.unassignedCount ?? 0}
                label="chưa phân công"
                valueClass="text-amber-600 dark:text-amber-400"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm đề tài, GVHD, nhóm, SV, MSSV…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8"
                  aria-label="Tìm kiếm đề tài phân công GVPB"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Xóa từ khóa"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <Select
                value={majorId}
                onValueChange={(val) => setMajorId(val ?? 'ALL')}
              >
                <SelectTrigger
                  className="w-48"
                  aria-label="Lọc theo chuyên ngành"
                >
                  <SelectValue>
                    {(value) => {
                      if (value === 'ALL') return 'Mọi chuyên ngành';
                      return (
                        majors?.find((m) => String(m.id) === String(value))
                          ?.name ?? 'Mọi chuyên ngành'
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Mọi chuyên ngành</SelectItem>
                  {majors?.map((major) => (
                    <SelectItem key={major.id} value={String(major.id)}>
                      {major.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus}
                onValueChange={(val) =>
                  setSelectedStatus(
                    (val ?? 'ALL') as 'ALL' | 'ASSIGNED' | 'UNASSIGNED',
                  )
                }
              >
                <SelectTrigger
                  className="w-44"
                  aria-label="Lọc theo trạng thái phân công"
                >
                  <SelectValue>
                    {(value) =>
                      ASSIGNMENT_STATUS_OPTIONS.find(
                        (opt) => opt.value === value,
                      )?.label ?? 'Mọi trạng thái'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(semestersError || error) && (
              <p className="text-sm text-destructive">
                Không tải được dữ liệu phân công GVPB.
              </p>
            )}

            {/* Table */}
            <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
              {isPending ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : !overview || overview.groups.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Không tìm thấy đề tài nào phù hợp với bộ lọc."
                />
              ) : (
                <Table
                  containerClassName="w-full overflow-x-auto"
                  className="w-full min-w-[980px] table-fixed text-left text-sm"
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px] px-4">
                        Đề tài
                      </TableHead>
                      <TableHead className="w-[215px] px-3">
                        Nhóm sinh viên
                      </TableHead>
                      <TableHead className="w-[175px] px-3 whitespace-nowrap">
                        GVHD
                      </TableHead>
                      <TableHead className="w-[245px] px-3 whitespace-nowrap">
                        Giảng viên phản biện
                      </TableHead>
                      <TableHead className="w-[115px] px-4 text-right whitespace-nowrap">
                        Tiến độ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.groups.map((group) => {
                      const supervisorId = group.topic.lecturer.id;
                      const topicMajorId = group.topic.majorId;
                      const supervisor = sanitizeLecturerName(
                        group.topic.lecturer.fullName,
                        group.topic.lecturer.academicTitle,
                      );

                      const eligibleCandidates = overview.candidates.filter(
                        (cand) => {
                          if (cand.id === supervisorId) return false;
                          if (
                            topicMajorId &&
                            cand.majorId &&
                            cand.majorId !== topicMajorId
                          ) {
                            return false;
                          }
                          return true;
                        },
                      );

                      const candidateOptions: ComboboxOption[] =
                        eligibleCandidates.map((cand) => {
                          const s = sanitizeLecturerName(
                            cand.fullName,
                            cand.academicTitle,
                          );
                          return {
                            value: String(cand.id),
                            label: s.displayName,
                            subLabel: `HD ${cand.supervisedCount} · PB ${cand.reviewingCount}${
                              cand.isHeadOfDepartment ? ' · TTBM' : ''
                            }`,
                          };
                        });

                      if (
                        group.assignment &&
                        !candidateOptions.some(
                          (o) =>
                            o.value === String(group.assignment!.reviewerId),
                        )
                      ) {
                        const cur = sanitizeLecturerName(
                          group.assignment.reviewer.fullName,
                          group.assignment.reviewer.academicTitle,
                        );
                        candidateOptions.unshift({
                          value: String(group.assignment.reviewerId),
                          label: cur.displayName,
                        });
                      }

                      const stage1 = group.progressReports.find(
                        (r) => r.stage === 'STAGE_1',
                      );
                      const stage2 = group.progressReports.find(
                        (r) => r.stage === 'STAGE_2',
                      );
                      const isRowBusy = assigningGroupId === group.id;

                      return (
                        <TableRow
                          key={group.id}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                        >
                          <TableCell className="align-top px-4 py-3 whitespace-normal">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <p className="font-semibold text-slate-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                                    {group.topic.title}
                                  </p>
                                }
                              />
                              <TooltipContent className="max-w-sm">
                                {group.topic.title}
                              </TooltipContent>
                            </Tooltip>
                            {(group.topic.major ||
                              group.topic.round?.projectType) && (
                              <p className="mt-1 text-xs text-muted-foreground truncate">
                                {[
                                  group.topic.major?.name,
                                  group.topic.round?.projectType?.name,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="align-top px-3 py-3 text-xs">
                            <div className="space-y-0.5">
                              {group.members.map((m) => (
                                <div key={m.student.id} className="truncate">
                                  <span className="font-medium text-foreground">
                                    {m.student.fullName}
                                  </span>{' '}
                                  <span className="text-muted-foreground">
                                    (
                                    <span className="font-mono font-semibold text-primary">
                                      {m.student.studentCode}
                                    </span>
                                    {m.student.class
                                      ? ` · ${m.student.class}`
                                      : ''}
                                    )
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>

                          <TableCell className="align-top px-3 py-3">
                            <p className="font-medium text-slate-800 dark:text-neutral-200 truncate">
                              {supervisor.displayName}
                            </p>
                            {supervisor.departmentRole && (
                              <p className="text-xs text-muted-foreground truncate">
                                {supervisor.departmentRole}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="align-top px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <Combobox
                                options={candidateOptions}
                                value={
                                  group.assignment
                                    ? String(group.assignment.reviewerId)
                                    : ''
                                }
                                onChange={(val) =>
                                  handleAssignChange(group, val)
                                }
                                placeholder="Chọn GVPB…"
                                searchPlaceholder="Tìm giảng viên…"
                                emptyText="Không có giảng viên cùng bộ môn"
                                disabled={isRowBusy}
                                className="flex-1 min-w-0"
                                aria-label={`Chọn giảng viên phản biện cho ${group.topic.title}`}
                              />
                              {isRowBusy ? (
                                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                              ) : group.assignment ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Hủy phân công"
                                  aria-label="Hủy phân công phản biện"
                                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                  onClick={() => setUnassignTarget(group)}
                                >
                                  <X className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className="align-top px-4 py-3 text-right text-xs tabular-nums">
                            <div className="space-y-0.5 text-muted-foreground">
                              <p>
                                Đ1:{' '}
                                <span className="font-medium text-foreground">
                                  {stage1?.finalStageGrade !== null &&
                                  stage1?.finalStageGrade !== undefined
                                    ? `${stage1.finalStageGrade.toFixed(1)}đ`
                                    : '—'}
                                </span>
                              </p>
                              <p>
                                Đ2:{' '}
                                <span
                                  className={
                                    stage2?.workloadPercentage !== null &&
                                    stage2?.workloadPercentage !== undefined
                                      ? stage2.isPassed === false
                                        ? 'font-medium text-rose-600 dark:text-rose-400'
                                        : 'font-medium text-emerald-600 dark:text-emerald-400'
                                      : 'font-medium text-foreground'
                                  }
                                >
                                  {stage2?.workloadPercentage !== null &&
                                  stage2?.workloadPercentage !== undefined
                                    ? `${stage2.workloadPercentage}%`
                                    : '—'}
                                </span>
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ELIGIBILITY">
            <DefenseEligibilityAdminView
              key={`${currentSemesterId ?? 0}-${parsedRoundId ?? 0}`}
              semesterId={currentSemesterId}
              roundId={parsedRoundId}
            />
          </TabsContent>
        </Tabs>

        <AutoAssignDialog
          open={autoAssignOpen}
          onOpenChange={setAutoAssignOpen}
          semesterId={currentSemesterId}
          semesterName={activeSemesterObj?.name}
          roundId={parsedRoundId}
          roundName={activeRoundObj?.projectType.name}
          majorId={parsedMajorId}
          majorName={activeMajorObj?.name}
        />

        <ConfirmDialog
          open={unassignTarget !== null}
          onOpenChange={(next) => {
            if (!next) setUnassignTarget(null);
          }}
          title="Hủy phân công giảng viên phản biện"
          description={
            unassignTarget ? (
              <>
                Hủy phân công{' '}
                <strong>
                  {unassignTarget.assignment
                    ? sanitizeLecturerName(
                        unassignTarget.assignment.reviewer.fullName,
                        unassignTarget.assignment.reviewer.academicTitle,
                      ).displayName
                    : ''}
                </strong>{' '}
                cho đề tài &ldquo;{unassignTarget.topic.title}&rdquo;?
              </>
            ) : (
              ''
            )
          }
          confirmLabel="Hủy phân công"
          onConfirm={async () => {
            if (!unassignTarget) return;
            await unassign.mutateAsync(unassignTarget.id);
            toast.success('Đã hủy phân công giảng viên phản biện.');
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function SummaryFigure({
  value,
  label,
  valueClass,
}: {
  value: number;
  label: string;
  valueClass?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        className={`text-xl font-bold tabular-nums ${
          valueClass ?? 'text-slate-900 dark:text-neutral-100'
        }`}
      >
        {value}
      </span>
      <span className="text-sm font-medium text-slate-600 dark:text-neutral-400">
        {label}
      </span>
    </span>
  );
}
