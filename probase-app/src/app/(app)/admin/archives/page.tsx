'use client';

import { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Code,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useMajors, useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import {
  type ArchiveTopicItem,
  useArchives,
  useExportArchives,
  useVerifyArchive,
} from '@/lib/api/archives';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill } from '@/components/shared/status-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const PAGE_SIZE = 15;

const VERIFIED_FILTER_OPTIONS: { value: 'all' | 'true' | 'false'; label: string }[] = [
  { value: 'all', label: 'Tất cả nghiệm thu' },
  { value: 'true', label: 'Đã nghiệm thu' },
  { value: 'false', label: 'Chưa nghiệm thu' },
];

/** Rút gọn tên học kỳ: "Học kỳ 1 năm học 2026–2027" -> "HKI 2026-2027" */
function formatSemesterAbbr(semester: { name: string; code: string }): string {
  if (semester.code) {
    return semester.code
      .replace(/^HK1-/, 'HKI ')
      .replace(/^HK2-/, 'HKII ')
      .replace(/^HE-/, 'HK Hè ')
      .replace(/-/g, '–');
  }
  return semester.name
    .replace('Học kỳ 1 năm học ', 'HKI ')
    .replace('Học kỳ 2 năm học ', 'HKII ')
    .replace('Học kỳ hè năm học ', 'HK Hè ');
}

export default function ArchivesPage() {
  useRequireRole(['ADMIN']);

  // Filters state
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('all');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('all');
  const [selectedVerified, setSelectedVerified] = useState<'all' | 'true' | 'false'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Selected topic for detail modal
  const [selectedTopic, setSelectedTopic] = useState<ArchiveTopicItem | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  // Master data queries
  const { data: semesters = [] } = useSemesters();
  const numericSemesterId =
    selectedSemesterId === 'all' ? undefined : Number(selectedSemesterId);

  const { data: rounds = [] } = useRoundsForSemester(numericSemesterId);
  const { data: majors = [] } = useMajors();

  const selectedRound = rounds.find((r) => String(r.id) === selectedRoundId);
  const projectTypeId = selectedRound?.projectTypeId;

  // Main archives query
  const {
    data: archiveData,
    isLoading: isLoadingArchives,
    isFetching: isFetchingArchives,
  } = useArchives({
    semesterId: numericSemesterId,
    projectTypeId,
    majorId: selectedMajorId === 'all' ? undefined : Number(selectedMajorId),
    verified: selectedVerified,
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const exportMutation = useExportArchives();
  const verifyMutation = useVerifyArchive();

  const topics = archiveData?.items || [];
  const total = archiveData?.total || 0;
  const totalPages = archiveData?.totalPages || 1;

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        semesterId: numericSemesterId,
        projectTypeId,
        majorId: selectedMajorId === 'all' ? undefined : Number(selectedMajorId),
        verified: selectedVerified,
        q: debouncedSearch || undefined,
      });
      toast.success('Đã tải xuống file sổ lưu trữ đồ án Excel');
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể xuất danh sách. Vui lòng thử lại.',
      );
    }
  };

  const handleToggleVerify = async (archiveId: number, currentVerified: boolean) => {
    try {
      await verifyMutation.mutateAsync({
        archiveId,
        isVerified: !currentVerified,
      });
      toast.success(
        !currentVerified
          ? 'Đã xác nhận nghiệm thu hồ sơ đồ án.'
          : 'Đã hủy nghiệm thu hồ sơ đồ án.',
      );

      if (selectedTopic) {
        setSelectedTopic({
          ...selectedTopic,
          registrationGroups: selectedTopic.registrationGroups.map((group) => {
            if (group.archive?.id === archiveId) {
              return {
                ...group,
                archive: {
                  ...group.archive,
                  isVerifiedByAcademic: !currentVerified,
                },
              };
            }
            return group;
          }),
        });
      }
    } catch {
      toast.error('Có lỗi xảy ra khi cập nhật nghiệm thu');
    }
  };

  const hasActiveFilters =
    selectedSemesterId !== 'all' ||
    selectedRoundId !== 'all' ||
    selectedMajorId !== 'all' ||
    selectedVerified !== 'all' ||
    Boolean(searchQuery.trim());

  return (
    <TooltipProvider delay={200}>
      <div className="w-full min-w-0 space-y-4">
        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Archive className="size-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Kho lưu trữ đồ án</h1>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending || total === 0}
            className="gap-1.5 h-9"
          >
            {exportMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            )}
            Xuất Excel
          </Button>
        </div>

        {/* ── Filter Controls Row ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Keyword Search */}
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên đề tài, SV, GV…"
              className="pl-8"
              aria-label="Tìm kiếm đề tài"
            />
          </div>

          {/* Semester Selector */}
          <Select
            value={selectedSemesterId}
            onValueChange={(val) => {
              setSelectedSemesterId(val);
              setSelectedRoundId('all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 sm:w-44" aria-label="Lọc theo học kỳ">
              <SelectValue>
                {(val) => {
                  if (!val || val === 'all') return 'Tất cả học kỳ';
                  const s = semesters.find((item) => String(item.id) === val);
                  return s ? formatSemesterAbbr(s) : 'Tất cả học kỳ';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả học kỳ</SelectItem>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {formatSemesterAbbr(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Round Selector */}
          <Select
            value={selectedRoundId}
            onValueChange={(val) => {
              setSelectedRoundId(val);
              setPage(1);
            }}
            disabled={selectedSemesterId === 'all'}
          >
            <SelectTrigger className="w-36 sm:w-40" aria-label="Lọc theo loại đồ án">
              <SelectValue>
                {(val) => {
                  if (!val || val === 'all') return 'Tất cả loại đồ án';
                  const r = rounds.find((item) => String(item.id) === val);
                  return r?.projectType?.name ?? 'Tất cả loại đồ án';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại đồ án</SelectItem>
              {rounds.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.projectType?.name || `Đợt ${r.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Major Selector */}
          <Select
            value={selectedMajorId}
            onValueChange={(val) => {
              setSelectedMajorId(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 sm:w-40" aria-label="Lọc theo chuyên ngành">
              <SelectValue>
                {(val) => {
                  if (!val || val === 'all') return 'Tất cả chuyên ngành';
                  const m = majors.find((item) => String(item.id) === val);
                  return m ? m.name : 'Tất cả chuyên ngành';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
              {majors.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Verification Status */}
          <Select
            value={selectedVerified}
            onValueChange={(val: 'all' | 'true' | 'false') => {
              setSelectedVerified(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 sm:w-40" aria-label="Lọc theo nghiệm thu">
              <SelectValue>
                {(val) =>
                  VERIFIED_FILTER_OPTIONS.find((opt) => opt.value === val)?.label ??
                  'Tất cả nghiệm thu'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VERIFIED_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Total Count */}
          {archiveData && (
            <span className="ml-auto text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
              <strong className="text-primary font-bold text-sm">{total}</strong> đề tài
            </span>
          )}
        </div>

        {/* ── Table Container ── */}
        <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
          <Table
            containerClassName="w-full overflow-x-auto"
            className="w-full min-w-[960px] table-fixed text-left text-sm"
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-[360px] px-4">Tên đề tài</TableHead>
                <TableHead className="w-[170px] px-3 whitespace-nowrap">
                  CB hướng dẫn
                </TableHead>
                <TableHead className="w-[220px] px-3 whitespace-nowrap">
                  Sinh viên & Điểm
                </TableHead>
                <TableHead className="w-[130px] px-2 text-center whitespace-nowrap">
                  Hồ sơ số hóa
                </TableHead>
                <TableHead className="w-[120px] px-2 text-center whitespace-nowrap">
                  Nghiệm thu
                </TableHead>
                <TableHead className="w-14 px-2 text-center whitespace-nowrap">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingArchives ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <span className="text-xs">Đang tải kho lưu trữ…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : topics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <EmptyState
                      icon={Archive}
                      title="Không có đề tài lưu trữ"
                      description={
                        hasActiveFilters
                          ? 'Không tìm thấy đề tài nào phù hợp với bộ lọc.'
                          : 'Chưa có đề tài nào hoàn thành được lưu vào kho.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                topics.map((topic) => {
                  const group = topic.registrationGroups[0];
                  const archive = group?.archive;
                  const outline = group?.outline;
                  const grades = group?.studentGrades || [];
                  const members = group?.members || [];
                  const isAcademicVerified = archive?.isVerifiedByAcademic ?? false;

                  const topicTitle = topic.titleVi || topic.title;

                  return (
                    <TableRow
                      key={topic.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                    >
                      {/* Cột 1: Tên đề tài & Tags */}
                      <TableCell className="w-[360px] px-4 py-3 align-top font-medium whitespace-normal">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              #{topic.id}
                            </span>
                            {topic.major && (
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                {topic.major.code}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              {topic.round?.projectType?.name || 'Đề tài'}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              • {formatSemesterAbbr(topic.semester)}
                            </span>
                          </div>

                          {/* Tiêu đề đề tài (Line clamp 2 + Tooltip) */}
                          <div className="w-full">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTopic(topic)}
                                    className="line-clamp-2 text-left font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] cursor-pointer"
                                  />
                                }
                              >
                                {topicTitle}
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className="max-w-md p-3 text-xs leading-relaxed bg-slate-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-lg shadow-xl border border-slate-700 dark:border-neutral-700 z-50"
                              >
                                <p className="font-semibold text-primary mb-1">
                                  Tên đề tài đầy đủ:
                                </p>
                                <p className="text-slate-200 dark:text-neutral-200 break-words [overflow-wrap:anywhere]">
                                  {topicTitle}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </TableCell>

                      {/* Cột 2: Cán bộ hướng dẫn */}
                      <TableCell className="w-[170px] px-3 py-3 align-top">
                        <div className="text-xs font-semibold text-slate-900 dark:text-neutral-100 leading-snug">
                          {topic.lecturer?.academicTitle && (
                            <span className="text-muted-foreground mr-1 font-normal">
                              {topic.lecturer.academicTitle}
                            </span>
                          )}
                          {topic.lecturer?.fullName}
                        </div>
                        {group?.councilTopic?.reviewer && (
                          <div className="mt-1 text-[11px] text-muted-foreground leading-tight">
                            PB: {group.councilTopic.reviewer.fullName}
                          </div>
                        )}
                      </TableCell>

                      {/* Cột 3: Sinh viên & Điểm */}
                      <TableCell className="w-[220px] px-3 py-3 align-top">
                        {members.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-1">
                            {members.map((m) => {
                              const stGrade = grades.find(
                                (g) => g.studentId === m.student.id,
                              );
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between text-xs gap-1.5"
                                >
                                  <div className="truncate">
                                    <span className="font-medium text-slate-800 dark:text-neutral-200">
                                      {m.student.fullName}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground ml-1">
                                      ({m.student.studentCode})
                                    </span>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    {stGrade?.finalGradeNum !== null &&
                                    stGrade?.finalGradeNum !== undefined ? (
                                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        {stGrade.finalGradeNum}
                                        {stGrade.finalGradeLetter && (
                                          <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                            ({stGrade.finalGradeLetter})
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>

                      {/* Cột 4: Hồ sơ số hóa (4 icons gọn gàng) */}
                      <TableCell className="w-[130px] px-2 py-3 align-top text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Đề cương M03 */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                outline?.attachmentUrl ? (
                                  <a
                                    href={outline.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                                  />
                                ) : (
                                  <span className="p-1 text-slate-300 dark:text-neutral-700 cursor-not-allowed" />
                                )
                              }
                            >
                              <FileCheck2 className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {outline?.attachmentUrl
                                ? 'Đề cương M03'
                                : 'Chưa có đề cương M03'}
                            </TooltipContent>
                          </Tooltip>

                          {/* PDF Luận văn */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                archive?.thesisUrl ? (
                                  <a
                                    href={archive.thesisUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                  />
                                ) : (
                                  <span className="p-1 text-slate-300 dark:text-neutral-700 cursor-not-allowed" />
                                )
                              }
                            >
                              <FileText className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {archive?.thesisUrl
                                ? 'Báo cáo PDF luận văn'
                                : 'Chưa có file PDF'}
                            </TooltipContent>
                          </Tooltip>

                          {/* Source Code */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                archive?.sourceUrl ? (
                                  <a
                                    href={archive.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                  />
                                ) : (
                                  <span className="p-1 text-slate-300 dark:text-neutral-700 cursor-not-allowed" />
                                )
                              }
                            >
                              <Code className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {archive?.sourceUrl
                                ? 'Mã nguồn (Source code)'
                                : 'Chưa có mã nguồn'}
                            </TooltipContent>
                          </Tooltip>

                          {/* CSDL */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                archive?.databaseUrl ? (
                                  <a
                                    href={archive.databaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                                  />
                                ) : (
                                  <span className="p-1 text-slate-300 dark:text-neutral-700 cursor-not-allowed" />
                                )
                              }
                            >
                              <Database className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {archive?.databaseUrl
                                ? 'Cơ sở dữ liệu'
                                : 'Chưa có CSDL'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>

                      {/* Cột 5: Tình trạng nghiệm thu */}
                      <TableCell className="w-[120px] px-2 py-3 align-top text-center whitespace-nowrap">
                        {isAcademicVerified ? (
                          <StatusPill
                            label="Đã nghiệm thu"
                            tone="success"
                            variant="tag"
                          />
                        ) : archive ? (
                          <StatusPill
                            label="Chờ nghiệm thu"
                            tone="waiting"
                            variant="tag"
                          />
                        ) : (
                          <StatusPill
                            label="Chưa nộp"
                            tone="idle"
                            variant="tag"
                          />
                        )}
                      </TableCell>

                      {/* Cột 6: Thao tác 3 chấm */}
                      <TableCell className="w-14 px-2 py-3 align-top text-center whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="size-8 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                                aria-label="Thao tác"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => setSelectedTopic(topic)}
                            >
                              <Eye className="size-4 mr-2" />
                              <span>Xem chi tiết hồ sơ</span>
                            </DropdownMenuItem>

                            {archive && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleVerify(
                                      archive.id,
                                      isAcademicVerified,
                                    )
                                  }
                                >
                                  {isAcademicVerified ? (
                                    <>
                                      <RotateCcw className="size-4 mr-2 text-muted-foreground" />
                                      <span>Hủy nghiệm thu</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="size-4 mr-2 text-emerald-600" />
                                      <span>Xác nhận nghiệm thu</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}

                            {(archive?.thesisUrl ||
                              archive?.sourceUrl ||
                              outline?.attachmentUrl) && (
                              <>
                                <DropdownMenuSeparator />
                                {archive?.thesisUrl && (
                                  <DropdownMenuItem
                                    render={
                                      <a
                                        href={archive.thesisUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      />
                                    }
                                  >
                                    <FileText className="size-4 mr-2 text-rose-500" />
                                    <span>Mở PDF luận văn</span>
                                  </DropdownMenuItem>
                                )}
                                {archive?.sourceUrl && (
                                  <DropdownMenuItem
                                    render={
                                      <a
                                        href={archive.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      />
                                    }
                                  >
                                    <Code className="size-4 mr-2 text-emerald-500" />
                                    <span>Xem mã nguồn</span>
                                  </DropdownMenuItem>
                                )}
                                {outline?.attachmentUrl && (
                                  <DropdownMenuItem
                                    render={
                                      <a
                                        href={outline.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      />
                                    }
                                  >
                                    <FileCheck2 className="size-4 mr-2 text-blue-500" />
                                    <span>Tải đề cương M03</span>
                                  </DropdownMenuItem>
                                )}
                              </>
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

          {/* Phân trang */}
          <div className="p-3 border-t border-slate-200 dark:border-neutral-800">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={(newPage) => setPage(newPage)}
              itemName="đề tài"
            />
          </div>
        </div>

        {/* ── Detail Modal ── */}
        {selectedTopic && (
          <ArchiveDetailDialog
            topic={selectedTopic}
            open={Boolean(selectedTopic)}
            onOpenChange={(open) => !open && setSelectedTopic(null)}
            onToggleVerify={handleToggleVerify}
            isVerifying={verifyMutation.isPending}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Detail Modal Component ─────────────────────────────────────────────
interface ArchiveDetailDialogProps {
  topic: ArchiveTopicItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleVerify: (archiveId: number, current: boolean) => void;
  isVerifying: boolean;
}

function ArchiveDetailDialog({
  topic,
  open,
  onOpenChange,
  onToggleVerify,
  isVerifying,
}: ArchiveDetailDialogProps) {
  const group = topic.registrationGroups[0];
  const archive = group?.archive;
  const outline = group?.outline;
  const grades = group?.studentGrades || [];
  const members = group?.members || [];

  const isVerified = archive?.isVerifiedByAcademic ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">
              #{topic.id}
            </span>
            <Badge variant="outline" className="text-xs py-0 h-5">
              {topic.round?.projectType?.name || 'Đề tài'}
            </Badge>
            {topic.major && (
              <Badge variant="secondary" className="text-xs py-0 h-5">
                {topic.major.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatSemesterAbbr(topic.semester)}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground leading-snug">
            {topic.titleVi || topic.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* CB Hướng dẫn & Phản biện */}
          <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border">
            <div>
              <span className="text-muted-foreground block text-[11px]">
                CB Hướng dẫn
              </span>
              <div className="font-semibold text-foreground text-xs mt-0.5">
                {topic.lecturer?.academicTitle && (
                  <span className="font-normal text-muted-foreground mr-1">
                    {topic.lecturer.academicTitle}
                  </span>
                )}
                {topic.lecturer?.fullName}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">
                CB Phản biện
              </span>
              <div className="font-semibold text-foreground text-xs mt-0.5">
                {group?.councilTopic?.reviewer?.fullName ? (
                  <>
                    {group.councilTopic.reviewer.academicTitle && (
                      <span className="font-normal text-muted-foreground mr-1">
                        {group.councilTopic.reviewer.academicTitle}
                      </span>
                    )}
                    {group.councilTopic.reviewer.fullName}
                  </>
                ) : (
                  <span className="text-muted-foreground font-normal italic">
                    Chưa phân công
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sinh viên & Điểm số */}
          <div>
            <div className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              Thành viên & Điểm số
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-2">MSSV</TableHead>
                    <TableHead className="text-xs py-2">Họ và tên</TableHead>
                    <TableHead className="text-xs py-2 text-center">TĐ 1</TableHead>
                    <TableHead className="text-xs py-2 text-center">TĐ 2</TableHead>
                    <TableHead className="text-xs py-2 text-center">Bảo vệ</TableHead>
                    <TableHead className="text-xs py-2 text-center font-bold">Tổng kết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-3">
                        Chưa có sinh viên
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => {
                      const g = grades.find((gr) => gr.studentId === m.student.id);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs font-medium py-2">
                            {m.student.studentCode}
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            {m.student.fullName}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            {g?.progress1Grade ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            {g?.progress2Grade ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            {g?.defenseGrade ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold text-emerald-600 dark:text-emerald-400 py-2">
                            {g?.finalGradeNum ?? '—'}
                            {g?.finalGradeLetter && (
                              <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                ({g.finalGradeLetter})
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Hồ sơ số hóa */}
          <div>
            <div className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Archive className="size-3.5 text-primary" />
              Hồ sơ số hóa
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* M03 */}
              <div className="p-2.5 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="size-4 text-blue-600 shrink-0" />
                  <span className="font-medium">Đề cương M03</span>
                </div>
                {outline?.attachmentUrl ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" asChild>
                    <a href={outline.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="size-3" />
                      Tải về
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Chưa có</span>
                )}
              </div>

              {/* PDF Luận văn */}
              <div className="p-2.5 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-rose-600 shrink-0" />
                  <span className="font-medium">Toàn văn (PDF)</span>
                </div>
                {archive?.thesisUrl ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" asChild>
                    <a href={archive.thesisUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" />
                      Mở file
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Chưa nộp</span>
                )}
              </div>

              {/* Mã nguồn */}
              <div className="p-2.5 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Mã nguồn</span>
                </div>
                {archive?.sourceUrl ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" asChild>
                    <a href={archive.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" />
                      Xem link
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Chưa nộp</span>
                )}
              </div>

              {/* CSDL */}
              <div className="p-2.5 rounded-lg border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-amber-600 shrink-0" />
                  <span className="font-medium">Cơ sở dữ liệu</span>
                </div>
                {archive?.databaseUrl ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" asChild>
                    <a href={archive.databaseUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" />
                      Xem link
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Chưa nộp</span>
                )}
              </div>
            </div>
          </div>

          {/* Nghiệm thu Action Box */}
          <div className="p-3 rounded-lg border bg-slate-50 dark:bg-neutral-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Nghiệm thu:</span>
              {isVerified ? (
                <StatusPill label="Đã nghiệm thu" tone="success" variant="tag" />
              ) : (
                <StatusPill label="Chưa nghiệm thu" tone="waiting" variant="tag" />
              )}
            </div>

            {archive ? (
              <Button
                variant={isVerified ? 'outline' : 'default'}
                size="sm"
                onClick={() => onToggleVerify(archive.id, isVerified)}
                disabled={isVerifying}
                className="gap-1.5 h-8 text-xs"
              >
                {isVerifying ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isVerified ? (
                  <RotateCcw className="size-3.5 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-white" />
                )}
                {isVerified ? 'Hủy nghiệm thu' : 'Xác nhận nghiệm thu'}
              </Button>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">
                Chưa có bản ghi lưu trữ
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
