'use client';

import { useState } from 'react';
import {
  Download,
  FileUp,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { useMajors } from '@/lib/api/majors';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import { useExportStudents, useStudents } from '@/lib/api/students';
import { useTopicLecturers } from '@/lib/api/topics';
import type { StudentRosterRow } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { EligibleStudentsImportDialog } from '@/components/admin/eligible-students-import-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { usePagination } from '@/hooks/use-pagination';
import { sanitizeLecturerName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Skeleton } from '@/components/ui/skeleton';

const ANY = 0;

const GROUP_FILTERS = [
  { value: 'ALL', label: 'Mọi tình trạng' },
  { value: 'false', label: 'Chưa có đề tài' },
  { value: 'true', label: 'Đã có đề tài' },
];

export default function StudentRosterPage() {
  const allowed = useRequireRole('ADMIN');
  const semester = useActiveSemester();
  const { data: rounds } = useRoundsForSemester(semester?.id);
  const { data: majors } = useMajors();
  const { data: lecturers } = useTopicLecturers(semester?.id);

  const { page, setPage, pageSize, setPageSize } = usePagination();
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState('');
  const [roundId, setRoundId] = useState(ANY);
  const [majorId, setMajorId] = useState(ANY);
  const [lecturerId, setLecturerId] = useState(ANY);
  const [groupState, setGroupState] = useState('ALL');
  const [importOpen, setImportOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const debouncedClass = useDebouncedValue(classCode);

  const query = {
    semesterId: semester?.id,
    roundId: roundId === ANY ? undefined : roundId,
    majorId: majorId === ANY ? undefined : majorId,
    class: debouncedClass || undefined,
    lecturerId: lecturerId === ANY ? undefined : lecturerId,
    hasGroup: groupState === 'ALL' ? undefined : groupState === 'true',
    q: debouncedSearch || undefined,
  };

  const { data, isPending, error } = useStudents({
    ...query,
    page,
    limit: pageSize,
  });
  const exportRoster = useExportStudents();

  if (!allowed) return null;

  const students = data?.items ?? [];

  const lecturerOptions = (lecturers ?? []).map((l) => ({
    value: String(l.id),
    label: sanitizeLecturerName(l.fullName, l.academicTitle).displayName,
  }));

  const majorOptions = (majors ?? []).map((m) => ({
    value: String(m.id),
    label: m.name,
  }));

  // Tính số lượng bộ lọc nâng cao đang kích hoạt (không tính ô tìm kiếm text chính)
  const activeSecondaryCount =
    (classCode ? 1 : 0) +
    (groupState !== 'ALL' ? 1 : 0) +
    (roundId !== ANY ? 1 : 0) +
    (majorId !== ANY ? 1 : 0) +
    (lecturerId !== ANY ? 1 : 0);

  const hasAnyFilter = activeSecondaryCount > 0 || search !== '';

  function refilter(apply: () => void) {
    apply();
    setPage(1);
  }

  function resetAllFilters() {
    setSearch('');
    setClassCode('');
    setRoundId(ANY);
    setMajorId(ANY);
    setLecturerId(ANY);
    setGroupState('ALL');
    setPage(1);
  }

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-3 md:h-[calc(100dvh-6.5rem)] md:max-h-[calc(100dvh-6.5rem)]">
        {/* THANH CÔNG CỤ: TÌM KIẾM + BỘ LỌC GỘP (CÁCH A) + NÚT THAO TÁC */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 min-w-[320px]">
            {/* 1. Ô tìm kiếm theo tên hoặc MSSV */}
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) =>
                  refilter(() => setSearch(event.target.value))
                }
                placeholder="Tìm theo tên hoặc mã sinh viên…"
                className="pl-9 h-9.5 text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
                aria-label="Tìm sinh viên"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => refilter(() => setSearch(''))}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* 2. Nút "Bộ lọc" gộp với Popover chứa các filter thứ cấp */}
            <Popover
              open={filterPopoverOpen}
              onOpenChange={(nextOpen, eventDetails) => {
                if (!nextOpen && eventDetails?.reason === 'outside-press') {
                  const target = eventDetails?.event?.target as HTMLElement | null;
                  if (
                    target?.closest?.('[data-combobox-content]') ||
                    target?.closest?.('[data-combobox-trigger]')
                  ) {
                    return;
                  }
                }
                setFilterPopoverOpen(nextOpen);
              }}
            >
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={`h-9.5 px-3.5 rounded-lg border-[1.5px] transition-all cursor-pointer shadow-2xs ${
                      activeSecondaryCount > 0
                        ? 'border-primary/50 bg-primary/8 text-primary font-semibold hover:bg-primary/12'
                        : 'border-[#c4c9d9] dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200'
                    }`}
                  />
                }
              >
                <SlidersHorizontal className="size-4 shrink-0" />
                <span>Bộ lọc</span>
                {activeSecondaryCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold">
                    {activeSecondaryCount}
                  </span>
                )}
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-88 p-4 space-y-4 shadow-xl border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1a1d26] rounded-xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-900 dark:text-neutral-100">
                    <SlidersHorizontal className="size-4 text-primary" />
                    <span>Bộ lọc nâng cao</span>
                  </div>
                  {activeSecondaryCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setClassCode('');
                        setRoundId(ANY);
                        setMajorId(ANY);
                        setLecturerId(ANY);
                        setGroupState('ALL');
                        setPage(1);
                      }}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      Đặt lại
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Lọc theo lớp sinh hoạt */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                      Mã lớp
                    </Label>
                    <Input
                      value={classCode}
                      onChange={(e) =>
                        refilter(() => setClassCode(e.target.value))
                      }
                      placeholder="Nhập mã lớp..."
                      className="h-8.5 text-xs rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700"
                    />
                  </div>

                  {/* Lọc theo tình trạng đề tài */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                      Tình trạng đề tài
                    </Label>
                    <Select
                      value={groupState}
                      onValueChange={(val) =>
                        refilter(() => setGroupState(val as string))
                      }
                    >
                      <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700">
                        <SelectValue>
                          {(v) =>
                            GROUP_FILTERS.find((opt) => opt.value === v)?.label
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {GROUP_FILTERS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                      value={roundId}
                      onValueChange={(val) =>
                        refilter(() => setRoundId(val as number))
                      }
                    >
                      <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700">
                        <SelectValue>
                          {(v) =>
                            v === ANY
                              ? 'Mọi đợt'
                              : (rounds?.find((r) => r.id === v)?.projectType
                                  .name ?? 'Mọi đợt')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value={ANY}>Mọi đợt</SelectItem>
                        {rounds?.map((round) => (
                          <SelectItem key={round.id} value={round.id}>
                            <span className="flex flex-col items-start">
                              <span>{round.projectType.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                Khóa {round.cohorts.join(', ')}
                              </span>
                            </span>
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
                    <Combobox
                      options={majorOptions}
                      value={String(majorId)}
                      onChange={(val) =>
                        refilter(() => setMajorId(Number(val) || ANY))
                      }
                      allLabel="Mọi chuyên ngành"
                      allValue={String(ANY)}
                      placeholder="Chọn chuyên ngành..."
                      searchPlaceholder="Tìm chuyên ngành..."
                      emptyText="Không tìm thấy chuyên ngành nào."
                    />
                  </div>

                  {/* Lọc theo giảng viên hướng dẫn */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                      Giảng viên hướng dẫn
                    </Label>
                    <Combobox
                      options={lecturerOptions}
                      value={String(lecturerId)}
                      onChange={(val) =>
                        refilter(() => setLecturerId(Number(val) || ANY))
                      }
                      allLabel="Mọi giảng viên"
                      allValue={String(ANY)}
                      placeholder="Chọn giảng viên..."
                      searchPlaceholder="Tìm theo tên giảng viên..."
                      emptyText="Không tìm thấy giảng viên nào."
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-end">
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-primary text-white hover:bg-primary/90 font-medium cursor-pointer"
                    onClick={() => setFilterPopoverOpen(false)}
                  >
                    Xem kết quả
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Các nút hành động bên phải: Tổng số SV + Import + Xuất Excel */}
          <div className="flex items-center gap-2.5">
            {data && (
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 mr-1 select-none">
                <strong className="text-primary font-bold text-sm">
                  {data.total}
                </strong>{' '}
                sinh viên
              </span>
            )}
            <Button
              variant="default"
              className="gap-1.5 h-9.5 px-3.5 bg-primary text-white hover:bg-primary/90 font-semibold shadow-xs cursor-pointer"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="size-4" />
              <span>Import SV đủ ĐK</span>
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 h-9.5 px-3.5 border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
              disabled={exportRoster.isPending}
              onClick={() => exportRoster.mutate(query)}
            >
              {exportRoster.isPending ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Download className="size-4" />
              )}
              <span>Xuất Excel</span>
            </Button>
          </div>
        </div>

        {/* HÀNG ACTIVE FILTER CHIPS (HIỆN DƯỚI DẠNG CHIP CÓ THỂ XÓA TỪNG CÁI) */}
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
                  onClick={() => refilter(() => setSearch(''))}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc từ khóa"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {classCode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>Lớp: {classCode}</span>
                <button
                  type="button"
                  onClick={() => refilter(() => setClassCode(''))}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc lớp"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {groupState !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  {GROUP_FILTERS.find((opt) => opt.value === groupState)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => refilter(() => setGroupState('ALL'))}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc tình trạng đề tài"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {roundId !== ANY && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  Đợt:{' '}
                  {rounds?.find((r) => r.id === roundId)?.projectType.name}
                </span>
                <button
                  type="button"
                  onClick={() => refilter(() => setRoundId(ANY))}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc đợt"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {majorId !== ANY && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  Ngành: {majors?.find((m) => m.id === majorId)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => refilter(() => setMajorId(ANY))}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc ngành"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {lecturerId !== ANY && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                <span>
                  GV:{' '}
                  {
                    sanitizeLecturerName(
                      lecturers?.find((l) => l.id === lecturerId)?.fullName,
                      lecturers?.find((l) => l.id === lecturerId)?.academicTitle,
                    ).displayName
                  }
                </span>
                <button
                  type="button"
                  onClick={() => refilter(() => setLecturerId(ANY))}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition text-blue-700 dark:text-blue-300 cursor-pointer"
                  title="Bỏ lọc giảng viên"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-destructive transition ml-1 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Xóa hết</span>
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Không tải được danh sách sinh viên.
          </p>
        )}

        {exportRoster.error && (
          <p className="text-sm text-destructive">
            Không xuất được file: {exportRoster.error.message}
          </p>
        )}

        {/* BẢNG DỮ LIỆU: VÙNG BẢNG (flex-1 min-h-0 overflow-auto), STICKY HEADER z-10 */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1d26] shadow-2xs overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <Table containerClassName="overflow-visible" className="relative w-full text-left text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44 px-5">
                    Sinh viên
                  </TableHead>
                  <TableHead className="w-28">
                    Lớp
                  </TableHead>
                  <TableHead className="w-40">
                    Chuyên ngành
                  </TableHead>
                  <TableHead className="w-80 max-w-[320px] px-5">
                    Đề tài
                  </TableHead>
                  <TableHead className="w-44">
                    GV hướng dẫn
                  </TableHead>
                  <TableHead className="min-w-36">
                    Ghi chú
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {students.map((student) => (
                  <StudentRow key={student.id} student={student} />
                ))}
              </TableBody>
            </Table>

            {isPending &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-t border-slate-200 dark:border-neutral-700/80 px-5 py-3.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}

            {!isPending && students.length === 0 && (
              <div className="py-12">
                <EmptyState
                  icon={Users}
                  title={
                    hasAnyFilter
                      ? 'Không có sinh viên nào khớp bộ lọc.'
                      : 'Chưa có sinh viên nào trong hệ thống. Nhập danh sách ở màn Tài khoản.'
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <PaginationBar
            page={data?.page ?? page}
            totalPages={data?.totalPages ?? 1}
            total={data?.total}
            pageSize={pageSize}
            itemName="sinh viên"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        <EligibleStudentsImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          defaultRoundId={roundId !== ANY ? roundId : undefined}
        />
      </div>
    </TooltipProvider>
  );
}

function StudentRow({ student }: { student: StudentRosterRow }) {
  return (
    <TableRow className="hover:bg-slate-50/70 dark:hover:bg-white/4 transition-colors">
      {/* 1. Sinh viên */}
      <TableCell className="px-5 py-3.5">
        <p className="font-semibold text-slate-900 dark:text-neutral-100">
          {student.fullName}
        </p>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground tabular-nums">
          <span className="font-mono text-primary font-semibold text-xs">
            {student.studentCode}
          </span>
          {student.cohort && ` · khóa ${student.cohort}`}
        </span>
      </TableCell>

      {/* 2. Lớp */}
      <TableCell className="px-4 py-3.5 font-medium text-slate-700 dark:text-neutral-300">
        {student.class ?? '—'}
      </TableCell>

      {/* 3. Chuyên ngành */}
      <TableCell className="px-4 py-3.5 text-slate-700 dark:text-neutral-300">
        {student.major?.name ?? '—'}
      </TableCell>

      {/* 4. Đề tài: Clamp 2 dòng + Tooltip hiển thị đầy đủ (Vấn đề 1) */}
      <TableCell className="px-5 py-3.5 max-w-[320px]">
        {student.group ? (
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger render={<div className="block cursor-default text-left" />}>
                <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-neutral-100 leading-snug hover:text-primary transition-colors">
                  {student.group.topic.title}
                </p>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-md p-3 text-xs leading-relaxed bg-slate-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-lg shadow-xl border border-slate-700 dark:border-neutral-700"
              >
                <p className="font-semibold text-primary mb-1">Tên đề tài đầy đủ:</p>
                <p className="text-slate-200 dark:text-neutral-200">
                  {student.group.topic.title}
                </p>
              </TooltipContent>
            </Tooltip>
            <span className="inline-block text-[11px] font-medium text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-white/6 px-2 py-0.5 rounded border border-slate-200/60 dark:border-white/8">
              {student.group.topic.projectType.name}
            </span>
          </div>
        ) : (
          /* Vấn đề 3: "Chưa có đề tài" tinh gọn, chuyên nghiệp, không màu mè AI */
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-neutral-400 bg-slate-100/80 dark:bg-neutral-800/60 border border-slate-200/80 dark:border-neutral-700/60">
            <span className="size-1.5 rounded-full bg-slate-400 dark:bg-neutral-500" />
            Chưa có đề tài
          </span>
        )}
      </TableCell>

      {/* 5. Giảng viên hướng dẫn */}
      <TableCell className="px-4 py-3.5 text-slate-700 dark:text-neutral-300 font-medium">
        {student.group
          ? sanitizeLecturerName(
              student.group.topic.lecturer.fullName,
              student.group.topic.lecturer.academicTitle,
            ).displayName
          : '—'}
      </TableCell>

      {/* 6. Ghi chú */}
      <TableCell className="px-4 py-3.5 text-xs text-muted-foreground">
        {student.note ?? '—'}
      </TableCell>
    </TableRow>
  );
}
