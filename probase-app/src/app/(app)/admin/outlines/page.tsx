'use client';

import { useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronDown,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquareText,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMajors } from '@/lib/api/majors';
import { useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import { useFacultyOutlines } from '@/lib/api/outlines';
import type { LecturerGroupOutlineItem, OutlineStatus } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { downloadCsvFile, formatDate, sanitizeLecturerName } from '@/lib/utils';
import { outlineService } from '@/services/outline.service';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const PAGE_SIZE = 20;

const OUTLINE_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'APPROVED_BY_LECTURER', label: 'Đã duyệt' },
  { value: 'SUBMITTED', label: 'Chờ duyệt' },
  { value: 'NEEDS_REVISION', label: 'Cần sửa' },
  { value: 'NOT_SUBMITTED', label: 'Chưa nộp' },
];

function getOutlineStatusLabel(status?: OutlineStatus | null): StatusLabel {
  switch (status) {
    case 'APPROVED_BY_LECTURER':
      return { label: 'Đã duyệt', tone: 'success' };
    case 'SUBMITTED':
      return { label: 'Chờ duyệt', tone: 'waiting' };
    case 'NEEDS_REVISION':
      return { label: 'Cần sửa', tone: 'danger' };
    default:
      return { label: 'Chưa nộp', tone: 'idle' };
  }
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTopicProjectType(topic?: LecturerGroupOutlineItem['topic'] | null) {
  return topic?.round?.projectType ?? topic?.projectType ?? null;
}

export default function AdminOutlinesPage() {
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

  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [roundId, setRoundId] = useState<string>('ALL');
  const [majorId, setMajorId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const currentSemesterId = semesterId ?? defaultSemesterId;
  const { data: rounds } = useRoundsForSemester(currentSemesterId);
  const debouncedSearch = useDebouncedValue(search);

  const parsedRoundId = roundId === 'ALL' ? undefined : Number(roundId);
  const parsedMajorId = majorId === 'ALL' ? undefined : Number(majorId);

  const { data, isPending, error } = useFacultyOutlines(
    {
      semesterId: currentSemesterId,
      roundId: parsedRoundId,
      majorId: parsedMajorId,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: debouncedSearch.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: allowed && currentSemesterId !== undefined },
  );

  if (!allowed) return null;

  if (!semestersPending && !semestersError && !currentSemesterId) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <h1 className="text-lg font-semibold">Đề cương M03</h1>
        <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <EmptyState
            icon={CalendarRange}
            title="Chưa có học kỳ nào trong hệ thống."
          />
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  const stats = data?.stats ?? {
    totalGroups: 0,
    approved: 0,
    submitted: 0,
    needsRevision: 0,
    notSubmitted: 0,
  };

  async function handleExport(mode: 'APPROVED' | 'FILTERED') {
    if (!currentSemesterId || exporting) return;
    setExporting(true);
    try {
      const targetStatus =
        mode === 'APPROVED'
          ? 'APPROVED_BY_LECTURER'
          : statusFilter === 'ALL'
            ? undefined
            : statusFilter;

      const allItems: LecturerGroupOutlineItem[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await outlineService.getFacultyOutlines({
          semesterId: currentSemesterId,
          roundId: parsedRoundId,
          majorId: parsedMajorId,
          status: targetStatus,
          search:
            mode === 'FILTERED'
              ? debouncedSearch.trim() || undefined
              : undefined,
          page: currentPage,
          limit: 100,
        });
        allItems.push(...res.items);
        totalPages = Math.max(1, res.totalPages);
        currentPage += 1;
      } while (currentPage <= totalPages);

      if (allItems.length === 0) {
        toast.error(
          mode === 'APPROVED'
            ? 'Chưa có nhóm nào được duyệt Đề cương M03.'
            : 'Không có bản ghi nào phù hợp để xuất.',
        );
        return;
      }

      const headers = [
        'STT',
        'Nhóm',
        'Loại đồ án',
        'Chuyên ngành',
        'Tên đề tài',
        'Giảng viên hướng dẫn',
        'Sinh viên thực hiện',
        'Trạng thái M03',
        'Ngày duyệt',
        'Góp ý của GVHD',
      ];

      const rows = allItems.map((group, idx) => {
        const projectType = getTopicProjectType(group.topic);
        const supervisor = group.topic?.lecturer
          ? sanitizeLecturerName(
              group.topic.lecturer.fullName,
              group.topic.lecturer.academicTitle,
            ).displayName
          : '';

        return [
          idx + 1,
          group.name ?? `Nhóm ${group.id}`,
          projectType?.name ?? '',
          group.topic?.major?.name ?? '',
          group.topic?.title ?? '',
          supervisor,
          group.members
            .map((m) => `${m.student.fullName} (${m.student.studentCode})`)
            .join('; '),
          getOutlineStatusLabel(group.outline?.status).label,
          formatDate(group.outline?.approvedAt),
          group.outline?.lecturerFeedback ?? '',
        ];
      });

      const semesterCode =
        semesters?.find((s) => s.id === currentSemesterId)?.code ?? 'HK';
      const suffix = mode === 'APPROVED' ? 'DaDuyet' : 'TheoBoLoc';
      downloadCsvFile(
        `DeCuong_M03_${semesterCode}_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows,
      );

      toast.success(`Đã xuất ${allItems.length} bản ghi đề cương M03.`);
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
      <div className="w-full min-w-0 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Đề cương M03</h1>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {semesters && semesters.length > 0 && (
              <Select
                value={currentSemesterId ? String(currentSemesterId) : ''}
                onValueChange={(val) => {
                  setSemesterId(val ? Number(val) : undefined);
                  setRoundId('ALL');
                  setPage(1);
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

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="gap-1.5 cursor-pointer"
                    disabled={!currentSemesterId || exporting}
                  >
                    {exporting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="size-4" />
                    )}
                    <span>Xuất CSV</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleExport('APPROVED')}
                >
                  Danh sách đã duyệt ({stats.approved})
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleExport('FILTERED')}
                >
                  Toàn bộ theo bộ lọc hiện tại ({data?.total ?? 0})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] px-5 py-3 shadow-2xs text-sm">
          <SummaryFigure value={stats.totalGroups} label="tổng nhóm" />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.approved}
            label="đã duyệt"
            valueClass="text-emerald-600 dark:text-emerald-400"
          />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.submitted}
            label="chờ duyệt"
            valueClass="text-amber-600 dark:text-amber-400"
          />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.needsRevision}
            label="cần sửa"
            valueClass="text-rose-600 dark:text-rose-400"
          />
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700 hidden sm:block" />
          <SummaryFigure
            value={stats.notSubmitted}
            label="chưa nộp"
            valueClass="text-slate-500 dark:text-neutral-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm đề tài, nhóm, GVHD, SV, MSSV…"
              className="pl-8 pr-8"
              aria-label="Tìm kiếm đề cương"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select
            value={roundId}
            onValueChange={(val) => {
              setRoundId(val ?? 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Lọc theo đợt đồ án">
              <SelectValue>
                {(value) => {
                  if (value === 'ALL') return 'Mọi đợt đồ án';
                  const r = rounds?.find(
                    (one) => String(one.id) === String(value),
                  );
                  return r?.projectType.name ?? 'Mọi đợt đồ án';
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
                  const m = majors?.find(
                    (one) => String(one.id) === String(value),
                  );
                  return m ? m.name : 'Mọi chuyên ngành';
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
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val ?? 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Lọc theo trạng thái">
              <SelectValue>
                {(value) =>
                  OUTLINE_STATUS_OPTIONS.find((opt) => opt.value === value)
                    ?.label ?? 'Mọi trạng thái'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {OUTLINE_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(semestersError || error) && (
          <p className="text-sm text-destructive">
            Không tải được danh sách đề cương M03.
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
              icon={FileText}
              title="Không có bản ghi đề cương nào phù hợp."
            />
          ) : (
            <Table
              containerClassName="w-full overflow-x-auto"
              className="w-full min-w-[960px] table-fixed text-left text-sm"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px] px-4">
                    Nhóm &amp; Thành viên
                  </TableHead>
                  <TableHead className="min-w-[260px] px-3">Đề tài</TableHead>
                  <TableHead className="w-[175px] px-3 whitespace-nowrap">
                    GVHD
                  </TableHead>
                  <TableHead className="w-[140px] px-3 whitespace-nowrap">
                    Trạng thái M03
                  </TableHead>
                  <TableHead className="w-[135px] px-3 whitespace-nowrap">
                    Tài liệu scan
                  </TableHead>
                  <TableHead className="w-[110px] px-4 text-right whitespace-nowrap">
                    Ngày duyệt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((group) => {
                  const outline = group.outline;
                  const projectType = getTopicProjectType(group.topic);
                  const supervisor = group.topic?.lecturer
                    ? sanitizeLecturerName(
                        group.topic.lecturer.fullName,
                        group.topic.lecturer.academicTitle,
                      )
                    : null;
                  const statusLabel = getOutlineStatusLabel(outline?.status);

                  return (
                    <TableRow
                      key={group.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                    >
                      <TableCell className="align-top px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-neutral-100">
                          {group.name ?? `Nhóm ${group.id}`}
                        </p>
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {group.members.map((m) => (
                            <div key={m.id} className="truncate">
                              {m.student.fullName} (
                              <span className="font-mono text-primary font-semibold">
                                {m.student.studentCode}
                              </span>
                              )
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="align-top px-3 py-3 whitespace-normal">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <p className="font-semibold text-slate-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                                {group.topic?.title ?? '—'}
                              </p>
                            }
                          />
                          {group.topic?.title && (
                            <TooltipContent className="max-w-sm">
                              {group.topic.title}
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {(group.topic?.major || projectType) && (
                          <p className="mt-1 text-xs text-muted-foreground truncate">
                            {[group.topic?.major?.name, projectType?.name]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3 whitespace-nowrap">
                        {supervisor ? (
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-neutral-200 truncate">
                              {supervisor.displayName}
                            </p>
                            {supervisor.departmentRole && (
                              <p className="text-xs text-muted-foreground truncate">
                                {supervisor.departmentRole}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusPill
                            variant="tag"
                            label={statusLabel.label}
                            tone={statusLabel.tone}
                          />
                          {outline?.lecturerFeedback && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span
                                    className="inline-flex text-muted-foreground hover:text-foreground cursor-help"
                                    aria-label="Góp ý của giảng viên"
                                  >
                                    <MessageSquareText className="size-3.5" />
                                  </span>
                                }
                              />
                              <TooltipContent className="max-w-xs whitespace-pre-wrap">
                                {outline.lecturerFeedback}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-top px-3 py-3 text-xs">
                        {outline?.attachmentUrl ? (
                          <div className="space-y-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              render={
                                <a
                                  href={outline.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              <ExternalLink className="size-3" />
                              Xem bản scan
                            </Button>
                            {outline.fileSize ? (
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                {formatBytes(outline.fileSize)}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="align-top px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                        {formatDate(outline?.approvedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {data && (
          <PaginationBar
            page={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            total={data.total}
            pageSize={PAGE_SIZE}
            itemName="nhóm"
          />
        )}
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
