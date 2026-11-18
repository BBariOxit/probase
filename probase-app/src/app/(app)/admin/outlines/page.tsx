'use client';

import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarRange,
  ChevronDown,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMajors } from '@/lib/api/majors';
import { useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import {
  useFacultyOutlines,
  useRemindFacultyOutlines,
} from '@/lib/api/outlines';
import type { LecturerGroupOutlineItem, OutlineStatus } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  downloadCsvFile,
  formatDate,
  formatMajorShort,
  formatProjectTypeShort,
  formatSemesterShort,
  sanitizeLecturerName,
} from '@/lib/utils';
import { outlineService } from '@/services/outline.service';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

const SUBMISSION_TYPES = [
  { value: 'M03', label: 'Đề cương chi tiết', ready: true },
  { value: 'PROGRESS_1', label: 'Báo cáo Tiến độ 1', ready: false },
  { value: 'PROGRESS_2', label: 'Báo cáo Tiến độ 2', ready: false },
  {
    value: 'THESIS_FINAL',
    label: 'Báo cáo Toàn văn & Slide',
    ready: false,
  },
  { value: 'ARCHIVE_PACKAGE', label: 'Gói Lưu trữ Số hóa', ready: false },
] as const;

type SubmissionTypeKey = (typeof SUBMISSION_TYPES)[number]['value'];

function getOutlineStatusLabel(status?: OutlineStatus | null): StatusLabel {
  switch (status) {
    case 'APPROVED_BY_LECTURER':
    case 'SUBMITTED':
      return { label: 'Đã nộp', tone: 'success' };
    case 'NEEDS_REVISION':
      return { label: 'Cần nộp lại', tone: 'danger' };
    default:
      return { label: 'Chưa nộp', tone: 'idle' };
  }
}

function formatGroupCode(
  group: Pick<LecturerGroupOutlineItem, 'id' | 'topicOrder'>,
): string {
  const num = group.topicOrder ?? group.id;
  return `Nhóm ${String(num).padStart(2, '0')}`;
}

function getTopicProjectType(topic?: LecturerGroupOutlineItem['topic'] | null) {
  return topic?.round?.projectType ?? topic?.projectType ?? null;
}

function buildOutlineCsvRows(allItems: LecturerGroupOutlineItem[]) {
  const headers = [
    'STT',
    'Nhóm',
    'Loại đồ án',
    'Chuyên ngành',
    'Tên đề tài',
    'Giảng viên hướng dẫn',
    'Sinh viên thực hiện',
    'Trạng thái M03',
    'Ngày nộp',
  ];

  const rows = allItems.map((group, idx) => {
    const projectType = getTopicProjectType(group.topic);
    const supervisor = group.topic?.lecturer
      ? sanitizeLecturerName(
        group.topic.lecturer.fullName,
        group.topic.lecturer.academicTitle,
      ).displayName
      : '';
    const submittedAt =
      group.outline?.submittedAt ?? group.outline?.approvedAt ?? null;

    return [
      idx + 1,
      formatGroupCode(group),
      projectType?.name ?? '',
      group.topic?.major?.name ?? '',
      group.topic?.title ?? '',
      supervisor,
      group.members
        .map((m) => `${m.student.fullName} - ${m.student.studentCode}`)
        .join('; '),
      getOutlineStatusLabel(group.outline?.status).label,
      formatDate(submittedAt),
    ];
  });

  return { headers, rows };
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
  const [submissionType, setSubmissionType] = useState<SubmissionTypeKey>('M03');
  const [roundId, setRoundId] = useState<string>('ALL');
  const [majorId, setMajorId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const isOutlineTab = submissionType === 'M03';

  const [selectedById, setSelectedById] = useState<
    Record<number, LecturerGroupOutlineItem>
  >({});
  const [exporting, setExporting] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const remindMutation = useRemindFacultyOutlines();

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
      search: debouncedSearch.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: allowed && currentSemesterId !== undefined },
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const stats = data?.stats ?? {
    totalGroups: 0,
    approved: 0,
    submitted: 0,
    needsRevision: 0,
    notSubmitted: 0,
  };
  const totalSubmitted = stats.approved + stats.submitted;

  const visibleItems = useMemo(
    () => (isOutlineTab ? items : []),
    [isOutlineTab, items],
  );
  const displayedSubmitted = isOutlineTab ? totalSubmitted : 0;

  const selectedItems = useMemo(
    () => (isOutlineTab ? Object.values(selectedById) : []),
    [isOutlineTab, selectedById],
  );
  const downloadableSelectedIds = useMemo(
    () =>
      selectedItems
        .filter((g) => Boolean(g.outline?.attachmentUrl))
        .map((g) => g.id),
    [selectedItems],
  );
  const remindableSelectedIds = useMemo(
    () =>
      selectedItems
        .filter(
          (g) => !g.outline || g.outline.status === 'NEEDS_REVISION',
        )
        .map((g) => g.id),
    [selectedItems],
  );

  const allOnPageSelected =
    visibleItems.length > 0 &&
    visibleItems.every((g) => Boolean(selectedById[g.id]));

  if (!allowed) return null;

  if (!semestersPending && !semestersError && !currentSemesterId) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <h1 className="text-lg font-semibold">Bài nộp</h1>
        <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <EmptyState
            icon={CalendarRange}
            title="Chưa có học kỳ nào trong hệ thống."
          />
        </div>
      </div>
    );
  }

  function toggleRow(group: LecturerGroupOutlineItem, checked: boolean) {
    setSelectedById((prev) => {
      if (checked) {
        return { ...prev, [group.id]: group };
      }
      const next = { ...prev };
      delete next[group.id];
      return next;
    });
  }

  function toggleAllOnPage(checked: boolean) {
    setSelectedById((prev) => {
      const next = { ...prev };
      for (const group of visibleItems) {
        if (checked) {
          next[group.id] = group;
        } else {
          delete next[group.id];
        }
      }
      return next;
    });
  }

  function getSemesterCode() {
    return semesters?.find((s) => s.id === currentSemesterId)?.code ?? 'HK';
  }

  async function handleExport(mode: 'SUBMITTED' | 'FILTERED') {
    if (!currentSemesterId || exporting) return;
    setExporting(true);
    try {
      const targetStatus = mode === 'SUBMITTED' ? 'SUBMITTED' : undefined;

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
          mode === 'SUBMITTED'
            ? 'Chưa có nhóm nào nộp Đề cương M03.'
            : 'Không có bản ghi nào phù hợp để xuất.',
        );
        return;
      }

      const { headers, rows } = buildOutlineCsvRows(allItems);
      const suffix = mode === 'SUBMITTED' ? 'DaNop' : 'TheoBoLoc';
      downloadCsvFile(
        `DeCuong_M03_${getSemesterCode()}_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`,
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

  function handleExportSelected() {
    if (selectedItems.length === 0) return;
    const { headers, rows } = buildOutlineCsvRows(selectedItems);
    downloadCsvFile(
      `DeCuong_M03_${getSemesterCode()}_DaChon_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
    toast.success(`Đã xuất ${selectedItems.length} nhóm đã chọn.`);
  }

  async function handleDownloadSingle(group: LecturerGroupOutlineItem) {
    if (!group.outline?.id) return;
    try {
      const fileName =
        group.outline.fileName ||
        `${formatGroupCode(group).replace(/\s+/g, '_')}_M03.pdf`;
      await outlineService.downloadFacultyOutlineFile(
        group.outline.id,
        fileName,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể tải bản scan.',
      );
    }
  }

  async function handleDownloadZip() {
    if (downloadableSelectedIds.length === 0 || downloadingZip) return;
    setDownloadingZip(true);
    try {
      await outlineService.downloadFacultyOutlinesZip(downloadableSelectedIds);
      toast.success(
        `Đã tải gói ${downloadableSelectedIds.length} bản scan (.zip).`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể tạo tệp ZIP.',
      );
    } finally {
      setDownloadingZip(false);
    }
  }

  async function handleRemind(groupIds: number[]) {
    if (groupIds.length === 0 || remindMutation.isPending) return;
    try {
      const res = await remindMutation.mutateAsync(groupIds);
      toast.success(
        `Đã gửi thông báo nhắc nộp M03 tới ${res.recipientCount} sinh viên (${res.remindedGroups} nhóm).`,
      );
      setSelectedById({});
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể gửi nhắc nhở.',
      );
    }
  }

  const selectedSubmissionMeta =
    SUBMISSION_TYPES.find((t) => t.value === submissionType) ??
    SUBMISSION_TYPES[0];

  return (
    <TooltipProvider delay={200}>
      <div className="w-full min-w-0 space-y-4">
        {/* Header: Chọn loại bài nộp + tổng nhóm / đã nộp */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
            <Select
              value={submissionType}
              onValueChange={(val) => {
                setSubmissionType((val as SubmissionTypeKey) ?? 'M03');
                setSelectedById({});
              }}
            >
              <SelectTrigger
                className="h-9.5 w-auto min-w-48 gap-2 text-base font-semibold bg-white dark:bg-[#1e1e1e] border-slate-300 dark:border-neutral-700"
                aria-label="Chọn loại bài nộp"
              >
                <SelectValue>
                  {() => selectedSubmissionMeta.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-64">
                {SUBMISSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-neutral-400">
              <span>
                Tổng:{' '}
                <strong className="font-semibold text-slate-900 dark:text-neutral-100 tabular-nums">
                  {stats.totalGroups}
                </strong>{' '}
                nhóm
              </span>
              <span
                className="text-slate-300 dark:text-neutral-700"
                aria-hidden="true"
              >
                •
              </span>
              <span>
                Đã nộp:{' '}
                <strong
                  className={
                    displayedSubmitted > 0
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums'
                      : 'font-semibold text-slate-500 dark:text-neutral-400 tabular-nums'
                  }
                >
                  {displayedSubmitted}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {semesters && semesters.length > 0 && (
              <Select
                value={currentSemesterId ? String(currentSemesterId) : ''}
                onValueChange={(val) => {
                  setSemesterId(val ? Number(val) : undefined);
                  setRoundId('ALL');
                  setSelectedById({});
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44 h-9 text-sm" aria-label="Chọn học kỳ">
                  <SelectValue>
                    {(value) => {
                      const sem = semesters.find(
                        (s) => String(s.id) === String(value),
                      );
                      return sem ? formatSemesterShort(sem) : 'Chọn học kỳ';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {formatSemesterShort(s)}
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
                    className="h-9 gap-1.5 text-sm cursor-pointer"
                    disabled={!currentSemesterId || exporting || !isOutlineTab}
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
                  onClick={() => handleExport('SUBMITTED')}
                >
                  Danh sách đã nộp ({totalSubmitted})
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm đề tài, nhóm, GVHD, SV, MSSV…"
              className="h-9 pl-8 pr-8 text-sm"
              aria-label="Tìm kiếm bài nộp"
              disabled={!isOutlineTab}
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
            disabled={!isOutlineTab}
          >
            <SelectTrigger className="w-48 h-9 text-sm" aria-label="Lọc theo đợt đồ án">
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
            disabled={!isOutlineTab}
          >
            <SelectTrigger className="w-48 h-9 text-sm" aria-label="Lọc theo chuyên ngành">
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
        </div>

        {/* Bulk Actions Bar */}
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-2.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-slate-900 dark:text-neutral-100">
                Đã chọn{' '}
                <span className="text-primary tabular-nums">
                  {selectedItems.length}
                </span>{' '}
                nhóm
              </span>
              <button
                type="button"
                onClick={() => setSelectedById({})}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100 underline underline-offset-2 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadZip}
                disabled={downloadableSelectedIds.length === 0 || downloadingZip}
                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              >
                {downloadingZip ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileArchive className="size-3.5" />
                )}
                <span>Tải bản scan (.zip · {downloadableSelectedIds.length})</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Xuất CSV</span>
              </Button>

              {remindableSelectedIds.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleRemind(remindableSelectedIds)}
                  disabled={remindMutation.isPending}
                  className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  {remindMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Bell className="size-3.5" />
                  )}
                  <span>Nhắc nộp M03 ({remindableSelectedIds.length})</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {(semestersError || error) && (
          <p className="text-sm text-destructive">
            Không tải được danh sách đề cương M03.
          </p>
        )}

        {/* Table */}
        <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          {isOutlineTab && isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : isOutlineTab && visibleItems.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Không có bản ghi đề cương nào phù hợp."
            />
          ) : (
            <Table
              containerClassName="w-full overflow-x-auto"
              className="w-full min-w-[995px] table-fixed text-left text-sm"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-11 px-3 text-center">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAllOnPage}
                      disabled={!isOutlineTab || visibleItems.length === 0}
                      aria-label="Chọn tất cả nhóm trên trang"
                    />
                  </TableHead>
                  <TableHead className="w-[96px] px-3 whitespace-nowrap">
                    Nhóm
                  </TableHead>
                  <TableHead className="w-[245px] px-3">Sinh viên</TableHead>
                  <TableHead className="w-[290px] px-4">Đề tài</TableHead>
                  <TableHead className="w-[155px] px-3 whitespace-nowrap">
                    GVHD
                  </TableHead>
                  <TableHead className="w-[125px] px-3 whitespace-nowrap">
                    Trạng thái
                  </TableHead>
                  <TableHead className="w-16 px-3 text-center whitespace-nowrap">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isOutlineTab ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-14 text-center text-sm text-muted-foreground whitespace-normal"
                    >
                      Chưa có dữ liệu bài nộp cho mục{' '}
                      <span className="font-medium text-foreground">
                        {selectedSubmissionMeta.label}
                      </span>
                      .
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleItems.map((group) => {
                    const outline = group.outline;
                    const projectType = getTopicProjectType(group.topic);
                    const majorShort = group.topic?.major
                      ? formatMajorShort(group.topic.major)
                      : null;
                    const typeShort = projectType
                      ? formatProjectTypeShort(projectType)
                      : null;
                    const supervisor = group.topic?.lecturer
                      ? sanitizeLecturerName(
                        group.topic.lecturer.fullName,
                        group.topic.lecturer.academicTitle,
                      )
                      : null;
                    const statusLabel = getOutlineStatusLabel(outline?.status);
                    const submittedAt =
                      outline?.submittedAt ?? outline?.approvedAt ?? null;
                    const isChecked = Boolean(selectedById[group.id]);

                    return (
                      <TableRow
                        key={group.id}
                        data-state={isChecked ? 'selected' : undefined}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                      >
                        <TableCell className="align-top px-3 py-3.5 text-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(val) => toggleRow(group, val)}
                            aria-label={`Chọn ${formatGroupCode(group)}`}
                          />
                        </TableCell>

                        <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-neutral-100 tabular-nums">
                            {formatGroupCode(group)}
                          </span>
                        </TableCell>

                        <TableCell className="align-top px-3 py-3.5 whitespace-normal">
                          {group.members.length === 0 ? (
                            <span className="text-slate-400 dark:text-neutral-500">
                              —
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {group.members.map((m) => (
                                <div key={m.id} className="truncate text-sm">
                                  <span className="text-slate-800 dark:text-neutral-200">
                                    {m.student.fullName}
                                  </span>
                                  <span className="text-slate-400 dark:text-neutral-500">
                                    {' - '}
                                  </span>
                                  <span className="font-mono text-xs font-semibold text-primary">
                                    {m.student.studentCode}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="align-top px-4 py-3.5 whitespace-normal">
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
                          {(majorShort || typeShort) && (
                            <p
                              className="mt-1.5 text-xs font-medium text-slate-500 dark:text-neutral-400 truncate"
                              title={[majorShort?.full, typeShort?.full]
                                .filter(Boolean)
                                .join(' · ')}
                            >
                              {[majorShort?.short, typeShort?.short]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="align-top px-3 py-3.5 whitespace-normal">
                          {supervisor ? (
                            <div className="min-w-0">
                              <p
                                className="font-medium text-slate-800 dark:text-neutral-200 truncate"
                                title={supervisor.displayName}
                              >
                                {supervisor.displayName}
                              </p>
                              {supervisor.departmentRole && (
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400 truncate">
                                  {supervisor.departmentRole}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-neutral-500">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top px-3 py-3.5 whitespace-normal">
                          <StatusPill
                            variant="text"
                            label={statusLabel.label}
                            tone={statusLabel.tone}
                          />
                          {submittedAt && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                              Nộp {formatDate(submittedAt)}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="align-top px-3 py-3.5 text-center whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Thao tác cho ${formatGroupCode(group)}`}
                                  className="text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100 cursor-pointer"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-44">
                              {outline?.attachmentUrl ? (
                                <>
                                  <DropdownMenuItem
                                    className="text-sm cursor-pointer"
                                    render={
                                      <a
                                        href={outline.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      />
                                    }
                                  >
                                    <ExternalLink className="size-4 text-slate-500 dark:text-neutral-400" />
                                    <span>Xem bản scan</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-sm cursor-pointer"
                                    onClick={() => handleDownloadSingle(group)}
                                  >
                                    <Download className="size-4 text-slate-500 dark:text-neutral-400" />
                                    <span>Tải bản scan</span>
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  className="text-sm cursor-pointer"
                                  onClick={() => handleRemind([group.id])}
                                >
                                  <Bell className="size-4 text-slate-500 dark:text-neutral-400" />
                                  <span>Nhắc nộp M03</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {isOutlineTab && data && (
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
