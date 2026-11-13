'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useEligibleStudents,
  useRemoveEligibleStudent,
} from '@/lib/api/eligible-students';
import { useMajors } from '@/lib/api/majors';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import { useExportStudents, useStudents } from '@/lib/api/students';
import { useTopicLecturers } from '@/lib/api/topics';
import type { StudentRosterRow } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { AddEligibleStudentDialog } from '@/components/admin/add-eligible-student-dialog';
import { EligibleStudentsImportDialog } from '@/components/admin/eligible-students-import-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
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
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<StudentRosterRow | null>(null);

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
  const { data: eligibleMeta } = useEligibleStudents(
    roundId !== ANY ? roundId : undefined,
    { page: 1, limit: 1 },
  );
  const removeEligibleMutation = useRemoveEligibleStudent();
  const exportRoster = useExportStudents();

  if (!allowed) return null;

  const students = data?.items ?? [];
  const hasImportedRoundRoster =
    roundId !== ANY && (eligibleMeta?.totalEligible ?? 0) > 0;

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
      <div className="flex flex-col gap-3 md:max-h-[calc(100dvh-6.5rem)]">
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
                className="pl-9 h-9.5 text-sm rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
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
                    className={`h-9.5 px-3.5 rounded-lg border-[1.5px] transition-all cursor-pointer shadow-2xs ${activeSecondaryCount > 0
                        ? 'border-primary/50 bg-primary/8 text-primary font-semibold hover:bg-primary/12'
                        : 'border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200'
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
                className="w-88 p-4 space-y-4 shadow-xl border border-[#d1d5e0] dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] rounded-xl"
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
                      className="h-8.5 text-xs rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700"
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
                      <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
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
                      <SelectTrigger className="w-full h-8.5 text-xs rounded-lg border-[1.5px] border-slate-300 dark:border-neutral-700">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9.5 border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs shrink-0"
                  onClick={() => setAddStudentOpen(true)}
                  aria-label="Thêm sinh viên"
                >
                  <UserPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Thêm sinh viên</TooltipContent>
            </Tooltip>
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
              className="gap-1.5 h-9.5 px-3.5 border-[1.5px] border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
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

        {hasImportedRoundRoster && eligibleMeta && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-2 text-xs text-slate-700 dark:text-neutral-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Đợt <strong className="font-semibold">{eligibleMeta.round.projectTypeName}</strong> đang áp dụng danh sách import:{' '}
                <strong className="font-semibold">{eligibleMeta.totalEligible}</strong> SV đủ ĐK ({eligibleMeta.withGroupCount} đã có nhóm, {eligibleMeta.withoutGroupCount} chưa có nhóm).
              </span>
            </div>
          </div>
        )}

        {/* BẢNG DỮ LIỆU: VÙNG BẢNG (flex-1 min-h-0 overflow-auto), STICKY HEADER z-10 */}
        <div className="flex-auto min-h-0 flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs overflow-hidden">
          <div className="flex-auto min-h-0 overflow-auto">
            <Table containerClassName="overflow-visible" className="relative w-full min-w-[960px] text-left text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44 px-5">
                    Sinh viên
                  </TableHead>
                  <TableHead className="w-28 px-4">
                    Lớp
                  </TableHead>
                  <TableHead className="w-40 px-4">
                    Chuyên ngành
                  </TableHead>
                  <TableHead className="w-[300px] max-w-[320px] px-5">
                    Đề tài
                  </TableHead>
                  <TableHead className="w-28 px-4 whitespace-nowrap">
                    Loại đồ án
                  </TableHead>
                  <TableHead className="w-44 px-4 whitespace-nowrap">
                    GV hướng dẫn
                  </TableHead>
                  <TableHead className="w-32 px-4 whitespace-nowrap">
                    Ghi chú
                  </TableHead>
                  {hasImportedRoundRoster && (
                    <TableHead className="w-16 px-3 text-right whitespace-nowrap">
                      Xóa
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    canManageRound={hasImportedRoundRoster}
                    onRemoveFromRound={setStudentToRemove}
                  />
                ))}
              </TableBody>
            </Table>

            {isPending &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-t border-slate-200 dark:border-neutral-700/80 px-5 py-3.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}

            {!isPending && students.length === 0 && (
              <div className="py-12">
                <EmptyState
                  icon={Users}
                  title={
                    hasAnyFilter
                      ? 'Không có sinh viên nào khớp bộ lọc.'
                      : 'Chưa có sinh viên nào trong hệ thống. Bấm "Import SV đủ ĐK" để nhập danh sách sinh viên.'
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

        <AddEligibleStudentDialog
          open={addStudentOpen}
          onOpenChange={setAddStudentOpen}
          defaultRoundId={roundId !== ANY ? roundId : undefined}
        />

        <EligibleStudentsImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          defaultRoundId={roundId !== ANY ? roundId : undefined}
        />

        <ConfirmDialog
          open={studentToRemove !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setStudentToRemove(null);
          }}
          title="Xóa khỏi danh sách đủ điều kiện?"
          description={
            studentToRemove
              ? `Sinh viên ${studentToRemove.fullName} (${studentToRemove.studentCode}) sẽ bị xóa khỏi danh sách đủ điều kiện của đợt đang chọn và không thể đăng ký đề tài trong đợt này trừ khi được import lại.`
              : ''
          }
          confirmLabel="Xóa khỏi đợt"
          onConfirm={async () => {
            if (!studentToRemove || roundId === ANY) return;
            await removeEligibleMutation.mutateAsync({
              roundId,
              studentId: studentToRemove.id,
            });
            toast.success(
              `Đã xóa ${studentToRemove.fullName} khỏi danh sách đủ điều kiện`,
            );
            setStudentToRemove(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function StudentRow({
  student,
  canManageRound,
  onRemoveFromRound,
}: {
  student: StudentRosterRow;
  canManageRound: boolean;
  onRemoveFromRound: (student: StudentRosterRow) => void;
}) {
  return (
    <TableRow className="hover:bg-slate-50/70 dark:hover:bg-white/4 transition-colors">
      {/* 1. Sinh viên */}
      <TableCell className="px-5 py-3.5 align-middle">
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
      <TableCell className="px-4 py-3.5 font-medium text-slate-700 dark:text-neutral-300 align-middle">
        {student.class ?? '—'}
      </TableCell>

      {/* 3. Chuyên ngành */}
      <TableCell className="px-4 py-3.5 text-slate-700 dark:text-neutral-300 align-middle">
        {student.major?.name ?? '—'}
      </TableCell>

      {/* 4. Đề tài: Fix cứng chiều dài, truncate 3 chấm + tooltip popup tên đầy đủ khi hover */}
      <TableCell className="w-[300px] max-w-[320px] px-5 py-3.5 align-middle">
        {student.group ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/admin/topics/${student.group.topic.id}`}
                  className="block cursor-pointer text-left w-full max-w-[280px] truncate"
                />
              }
            >
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100 leading-snug hover:text-primary transition-colors">
                {student.group.topic.title}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="max-w-md p-3 text-xs leading-relaxed bg-slate-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-lg shadow-xl border border-slate-700 dark:border-neutral-700 z-50"
            >
              <p className="font-semibold text-primary mb-1">Tên đề tài đầy đủ:</p>
              <p className="text-slate-200 dark:text-neutral-200 break-words [overflow-wrap:anywhere]">
                {student.group.topic.title}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs font-medium text-primary">
            Chưa có đề tài
          </span>
        )}
      </TableCell>

      {/* 5. Loại đồ án (KLTN / DACN / DACS - chữ thường không badge, w-28) */}
      <TableCell className="w-28 px-4 py-3.5 font-medium text-slate-700 dark:text-neutral-300 align-middle whitespace-nowrap">
        {student.group ? (
          <span title={getProjectTypeAbbr(student.group.topic.projectType).full}>
            {getProjectTypeAbbr(student.group.topic.projectType).short}
          </span>
        ) : (
          '—'
        )}
      </TableCell>

      {/* 6. Giảng viên hướng dẫn */}
      <TableCell className="w-44 px-4 py-3.5 text-slate-700 dark:text-neutral-300 font-medium align-middle whitespace-nowrap">
        {student.group
          ? sanitizeLecturerName(
            student.group.topic.lecturer.fullName,
            student.group.topic.lecturer.academicTitle,
          ).displayName
          : '—'}
      </TableCell>

      {/* 7. Ghi chú (w-32 cố định) */}
      <TableCell className="w-32 px-4 py-3.5 text-xs text-muted-foreground align-middle">
        {student.note ?? '—'}
      </TableCell>

      {canManageRound && (
        <TableCell className="w-16 px-3 py-3.5 text-right align-middle">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={student.group !== null}
            onClick={() => onRemoveFromRound(student)}
            title={
              student.group !== null
                ? 'Sinh viên đã có nhóm đề tài, không thể xóa khỏi đợt'
                : 'Xóa khỏi danh sách đủ điều kiện của đợt'
            }
            aria-label={`Xóa ${student.fullName} khỏi danh sách đủ điều kiện`}
            className="text-muted-foreground hover:text-destructive disabled:opacity-35"
          >
            <Trash2 className="size-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
