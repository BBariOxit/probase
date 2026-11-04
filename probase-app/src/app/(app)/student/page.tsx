'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';
import {
  useActiveSemester,
  useMyEligibleProjectTypes,
  useMyRounds,
  useProjectTypes,
} from '@/lib/api/master-data';
import { useMyGroup } from '@/lib/api/registration';
import { useTopicLecturers, useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebounce, usePagination } from '@/hooks';
import { sanitizeLecturerName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { MyGroupBanner } from '@/components/groups/my-group-banner';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { RegistrationPhaseNotice } from '@/components/rounds/registration-phase-notice';
import { SeatBadge } from '@/components/groups/seat-indicator';
import { StudentEligibilityBanner } from '@/components/students/student-eligibility-banner';
import { TopicRegisterButton } from '@/components/topics/topic-register-button';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
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

const PAGE_SIZE = 12;
const ANY = 0;
const MY_COHORT = -1;

export default function StudentTopicsPage() {
  const allowed = useRequireRole('STUDENT');
  const activeSemester = useActiveSemester();
  const { data: rounds } = useMyRounds(activeSemester?.id);
  const { data: projectTypes } = useProjectTypes();
  const { data: myTypes } = useMyEligibleProjectTypes(activeSemester?.id);
  const { data: lecturers } = useTopicLecturers(activeSemester?.id);
  const { data: myGroup } = useMyGroup();

  const { page, setPage, pageSize, setPageSize, resetPage } = usePagination({
    initialPageSize: PAGE_SIZE,
  });
  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState(MY_COHORT);
  const [lecturerId, setLecturerId] = useState(ANY);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isPending, error } = useTopics(
    {
      status: 'OPEN',
      semesterId: activeSemester?.id,
      forMyCohort: projectTypeId === MY_COHORT,
      projectTypeId:
        projectTypeId === ANY || projectTypeId === MY_COHORT
          ? undefined
          : projectTypeId,
      lecturerId: lecturerId === ANY ? undefined : lecturerId,
      q: debouncedSearch || undefined,
      page,
      limit: pageSize,
    },
    { enabled: activeSemester !== undefined },
  );

  if (!allowed) return null;

  const topics = data?.items ?? [];
  const filtering =
    debouncedSearch !== '' ||
    (projectTypeId !== ANY && projectTypeId !== MY_COHORT) ||
    lecturerId !== ANY;

  const myCohortTypes = myTypes?.map((type) => type.name).join(', ');

  const sanitizedLecturers = (lecturers ?? []).map((l) => ({
    ...l,
    ...sanitizeLecturerName(l.fullName, l.academicTitle),
  }));

  return (
    <div className="space-y-4">
      {/* ── Banner đủ điều kiện ── */}
      <StudentEligibilityBanner />

      {/* ── Banner nhóm đã đăng ký ── */}
      {myGroup && <MyGroupBanner group={myGroup} />}

      {/* ── Thông báo tiến trình đợt ── */}
      {rounds?.map((round) => (
        <RegistrationPhaseNotice
          key={round.id}
          subject={rounds.length > 1 ? round.projectType.name : undefined}
          round={round}
          hasGroup={myGroup != null}
        />
      ))}

      {/* ── Khung tìm kiếm & bộ lọc ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400 dark:text-neutral-500" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Tìm tên đề tài, mô tả…"
              className="pl-9 h-9 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500"
              aria-label="Tìm đề tài"
            />
          </div>

          <Select
            value={projectTypeId}
            onValueChange={(value) => {
              setProjectTypeId(value as number);
              resetPage();
            }}
          >
            <SelectTrigger
              className="h-9 min-w-44 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200"
              aria-label="Lọc theo loại đồ án"
            >
              <SelectValue>
                {(value) => {
                  if (value === MY_COHORT) return 'Khóa của bạn';
                  return (
                    projectTypes?.find((type) => type.id === value)?.name ??
                    'Mọi loại đồ án'
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1a1d26] border-slate-200 dark:border-neutral-700">
              <SelectItem value={MY_COHORT}>
                <span className="flex flex-col items-start">
                  <span>Khóa của bạn</span>
                  {myCohortTypes && (
                    <span className="text-[11px] text-muted-foreground">
                      {myCohortTypes}
                    </span>
                  )}
                </span>
              </SelectItem>
              <SelectItem value={ANY}>Mọi loại đồ án</SelectItem>
              {projectTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={lecturerId}
            onValueChange={(value) => {
              setLecturerId(value as number);
              resetPage();
            }}
          >
            <SelectTrigger
              className="h-9 min-w-48 text-xs sm:text-sm rounded-lg border-[1.5px] border-[#c4c9d9] dark:border-neutral-700 bg-white dark:bg-[#141414] text-slate-700 dark:text-neutral-200"
              aria-label="Lọc theo giảng viên"
            >
              <SelectValue>
                {(value) => {
                  const lecturer = sanitizedLecturers.find((one) => one.id === value);
                  if (!lecturer) return 'Mọi giảng viên';
                  return lecturer.displayName;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[220px] w-max bg-white dark:bg-[#1a1d26] border-slate-200 dark:border-neutral-700">
              <SelectItem value={ANY}>Mọi giảng viên</SelectItem>
              {sanitizedLecturers.map((lecturer) => (
                <SelectItem key={lecturer.id} value={lecturer.id}>
                  {lecturer.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {data && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 select-none">
              Hiển thị <strong className="text-primary font-bold text-sm">{data.total}</strong> đề tài
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-6 text-center text-sm text-destructive">
          Không tải được danh sách đề tài. Vui lòng thử lại sau.
        </div>
      )}

      {/* ── Bảng dữ liệu dùng chung (Shared Table Component) ── */}
      <div className="flex flex-col rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1a1d26] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table containerClassName="overflow-visible" className="relative w-full text-left text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[320px] px-5">Tên đề tài</TableHead>
                <TableHead className="w-64 px-4">Cán bộ hướng dẫn</TableHead>
                <TableHead className="w-40 px-4 text-center">Tình trạng</TableHead>
                <TableHead className="w-36 px-5 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => {
                const lecturerInfo = sanitizeLecturerName(
                  topic.lecturer.fullName,
                  topic.lecturer.academicTitle,
                );

                return (
                  <TableRow
                    key={topic.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-white/4"
                    onClick={() => setSelectedTopicId(topic.id)}
                  >
                    <TableCell className="px-5 py-3.5">
                      <Link
                        href={`/student/topics/${topic.id}`}
                        className="font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors line-clamp-2"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedTopicId(topic.id);
                        }}
                      >
                        {topic.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-neutral-400 border border-slate-200/80 dark:border-neutral-700/80">
                          {topic.projectType.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <span className="font-medium text-slate-800 dark:text-neutral-200">
                        {lecturerInfo.displayName}
                      </span>
                      {lecturerInfo.departmentRole && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lecturerInfo.departmentRole}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-center">
                      <SeatBadge topic={topic} />
                    </TableCell>

                    <TableCell className="px-5 py-3.5 text-right">
                      <div onClick={(e) => e.stopPropagation()}>
                        <TopicRegisterButton
                          topic={topic}
                          idle={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTopicId(topic.id)}
                              className="h-8 px-3 text-xs font-medium border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-700 hover:text-primary dark:hover:text-primary transition cursor-pointer shadow-2xs"
                            >
                              Xem chi tiết
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {isPending &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-t border-slate-200 dark:border-neutral-700/80 px-5 py-3.5"
              >
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="w-56 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="w-36 flex justify-center">
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <div className="w-32 flex justify-end">
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            ))}

          {!isPending && topics.length === 0 && (
            <div className="py-12">
              <EmptyState
                icon={BookOpen}
                title={
                  filtering
                    ? 'Không có đề tài nào khớp bộ lọc.'
                    : projectTypeId === MY_COHORT
                      ? 'Chưa có đề tài nào mở cho khóa của bạn. Chọn "Mọi loại đồ án" để xem toàn bộ.'
                      : 'Chưa có đề tài nào được mở đăng ký.'
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Phân trang ── */}
      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemName="đề tài"
        />
      )}

      {/* ── Sheet chi tiết đề tài ── */}
      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
      />
    </div>
  );
}
