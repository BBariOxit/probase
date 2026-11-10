'use client';

import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMajors } from '@/lib/api/majors';
import { useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import {
  fetchDefenseEligibility,
  useDefenseEligibility,
} from '@/lib/api/reviews';
import type { DefenseEligibilityOverviewResponse } from '@/lib/api/types';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { downloadCsvFile, sanitizeLecturerName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ReviewInspectionDialog } from './review-inspection-dialog';

const PAGE_SIZE = 20;

const ELIGIBILITY_STATUS_OPTIONS: Array<{
  value: 'ALL' | 'ELIGIBLE' | 'PENDING' | 'NOT_ELIGIBLE';
  label: string;
}> = [
  { value: 'ALL', label: 'Mọi kết quả' },
  { value: 'ELIGIBLE', label: 'Đủ điều kiện' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'NOT_ELIGIBLE', label: 'Không đạt' },
];

function getConclusionLabel(
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING',
): StatusLabel {
  switch (status) {
    case 'ELIGIBLE':
      return { label: 'Đủ điều kiện', tone: 'success' };
    case 'NOT_ELIGIBLE':
      return { label: 'Không đạt', tone: 'danger' };
    default:
      return { label: 'Chờ duyệt', tone: 'waiting' };
  }
}

interface DefenseEligibilityAdminViewProps {
  semesterId?: number;
  roundId?: number;
}

export function DefenseEligibilityAdminView({
  semesterId: controlledSemesterId,
  roundId: controlledRoundId,
}: DefenseEligibilityAdminViewProps) {
  const showScopePickers = controlledSemesterId === undefined;

  const { data: semesters } = useSemesters();
  const { data: majors } = useMajors();

  const defaultSemesterId = useMemo(
    () => semesters?.find((s) => s.isActive)?.id ?? semesters?.[0]?.id,
    [semesters],
  );

  const [localSemesterId, setLocalSemesterId] = useState<number | undefined>(
    undefined,
  );
  const [localRoundId, setLocalRoundId] = useState<string>('ALL');
  const [majorId, setMajorId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [inspectingGroupId, setInspectingGroupId] = useState<number | null>(
    null,
  );

  const effectiveSemesterId =
    controlledSemesterId ?? localSemesterId ?? defaultSemesterId;
  const { data: rounds } = useRoundsForSemester(
    showScopePickers ? effectiveSemesterId : undefined,
  );
  const effectiveRoundId =
    controlledRoundId !== undefined
      ? controlledRoundId
      : localRoundId === 'ALL'
        ? undefined
        : Number(localRoundId);
  const parsedMajorId = majorId === 'ALL' ? undefined : Number(majorId);

  const debouncedSearch = useDebouncedValue(searchQuery);

  const { data, isPending, error } = useDefenseEligibility(
    {
      semesterId: effectiveSemesterId,
      roundId: effectiveRoundId,
      majorId: parsedMajorId,
      status: statusFilter,
      search: debouncedSearch.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: effectiveSemesterId !== undefined },
  );

  const stats = data?.stats ?? {
    totalGroups: 0,
    eligibleCount: 0,
    notEligibleCount: 0,
    pendingCount: 0,
  };
  const items = data?.items ?? [];

  async function handleExportCsv() {
    if (!effectiveSemesterId || exporting) return;
    setExporting(true);
    try {
      const allItems: DefenseEligibilityOverviewResponse['items'] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await fetchDefenseEligibility({
          semesterId: effectiveSemesterId,
          roundId: effectiveRoundId,
          majorId: parsedMajorId,
          status: statusFilter,
          search: debouncedSearch.trim() || undefined,
          page: currentPage,
          limit: 100,
        });
        allItems.push(...res.items);
        totalPages = Math.max(1, res.pagination.totalPages);
        currentPage += 1;
      } while (currentPage <= totalPages);

      if (allItems.length === 0) {
        toast.error('Không có dữ liệu phù hợp để xuất.');
        return;
      }

      const headers = [
        'STT',
        'Nhóm',
        'Tên đề tài',
        'Chuyên ngành',
        'Loại đồ án',
        'Sinh viên thực hiện',
        'GVHD',
        'GVPB',
        'Tiến độ 2 (%)',
        'Kết quả TĐ2',
        'GVHD duyệt',
        'GVPB duyệt',
        'Kết luận',
      ];

      const rows = allItems.map((item, idx) => {
        const supName = item.supervisor
          ? sanitizeLecturerName(
              item.supervisor.fullName,
              item.supervisor.academicTitle,
            ).displayName
          : '';
        const revName = item.reviewer
          ? sanitizeLecturerName(
              item.reviewer.fullName,
              item.reviewer.academicTitle,
            ).displayName
          : '';
        const stage2Label =
          item.stage2.workloadPercentage === null
            ? 'Chưa đánh giá'
            : item.stage2.isPassed
              ? 'Đạt'
              : 'Chưa đạt';

        return [
          idx + 1,
          item.name ?? `Nhóm ${item.id}`,
          item.topic?.title ?? '',
          item.topic?.major?.name ?? '',
          item.topic?.round?.projectType?.name ?? '',
          item.members
            .map((m) => `${m.fullName} (${m.studentCode})`)
            .join('; '),
          supName,
          revName,
          item.stage2.workloadPercentage ?? '',
          stage2Label,
          item.supervisorReview
            ? item.supervisorReview.isDefenseAllowed
              ? 'Cho bảo vệ'
              : 'Không cho'
            : 'Chưa nộp',
          item.reviewerReview
            ? item.reviewerReview.isDefenseAllowed
              ? 'Cho bảo vệ'
              : 'Không cho'
            : 'Chưa nộp',
          getConclusionLabel(item.status).label,
        ];
      });

      const semesterCode =
        semesters?.find((s) => s.id === effectiveSemesterId)?.code ?? 'HK';
      downloadCsvFile(
        `DieuKienBaoVe_${semesterCode}_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows,
      );

      toast.success(`Đã xuất ${allItems.length} bản ghi điều kiện bảo vệ.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không xuất được tệp CSV.',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <TooltipProvider delay={200}>
      <div className="space-y-4">
        {/* Summary Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] px-5 py-3 shadow-2xs text-sm">
          <SummaryFigure value={stats.totalGroups} label="tổng nhóm" />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.eligibleCount}
            label="đủ điều kiện"
            valueClass="text-emerald-600 dark:text-emerald-400"
          />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.pendingCount}
            label="chờ duyệt"
            valueClass="text-amber-600 dark:text-amber-400"
          />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.notEligibleCount}
            label="không đạt"
            valueClass="text-rose-600 dark:text-rose-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm đề tài, nhóm, SV, MSSV…"
              className="pl-8 pr-8"
              aria-label="Tìm kiếm điều kiện bảo vệ"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Xóa từ khóa"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {showScopePickers && semesters && semesters.length > 0 && (
            <Select
              value={effectiveSemesterId ? String(effectiveSemesterId) : ''}
              onValueChange={(val) => {
                setLocalSemesterId(val ? Number(val) : undefined);
                setLocalRoundId('ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48" aria-label="Chọn học kỳ">
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

          {showScopePickers && (
            <Select
              value={localRoundId}
              onValueChange={(val) => {
                setLocalRoundId(val ?? 'ALL');
                setPage(1);
              }}
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
                {rounds?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.projectType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={majorId}
            onValueChange={(val) => {
              setMajorId(val ?? 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Lọc theo chuyên ngành">
              <SelectValue>
                {(value) => {
                  if (value === 'ALL') return 'Mọi chuyên ngành';
                  return (
                    majors?.find((m) => String(m.id) === String(value))?.name ??
                    'Mọi chuyên ngành'
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Mọi chuyên ngành</SelectItem>
              {majors?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(
                (val ?? 'ALL') as
                  'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING',
              );
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40" aria-label="Lọc theo kết luận">
              <SelectValue>
                {(value) =>
                  ELIGIBILITY_STATUS_OPTIONS.find((opt) => opt.value === value)
                    ?.label ?? 'Mọi kết quả'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ELIGIBILITY_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="ml-auto gap-1.5 cursor-pointer"
            onClick={handleExportCsv}
            disabled={
              !effectiveSemesterId ||
              (data?.pagination.total ?? 0) === 0 ||
              exporting
            }
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            <span>Xuất CSV</span>
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">
            Không tải được danh sách điều kiện bảo vệ.
          </p>
        )}

        {/* Table */}
        <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          {isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Không có nhóm đồ án nào phù hợp với bộ lọc."
            />
          ) : (
            <Table
              containerClassName="w-full overflow-x-auto"
              className="w-full min-w-[1000px] table-fixed text-left text-sm"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[270px] px-4">
                    Đề tài &amp; Nhóm
                  </TableHead>
                  <TableHead className="w-[205px] px-3 whitespace-nowrap">
                    GVHD &amp; GVPB
                  </TableHead>
                  <TableHead className="w-[130px] px-3 whitespace-nowrap">
                    Tiến độ 2
                  </TableHead>
                  <TableHead className="w-[115px] px-3 whitespace-nowrap">
                    Phiếu GVHD
                  </TableHead>
                  <TableHead className="w-[115px] px-3 whitespace-nowrap">
                    Phiếu GVPB
                  </TableHead>
                  <TableHead className="w-[120px] px-3 whitespace-nowrap">
                    Kết luận
                  </TableHead>
                  <TableHead className="w-[105px] px-4 text-right whitespace-nowrap">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const supName = item.supervisor
                    ? sanitizeLecturerName(
                        item.supervisor.fullName,
                        item.supervisor.academicTitle,
                      ).displayName
                    : '—';
                  const revName = item.reviewer
                    ? sanitizeLecturerName(
                        item.reviewer.fullName,
                        item.reviewer.academicTitle,
                      ).displayName
                    : null;
                  const conclusion = getConclusionLabel(item.status);

                  return (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                    >
                      <TableCell className="align-top px-4 py-3 whitespace-normal">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <p className="font-semibold text-slate-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                                {item.topic?.title ?? '—'}
                              </p>
                            }
                          />
                          {item.topic?.title && (
                            <TooltipContent className="max-w-sm">
                              {item.topic.title}
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {(item.topic?.major ||
                          item.topic?.round?.projectType) && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {[
                              item.topic?.major?.name,
                              item.topic?.round?.projectType?.name,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
                          {item.members
                            .map((m) => `${m.fullName} (${m.studentCode})`)
                            .join(', ')}
                        </p>
                      </TableCell>

                      <TableCell className="align-top px-3 py-3 text-xs space-y-1">
                        <p className="truncate">
                          <span className="text-muted-foreground">HD: </span>
                          <span className="font-medium text-foreground">
                            {supName}
                          </span>
                        </p>
                        <p className="truncate">
                          <span className="text-muted-foreground">PB: </span>
                          {revName ? (
                            <span className="font-medium text-foreground">
                              {revName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Chưa phân công
                            </span>
                          )}
                        </p>
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        {item.stage2.workloadPercentage !== null ? (
                          <StatusPill
                            variant="tag"
                            label={`${item.stage2.workloadPercentage}% · ${
                              item.stage2.isPassed ? 'Đạt' : 'Chưa đạt'
                            }`}
                            tone={item.stage2.isPassed ? 'success' : 'danger'}
                          />
                        ) : (
                          <StatusPill
                            variant="tag"
                            label="Chưa đánh giá"
                            tone="idle"
                          />
                        )}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        {item.supervisorReview ? (
                          <StatusPill
                            label={
                              item.supervisorReview.isDefenseAllowed
                                ? 'Cho bảo vệ'
                                : 'Không cho'
                            }
                            tone={
                              item.supervisorReview.isDefenseAllowed
                                ? 'success'
                                : 'danger'
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Chưa nộp
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        {item.reviewerReview ? (
                          <StatusPill
                            label={
                              item.reviewerReview.isDefenseAllowed
                                ? 'Cho bảo vệ'
                                : 'Không cho'
                            }
                            tone={
                              item.reviewerReview.isDefenseAllowed
                                ? 'success'
                                : 'danger'
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Chưa nộp
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        <StatusPill
                          variant="tag"
                          label={conclusion.label}
                          tone={conclusion.tone}
                        />
                      </TableCell>

                      <TableCell className="align-top px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7.5 text-xs gap-1 cursor-pointer"
                          onClick={() => setInspectingGroupId(item.id)}
                        >
                          <FileText className="size-3.5" />
                          Xem phiếu
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {data?.pagination && (
          <PaginationBar
            page={page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
            total={data.pagination.total}
            pageSize={PAGE_SIZE}
            itemName="nhóm"
          />
        )}

        <ReviewInspectionDialog
          open={inspectingGroupId !== null}
          onOpenChange={(next) => {
            if (!next) setInspectingGroupId(null);
          }}
          groupId={inspectingGroupId}
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
