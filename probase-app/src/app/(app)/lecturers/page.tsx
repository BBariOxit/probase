'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, RotateCcw, Search, Users, X } from 'lucide-react';
import {
  useLecturerDirectory,
  type LecturerDirectoryQuery,
} from '@/lib/api/lecturers';
import { useMajors } from '@/lib/api/majors';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { formatMajorShort, sanitizeLecturerName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 15;

const ACADEMIC_TITLE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả học vị' },
  { value: 'GS.TS.', label: 'GS.TS.' },
  { value: 'PGS.TS.', label: 'PGS.TS.' },
  { value: 'TS.', label: 'TS.' },
  { value: 'ThS.', label: 'ThS.' },
] as const;

export default function LecturerDirectoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [majorId, setMajorId] = useState<string>('ALL');
  const [academicTitle, setAcademicTitle] = useState<string>('ALL');

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: majors } = useMajors();

  const query: LecturerDirectoryQuery = {
    q: debouncedSearch || undefined,
    majorId: majorId !== 'ALL' ? Number(majorId) : undefined,
    academicTitle: academicTitle !== 'ALL' ? academicTitle : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isPending, error } = useLecturerDirectory(query);

  const lecturers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const isFiltered =
    search !== '' || majorId !== 'ALL' || academicTitle !== 'ALL';

  function handleResetFilters() {
    setSearch('');
    setMajorId('ALL');
    setAcademicTitle('ALL');
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
          <Input
            id="lecturer-search"
            placeholder="Tìm tên, mã GV, hướng nghiên cứu…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9.5 rounded-lg border-[1.5px] border-slate-300 bg-white pr-8 pl-9 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-100 dark:placeholder:text-neutral-500"
            aria-label="Tìm giảng viên"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Bộ môn */}
        <Select
          value={majorId}
          onValueChange={(val) => {
            setMajorId((val as string) ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9.5 w-48 rounded-lg border-[1.5px] border-slate-300 bg-white text-sm font-medium text-slate-800 shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200"
            aria-label="Lọc theo bộ môn"
          >
            <SelectValue>
              {(val) => {
                if (!val || val === 'ALL') return 'Tất cả bộ môn';
                return (
                  majors?.find((m) => String(m.id) === String(val))?.name ??
                  'Tất cả bộ môn'
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-slate-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-[#1e1e1e]">
            <SelectItem value="ALL" className="text-sm">
              Tất cả bộ môn
            </SelectItem>
            {majors?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)} className="text-sm">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Học vị */}
        <Select
          value={academicTitle}
          onValueChange={(val) => {
            setAcademicTitle((val as string) ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-9.5 w-40 rounded-lg border-[1.5px] border-slate-300 bg-white text-sm font-medium text-slate-800 shadow-2xs dark:border-neutral-700 dark:bg-[#1e1e1e] dark:text-neutral-200"
            aria-label="Lọc theo học vị"
          >
            <SelectValue>
              {(val) =>
                ACADEMIC_TITLE_OPTIONS.find((opt) => opt.value === val)
                  ?.label ?? 'Tất cả học vị'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="border-slate-300 bg-white shadow-xl dark:border-neutral-700 dark:bg-[#1e1e1e]">
            {ACADEMIC_TITLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9.5 cursor-pointer px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 size-4" />
            Đặt lại
          </Button>
        )}

        {data && (
          <div className="ml-auto text-sm font-medium text-slate-600 select-none dark:text-neutral-400">
            <strong className="font-bold text-primary">{total}</strong> giảng
            viên
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Không tải được danh sách giảng viên. Vui lòng thử lại sau.
        </div>
      )}

      {/* Bảng danh sách giảng viên */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-card shadow-2xs dark:border-neutral-700">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[740px] text-left text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24 px-4">Mã GV</TableHead>
                <TableHead className="w-56 px-4">Giảng viên</TableHead>
                <TableHead className="w-24 px-3 text-center">Bộ môn</TableHead>
                <TableHead className="min-w-[260px] px-4">
                  Hướng nghiên cứu
                </TableHead>
                <TableHead className="w-36 px-4 text-center">
                  Tổng đề tài
                </TableHead>
                <TableHead className="w-24 px-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                    <TableCell className="px-4 py-3.5">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-center">
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <Skeleton className="mb-1 h-4 w-56" />
                      <Skeleton className="h-3 w-36" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-center">
                      <Skeleton className="mx-auto h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                  </TableRow>
                ))
              ) : lecturers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      icon={Users}
                      title={
                        isFiltered
                          ? 'Không có giảng viên nào phù hợp bộ lọc.'
                          : 'Chưa có giảng viên nào trong hệ thống.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                lecturers.map((lecturer) => {
                  const sanitized = sanitizeLecturerName(
                    lecturer.fullName,
                    lecturer.academicTitle,
                  );
                  const majorInfo = formatMajorShort(lecturer.major);
                  const stats = lecturer.topicStats ?? {
                    currentCount: 0,
                    openCount: 0,
                    pastCount: 0,
                  };
                  const totalTopics = stats.currentCount + stats.pastCount;

                  return (
                    <TableRow
                      key={lecturer.id}
                      onClick={() => router.push(`/lecturers/${lecturer.id}`)}
                      className="cursor-pointer transition-colors"
                    >
                      {/* Mã GV */}
                      <TableCell className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600 dark:text-neutral-400">
                        {lecturer.lecturerCode ?? '—'}
                      </TableCell>

                      {/* Họ tên + học vị + chức vụ */}
                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={lecturer.fullName}
                            src={lecturer.avatarUrl}
                            className="size-9 shrink-0 text-xs font-semibold"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/lecturers/${lecturer.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate font-semibold text-slate-900 transition-colors hover:text-primary dark:text-neutral-100 dark:hover:text-primary"
                            >
                              {sanitized.displayName}
                            </Link>
                            {lecturer.isHeadOfDepartment && (
                              <p className="mt-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                                Tổ trưởng Bộ môn
                              </p>
                            )}
                            {!lecturer.isHeadOfDepartment &&
                              lecturer.isHomeroomTeacher && (
                                <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                                  GVCN
                                </p>
                              )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Bộ môn viết tắt */}
                      <TableCell className="px-3 py-3.5 text-center">
                        {lecturer.major ? (
                          <span
                            className="font-semibold text-slate-800 dark:text-neutral-200"
                            title={majorInfo.full}
                          >
                            {majorInfo.short}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Hướng nghiên cứu */}
                      <TableCell className="px-4 py-3.5 whitespace-normal">
                        {lecturer.researchInterests ? (
                          <p className="line-clamp-2 text-sm leading-snug text-slate-600 dark:text-neutral-400">
                            {lecturer.researchInterests}
                          </p>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Tổng số lượng đề tài đã ra */}
                      <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="font-semibold text-primary">
                          {totalTopics}
                        </span>{' '}
                        <span className="text-slate-600 dark:text-neutral-400">
                          đề tài
                        </span>
                      </TableCell>

                      {/* Xem hồ sơ */}
                      <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/lecturers/${lecturer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <span>Chi tiết</span>
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data && totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          itemName="giảng viên"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
