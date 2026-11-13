'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  GraduationCap,
  Layers,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { usePagination } from '@/hooks/use-pagination';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useMajors, useProjectTypes, useRoundsForSemester, useSemesters } from '@/lib/api/master-data';
import {
  useArchives,
  useExportArchives,
} from '@/lib/api/archives';
import { AdvancedFilterPopover } from '@/components/shared/advanced-filter-popover';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TextSection } from '@/components/shared/text-section';
import { DetailSheet } from '@/components/shared/detail-sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

/** Rút gọn loại đồ án: KLTN, ĐACN, ĐACS */
function getProjectTypeAbbr(projectType?: { name: string; code?: string } | null): {
  short: string;
  full: string;
} {
  if (!projectType) return { short: '—', full: '' };
  const code = projectType.code?.toUpperCase() ?? '';
  const name = projectType.name ?? '';

  if (
    code === 'DATN' ||
    code === 'KLTN' ||
    name.toLowerCase().includes('khóa luận') ||
    name.toLowerCase().includes('tốt nghiệp')
  ) {
    return { short: 'KLTN', full: name || 'Khóa luận tốt nghiệp' };
  }
  if (code === 'DACN' || name.toLowerCase().includes('chuyên ngành')) {
    return { short: 'ĐACN', full: name || 'Đồ án chuyên ngành' };
  }
  if (code === 'DACS' || name.toLowerCase().includes('cơ sở')) {
    return { short: 'ĐACS', full: name || 'Đồ án cơ sở' };
  }
  return { short: projectType.code || name, full: name };
}

export default function ArchivesPage() {
  useRequireRole(['ADMIN']);

  // Filters state
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('all');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { page, setPage, pageSize, setPageSize } = usePagination();
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  // Selected topic id for shared DetailSheet
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  // Master data queries
  const { data: semesters = [] } = useSemesters();
  const numericSemesterId =
    selectedSemesterId === 'all' ? undefined : Number(selectedSemesterId);

  const { data: rounds = [] } = useRoundsForSemester(numericSemesterId);
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: majors = [] } = useMajors();

  const projectTypeId =
    selectedRoundId === 'all' ? undefined : Number(selectedRoundId);

  // Main archives query
  const {
    data: archiveData,
    isLoading: isLoadingArchives,
  } = useArchives({
    semesterId: numericSemesterId,
    projectTypeId,
    majorId: selectedMajorId === 'all' ? undefined : Number(selectedMajorId),
    q: debouncedSearch || undefined,
    page,
    limit: pageSize,
  });

  const exportMutation = useExportArchives();

  const topics = archiveData?.items || [];
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  const total = archiveData?.total || 0;
  const totalPages = archiveData?.totalPages || 1;

  // Count secondary active filters (excluding search)
  const activeSecondaryCount =
    (selectedSemesterId !== 'all' ? 1 : 0) +
    (selectedRoundId !== 'all' ? 1 : 0) +
    (selectedMajorId !== 'all' ? 1 : 0);

  const hasAnyFilter = Boolean(debouncedSearch.trim()) || activeSecondaryCount > 0;

  const handleResetFilters = () => {
    setSelectedSemesterId('all');
    setSelectedRoundId('all');
    setSelectedMajorId('all');
    setPage(1);
  };

  const handleResetAll = () => {
    setSearchQuery('');
    handleResetFilters();
  };

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        semesterId: numericSemesterId,
        projectTypeId,
        majorId: selectedMajorId === 'all' ? undefined : Number(selectedMajorId),
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

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-3 md:max-h-[calc(100dvh-6.5rem)]">
        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Archive className="size-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Kho lưu trữ đồ án</h1>
          </div>
        </div>

        {/* ── Toolbar Lọc: Ô tìm kiếm + Bộ lọc nâng cao (chuẩn sinh viên) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* 1. Ô tìm kiếm chính */}
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên đề tài, SV, GV…"
                className="h-9.5 pl-9 pr-8 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e]"
                aria-label="Tìm kiếm đề tài"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 2. Component Bộ lọc nâng cao dùng chung */}
            <AdvancedFilterPopover
              open={filterPopoverOpen}
              onOpenChange={setFilterPopoverOpen}
              activeCount={activeSecondaryCount}
              onReset={handleResetFilters}
            >
              {/* Lọc theo học kỳ */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Học kỳ / Năm học
                </Label>
                <Select
                  value={selectedSemesterId}
                  onValueChange={(val) => {
                    setSelectedSemesterId(val);
                    setSelectedRoundId('all');
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(val) => {
                        if (!val || val === 'all') return 'Tất cả học kỳ';
                        const s = semesters.find((item) => String(item.id) === val);
                        return s ? formatSemesterAbbr(s) : 'Tất cả học kỳ';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">Tất cả học kỳ</SelectItem>
                    {semesters.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {formatSemesterAbbr(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lọc theo đợt đồ án */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Đợt đăng ký
                </Label>
                <Select
                  value={selectedRoundId}
                  onValueChange={(val) => {
                    setSelectedRoundId(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(val) => {
                        if (!val || val === 'all') return 'Mọi đợt';
                        const foundName =
                          rounds.find((r) => String(r.projectTypeId) === val)?.projectType.name ||
                          projectTypes.find((pt) => String(pt.id) === val)?.name;
                        return foundName ?? 'Mọi đợt';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">Mọi đợt</SelectItem>
                    {selectedSemesterId !== 'all' && rounds.length > 0
                      ? rounds.map((r) => (
                          <SelectItem key={r.id} value={String(r.projectTypeId)}>
                            {r.projectType?.name || `Đợt ${r.id}`}
                          </SelectItem>
                        ))
                      : projectTypes.map((pt) => (
                          <SelectItem key={pt.id} value={String(pt.id)}>
                            {pt.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lọc theo chuyên ngành */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Chuyên ngành
                </Label>
                <Select
                  value={selectedMajorId}
                  onValueChange={(val) => {
                    setSelectedMajorId(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
                    <SelectValue>
                      {(val) => {
                        if (!val || val === 'all') return 'Mọi chuyên ngành';
                        const m = majors.find((item) => String(item.id) === val);
                        return m ? m.name : 'Mọi chuyên ngành';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">Mọi chuyên ngành</SelectItem>
                    {majors.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AdvancedFilterPopover>
          </div>

          {/* Các nút bên phải: Tổng số đề tài + Xuất Excel */}
          <div className="flex items-center gap-2.5">
            {archiveData && (
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 mr-1 select-none">
                <strong className="text-primary font-bold text-sm">{total}</strong> đề tài
              </span>
            )}
            <Button
              variant="outline"
              className="gap-1.5 h-9.5 px-3.5 border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
              disabled={exportMutation.isPending || total === 0}
              onClick={handleExport}
            >
              {exportMutation.isPending ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Download className="size-4" />
              )}
              <span>Xuất Excel</span>
            </Button>
          </div>
        </div>

        {/* ── Active Filter Chips (chuẩn sinh viên) ── */}
        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-0.5 animate-in fade-in-50">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 select-none">
              Đang lọc:
            </span>

            {debouncedSearch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>Từ khóa: &ldquo;{debouncedSearch}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc từ khóa"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedSemesterId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  Học kỳ:{' '}
                  {formatSemesterAbbr(
                    semesters.find((s) => String(s.id) === selectedSemesterId) || {
                      name: '',
                      code: '',
                    },
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemesterId('all');
                    setSelectedRoundId('all');
                  }}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc học kỳ"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedRoundId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  Đợt:{' '}
                  {rounds.find((r) => String(r.projectTypeId) === selectedRoundId)?.projectType.name ||
                    projectTypes.find((pt) => String(pt.id) === selectedRoundId)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRoundId('all')}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc đợt"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedMajorId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  Ngành: {majors.find((m) => String(m.id) === selectedMajorId)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMajorId('all')}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc ngành"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-destructive transition ml-1 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Xóa hết</span>
            </button>
          </div>
        )}

        {/* ── Table Container (Chuẩn students/page.tsx: overflow-hidden wrapper, sticky header) ── */}
        <div className="flex-auto min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden">
          <div className="flex-auto min-h-0 overflow-auto">
            <Table
              containerClassName="overflow-visible"
              className="relative w-full min-w-[960px] text-left text-sm"
            >
              <TableHeader sticky>
                <TableRow>
                  <TableHead className="w-14 px-3 text-center whitespace-nowrap">
                    STT
                  </TableHead>
                  <TableHead className="min-w-[280px] max-w-[340px] px-4">
                    Tên đề tài
                  </TableHead>
                  <TableHead className="w-28 px-3 text-center whitespace-nowrap">
                    Loại đồ án
                  </TableHead>
                  <TableHead className="w-36 px-3 whitespace-nowrap">
                    Chuyên ngành
                  </TableHead>
                  <TableHead className="w-28 px-3 whitespace-nowrap">
                    Học kỳ
                  </TableHead>
                  <TableHead className="w-44 px-3 whitespace-nowrap">
                    GV hướng dẫn
                  </TableHead>
                  <TableHead className="w-20 px-3 text-center whitespace-nowrap">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingArchives ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <span className="text-xs">Đang tải kho lưu trữ…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : topics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <EmptyState
                        icon={Archive}
                        title="Không có đề tài lưu trữ"
                        description="Chưa có đề tài nào phù hợp với bộ lọc."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  topics.map((topic, index) => {
                    const topicTitle = topic.titleVi || topic.title;
                    const projectTypeInfo = getProjectTypeAbbr(topic.round?.projectType);
                    const stt = (page - 1) * pageSize + index + 1;

                    return (
                      <TableRow
                        key={topic.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5',
                          selectedTopicId === topic.id && 'bg-primary/8 dark:bg-primary/12 font-medium',
                        )}
                        onClick={() => setSelectedTopicId(topic.id)}
                      >
                        {/* 1. STT */}
                        <TableCell className="w-14 px-3 py-3.5 text-center font-mono text-xs text-muted-foreground align-middle">
                          {stt}
                        </TableCell>

                        {/* 2. Tên đề tài: 1 dòng duy nhất + truncate + hover tooltip popup */}
                        <TableCell className="min-w-[280px] max-w-[340px] px-4 py-3.5 align-middle">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  onClick={() => setSelectedTopicId(topic.id)}
                                  className="block w-full max-w-[320px] truncate text-left cursor-pointer"
                                />
                              }
                            >
                              <span className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100 leading-snug hover:text-primary transition-colors">
                                {topicTitle}
                              </span>
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
                        </TableCell>

                        {/* 3. Loại đồ án (chữ thường không badge như sinh viên) */}
                        <TableCell className="w-28 px-3 py-3.5 text-center font-medium text-slate-700 dark:text-neutral-300 align-middle whitespace-nowrap">
                          <span title={projectTypeInfo.full}>
                            {projectTypeInfo.short}
                          </span>
                        </TableCell>

                        {/* 4. Chuyên ngành */}
                        <TableCell className="w-36 px-3 py-3.5 text-slate-700 dark:text-neutral-300 align-middle whitespace-nowrap">
                          {topic.major?.name ?? '—'}
                        </TableCell>

                        {/* 5. Học kỳ */}
                        <TableCell className="w-28 px-3 py-3.5 text-slate-600 dark:text-neutral-400 align-middle whitespace-nowrap text-xs">
                          {formatSemesterAbbr(topic.semester)}
                        </TableCell>

                        {/* 6. GV hướng dẫn */}
                        <TableCell className="w-44 px-3 py-3.5 align-middle whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-900 dark:text-neutral-100 leading-snug truncate">
                            {topic.lecturer?.academicTitle && (
                              <span className="text-muted-foreground mr-1 font-normal">
                                {topic.lecturer.academicTitle}
                              </span>
                            )}
                            {topic.lecturer?.fullName}
                          </div>
                        </TableCell>

                        {/* 7. Thao tác 3 chấm (Đủ w-20 không bao giờ bị cắt chữ THAO TÁC) */}
                        <TableCell
                          className="w-20 px-3 py-3.5 text-center align-middle whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => setSelectedTopicId(topic.id)}
                              >
                                <Eye className="size-4 mr-2" />
                                <span>Xem chi tiết</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                render={
                                  <Link
                                    href={`/admin/topics/${topic.id}`}
                                  />
                                }
                              >
                                <ExternalLink className="size-4 mr-2" />
                                <span>Mở trang đề tài</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Phân trang chuẩn students/page.tsx ── */}
        <div className="shrink-0">
          <PaginationBar
            page={archiveData?.page ?? page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            itemName="đề tài"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* ── Chi tiết đề tài lưu trữ (Thanh Drawer bên phải - chuẩn giao diện TopicDetailSheet) ── */}
        {selectedTopic && (() => {
          const group = selectedTopic.registrationGroups[0];
          const grades = group?.studentGrades || [];
          const members = group?.members || [];
          const projectTypeInfo = getProjectTypeAbbr(selectedTopic.round?.projectType);
          const supervisorName = selectedTopic.lecturer?.academicTitle
            ? `${selectedTopic.lecturer.academicTitle} ${selectedTopic.lecturer.fullName}`
            : selectedTopic.lecturer?.fullName;

          return (
            <DetailSheet
              open={!!selectedTopicId}
              onOpenChange={(open) => !open && setSelectedTopicId(null)}
              title={
                <div className="text-base font-semibold leading-snug text-slate-900 dark:text-neutral-100 break-words [overflow-wrap:anywhere]">
                  {selectedTopic.titleVi || selectedTopic.title}
                </div>
              }
              meta={
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span>{supervisorName}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="font-semibold text-primary">{projectTypeInfo.short}</span>
                    {projectTypeInfo.full && projectTypeInfo.full !== projectTypeInfo.short && (
                      <span className="text-muted-foreground/80">({projectTypeInfo.full})</span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span>{selectedTopic.major?.name ?? '—'}</span>
                  </span>
                  <span>•</span>
                  <span>{formatSemesterAbbr(selectedTopic.semester)}</span>
                </div>
              }
              footer={
                <div className="flex items-center justify-between w-full">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTopicId(null)}>
                    Đóng
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-semibold"
                    render={<Link href={`/admin/topics/${selectedTopic.id}`} />}
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Xem trang đề tài</span>
                  </Button>
                </div>
              }
            >
              <div className="space-y-5 text-sm">
                {/* 1. Mô tả */}
                <TextSection
                  title="Mô tả"
                  body={selectedTopic.description}
                  bodyClassName="text-justify text-xs leading-relaxed"
                />

                {/* 2. Mục tiêu đề tài */}
                {selectedTopic.objectives && (
                  <TextSection
                    title="Mục tiêu đề tài"
                    body={selectedTopic.objectives}
                    bodyClassName="text-justify text-xs leading-relaxed"
                  />
                )}

                {/* 3. Yêu cầu đầu ra */}
                {selectedTopic.expectedOutcomes && (
                  <TextSection
                    title="Yêu cầu đầu ra"
                    body={selectedTopic.expectedOutcomes}
                    bodyClassName="text-justify text-xs leading-relaxed"
                  />
                )}

                {/* 4. Công nghệ & công cụ đề xuất */}
                {selectedTopic.techStack && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                      Công nghệ & Công cụ đề xuất
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTopic.techStack.split(',').map((tech, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Sinh viên thực hiện & Điểm tổng kết (Tập trung nghiệp vụ, không kể lể) */}
                <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                      Sinh viên thực hiện
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {members.length} sinh viên
                    </span>
                  </div>

                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      Chưa có dữ liệu sinh viên thực hiện đề tài này.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m) => {
                        const stGrade = grades.find((g) => g.studentId === m.student.id);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-white/[0.02]"
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                                {m.student.fullName}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="font-mono font-medium text-primary">
                                  {m.student.studentCode}
                                </span>
                                {m.student.class && (
                                  <>
                                    <span>•</span>
                                    <span>{m.student.class}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-bold font-mono text-slate-900 dark:text-neutral-100">
                                {stGrade?.finalGradeNum != null ? stGrade.finalGradeNum.toFixed(1) : '—'}
                              </div>
                              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {stGrade?.finalGradeLetter ? `Loại ${stGrade.finalGradeLetter}` : '—'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </DetailSheet>
          );
        })()}
      </div>
    </TooltipProvider>
  );
}
