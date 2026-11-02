'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const { page, setPage, resetPage } = usePagination({
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
      limit: PAGE_SIZE,
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

      {/* ── Khung bảng danh sách đề tài chuẩn Enterprise SaaS ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder="Tìm tên đề tài, mô tả…"
                className="pl-9 h-9 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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
                className="h-9 min-w-44 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm"
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
              <SelectContent>
                <SelectItem value={MY_COHORT}>
                  <span className="flex flex-col items-start">
                    <span>Khóa của bạn</span>
                    {myCohortTypes && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
                className="h-9 min-w-48 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm"
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
              <SelectContent className="min-w-[220px] w-max">
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
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="text-slate-800 dark:text-slate-200">{data.total}</strong> đề tài
            </span>
          )}
        </div>

        {/* Nội dung bảng */}
        {error && (
          <div className="p-6 text-center text-sm text-destructive">
            Không tải được danh sách đề tài. Vui lòng thử lại sau.
          </div>
        )}

        {isPending && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        )}

        {!isPending && topics.length === 0 && (
          <div className="p-8">
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

        {!isPending && topics.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 min-w-[280px]">Tên đề tài</th>
                  <th className="px-5 py-3.5 w-64">Cán bộ hướng dẫn</th>
                  <th className="px-5 py-3.5 w-40 text-center">Tình trạng</th>
                  <th className="px-5 py-3.5 w-36 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topics.map((topic) => {
                  const lecturerInfo = sanitizeLecturerName(
                    topic.lecturer.fullName,
                    topic.lecturer.academicTitle,
                  );

                  return (
                    <tr
                      key={topic.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedTopicId(topic.id)}
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/student/topics/${topic.id}`}
                          className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 transition-colors line-clamp-2"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedTopicId(topic.id);
                          }}
                        >
                          {topic.title}
                        </Link>
                        <span className="mt-1 inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          {topic.projectType.name}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {lecturerInfo.displayName}
                        </span>
                        {lecturerInfo.departmentRole && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {lecturerInfo.departmentRole}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <SeatBadge topic={topic} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <TopicRegisterButton
                            topic={topic}
                            idle={
                              <button
                                type="button"
                                onClick={() => setSelectedTopicId(topic.id)}
                                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition"
                              >
                                Xem chi tiết
                              </button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phân trang */}
      {data && data.totalPages > 1 && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Sheet chi tiết đề tài */}
      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
      />
    </div>
  );
}
