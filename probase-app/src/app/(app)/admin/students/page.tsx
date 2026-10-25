'use client';

import { useState } from 'react';
import { Download, Loader2, Search, Users } from 'lucide-react';
import { useMajors } from '@/lib/api/majors';
import { useActiveSemester, useRoundsForSemester } from '@/lib/api/master-data';
import { useExportStudents, useStudents } from '@/lib/api/students';
import { useTopicLecturers } from '@/lib/api/topics';
import type { StudentRosterRow } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusPill } from '@/components/shared/status-pill';
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
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 25;

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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roundId, setRoundId] = useState(ANY);
  const [majorId, setMajorId] = useState(ANY);
  const [lecturerId, setLecturerId] = useState(ANY);
  const [groupState, setGroupState] = useState('ALL');
  const debouncedSearch = useDebouncedValue(search);

  const query = {
    semesterId: semester?.id,
    roundId: roundId === ANY ? undefined : roundId,
    majorId: majorId === ANY ? undefined : majorId,
    lecturerId: lecturerId === ANY ? undefined : lecturerId,
    hasGroup: groupState === 'ALL' ? undefined : groupState === 'true',
    q: debouncedSearch || undefined,
  };

  const { data, isPending, error } = useStudents({
    ...query,
    page,
    limit: PAGE_SIZE,
  });
  const exportRoster = useExportStudents();

  if (!allowed) return null;

  const students = data?.items ?? [];
  const filtering =
    debouncedSearch !== '' ||
    roundId !== ANY ||
    majorId !== ANY ||
    lecturerId !== ANY ||
    groupState !== 'ALL';

  function refilter(apply: () => void) {
    apply();
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => refilter(() => setSearch(event.target.value))}
            placeholder="Tìm theo tên hoặc mã sinh viên…"
            className="pl-8"
            aria-label="Tìm sinh viên"
          />
        </div>

        <Select
          value={groupState}
          onValueChange={(value) =>
            refilter(() => setGroupState(value as string))
          }
        >
          <SelectTrigger
            className="w-44"
            aria-label="Lọc theo tình trạng đề tài"
          >
            <SelectValue>
              {(value) =>
                GROUP_FILTERS.find((option) => option.value === value)?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GROUP_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={roundId}
          onValueChange={(value) => refilter(() => setRoundId(value as number))}
        >
          <SelectTrigger className="w-48" aria-label="Lọc theo đợt">
            <SelectValue>
              {(value) =>
                value === ANY
                  ? 'Mọi đợt'
                  : (rounds?.find((round) => round.id === value)?.projectType
                      .name ?? 'Mọi đợt')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Mọi đợt</SelectItem>
            {rounds?.map((round) => (
              <SelectItem key={round.id} value={round.id}>
                <span className="flex flex-col items-start">
                  <span>{round.projectType.name}</span>
                  <span className="text-xs text-muted-foreground">
                    khóa {round.cohorts.join(', ')}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={majorId}
          onValueChange={(value) => refilter(() => setMajorId(value as number))}
        >
          <SelectTrigger className="w-48" aria-label="Lọc theo chuyên ngành">
            <SelectValue>
              {(value) =>
                value === ANY
                  ? 'Mọi chuyên ngành'
                  : (majors?.find((major) => major.id === value)?.name ??
                    'Mọi chuyên ngành')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Mọi chuyên ngành</SelectItem>
            {majors?.map((major) => (
              <SelectItem key={major.id} value={major.id}>
                {major.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={lecturerId}
          onValueChange={(value) =>
            refilter(() => setLecturerId(value as number))
          }
        >
          <SelectTrigger className="w-52" aria-label="Lọc theo giảng viên">
            <SelectValue>
              {(value) => {
                const lecturer = lecturers?.find((one) => one.id === value);
                if (!lecturer) return 'Mọi giảng viên';
                return lecturer.academicTitle
                  ? `${lecturer.academicTitle} ${lecturer.fullName}`
                  : lecturer.fullName;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Mọi giảng viên</SelectItem>
            {lecturers?.map((lecturer) => (
              <SelectItem key={lecturer.id} value={lecturer.id}>
                {lecturer.academicTitle
                  ? `${lecturer.academicTitle} ${lecturer.fullName}`
                  : lecturer.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total} sinh viên
            </span>
          )}
          <Button
            variant="outline"
            disabled={exportRoster.isPending}
            onClick={() => exportRoster.mutate(query)}
          >
            {exportRoster.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
            Xuất Excel
          </Button>
        </div>
      </div>

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

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Sinh viên</TableHead>
                <TableHead className="w-28">Lớp</TableHead>
                <TableHead className="w-40">Chuyên ngành</TableHead>
                <TableHead className="min-w-56">Đề tài</TableHead>
                <TableHead className="w-44">GV hướng dẫn</TableHead>
                <TableHead className="min-w-40">Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <StudentRow key={student.id} student={student} />
              ))}
            </TableBody>
          </Table>
        </div>

        {isPending &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-t px-4 py-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}

        {!isPending && students.length === 0 && (
          <EmptyState
            icon={Users}
            title={
              filtering
                ? 'Không có sinh viên nào khớp bộ lọc.'
                : 'Chưa có sinh viên nào trong hệ thống. Nhập danh sách ở màn Tài khoản.'
            }
          />
        )}
      </div>

      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function StudentRow({ student }: { student: StudentRosterRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {student.fullName}
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground tabular-nums">
          {student.studentCode}
          {student.cohort && ` · khóa ${student.cohort}`}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {student.class ?? '—'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {student.major?.name ?? '—'}
      </TableCell>
      <TableCell>
        {student.group ? (
          <>
            <span className="line-clamp-2">{student.group.topic.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {student.group.topic.projectType.name}
            </span>
          </>
        ) : (
          <StatusPill label="Chưa có đề tài" tone="waiting" />
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {student.group
          ? student.group.topic.lecturer.academicTitle
            ? `${student.group.topic.lecturer.academicTitle} ${student.group.topic.lecturer.fullName}`
            : student.group.topic.lecturer.fullName
          : '—'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {student.note ?? ''}
      </TableCell>
    </TableRow>
  );
}
