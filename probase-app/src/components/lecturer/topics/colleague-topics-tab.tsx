'use client';

import { useMemo, useState } from 'react';
import { Eye, Loader2, MoreHorizontal, Users } from 'lucide-react';
import type {
  Major,
  ProjectType,
  Semester,
  TopicStatus,
} from '@/lib/api/types';
import { useTopicLecturers, useTopics } from '@/lib/api/topics';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicOwnerBadge } from '@/components/topics/topic-status-badge';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TOPIC_PAGE_SIZE } from '@/constants/pagination.constant';
import { TOPIC_STATUS_FILTERS } from '@/constants/status.constant';
import { useDebounce, usePagination } from '@/hooks';
import { TopicFilterBar } from './topic-filter-bar';

interface ColleagueTopicsTabProps {
  currentLecturerId: number;
  activeSemester?: Semester;
  projectTypes?: ProjectType[];
  majors?: Major[];
}

export function ColleagueTopicsTab({
  currentLecturerId,
  activeSemester,
  projectTypes = [],
  majors = [],
}: ColleagueTopicsTabProps) {
  const { page, setPage, resetPage } = usePagination({
    initialPageSize: TOPIC_PAGE_SIZE,
  });

  const [search, setSearch] = useState('');
  const [lecturerId, setLecturerId] = useState(0); // 0 = all colleagues
  const [projectTypeId, setProjectTypeId] = useState(0);
  const [majorId, setMajorId] = useState(0);
  const [status, setStatus] = useState('ALL');

  const [previewTopicId, setPreviewTopicId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search);

  // Fetch lecturers for current semester
  const { data: allLecturers = [] } = useTopicLecturers(activeSemester?.id);

  // Filter out current lecturer from the list of colleagues
  const colleagueLecturers = useMemo(
    () => allLecturers.filter((l) => l.id !== currentLecturerId),
    [allLecturers, currentLecturerId],
  );

  const { data, isPending, error } = useTopics({
    semesterId: activeSemester?.id,
    includeDrafts: true, // Show drafts so peers see topics in progress
    lecturerId: lecturerId || undefined,
    excludeLecturerId: lecturerId ? undefined : currentLecturerId, // Exclude self by default
    projectTypeId: projectTypeId || undefined,
    majorId: majorId || undefined,
    status: status === 'ALL' ? undefined : (status as TopicStatus),
    q: debouncedSearch || undefined,
    page,
    limit: TOPIC_PAGE_SIZE,
  });

  const topics = data?.items ?? [];
  const filtering =
    debouncedSearch !== '' ||
    lecturerId > 0 ||
    projectTypeId > 0 ||
    majorId > 0 ||
    status !== 'ALL';

  function handleResetFilters() {
    setSearch('');
    setLecturerId(0);
    setProjectTypeId(0);
    setMajorId(0);
    setStatus('ALL');
    resetPage();
  }

  return (
    <div className="space-y-3.5">
      <TopicFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          resetPage();
        }}
        lecturerId={lecturerId}
        onLecturerChange={(val) => {
          setLecturerId(val);
          resetPage();
        }}
        lecturers={colleagueLecturers}
        allLecturerLabel="Tất cả đồng nghiệp"
        defaultLecturerId={0}
        projectTypeId={projectTypeId}
        onProjectTypeChange={(val) => {
          setProjectTypeId(val);
          resetPage();
        }}
        projectTypes={projectTypes}
        majorId={majorId}
        onMajorChange={(val) => {
          setMajorId(val);
          resetPage();
        }}
        majors={majors}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          resetPage();
        }}
        statusOptions={TOPIC_STATUS_FILTERS}
        onResetFilters={handleResetFilters}
        totalCount={data?.total}
      />

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách đề tài đồng nghiệp.
        </p>
      )}

      {/* Bảng dữ liệu dùng chuẩn TableHeader của ứng dụng */}
      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed text-left text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[380px] max-w-[440px] min-w-[260px] px-5 py-3">
                  Tiêu đề đề tài
                </TableHead>
                <TableHead className="w-48 px-4 py-3">Giảng viên ra đề</TableHead>
                <TableHead className="w-40 px-4 py-3">Loại đồ án</TableHead>
                <TableHead className="w-40 px-4 py-3">Chuyên ngành</TableHead>
                <TableHead className="w-24 px-3 py-3 text-center">Chỗ</TableHead>
                <TableHead className="w-40 px-4 py-3">Trạng thái</TableHead>
                <TableHead className="w-16 px-3 py-3 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => {
                const isDraft = topic.status === 'DRAFT';
                return (
                  <TableRow
                    key={topic.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                  >
                    <TableCell className="w-[380px] max-w-[440px] min-w-[260px] px-5 py-3.5 align-middle whitespace-normal">
                      <button
                        type="button"
                        onClick={() => setPreviewTopicId(topic.id)}
                        className="text-left font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal line-clamp-2 cursor-pointer text-sm"
                        title={topic.title}
                      >
                        {topic.title}
                      </button>
                      {isDraft && (
                        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Đang soạn thảo (Bản nháp)
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-48 px-4 py-3.5 align-middle whitespace-nowrap text-sm text-slate-800 dark:text-neutral-200">
                      <span className="font-medium">
                        {topic.lecturer?.academicTitle
                          ? `${topic.lecturer.academicTitle} `
                          : ''}
                        {topic.lecturer?.fullName}
                      </span>
                    </TableCell>
                    <TableCell className="w-40 px-4 py-3.5 align-middle whitespace-nowrap text-sm font-medium text-slate-700 dark:text-neutral-300">
                      {topic.projectType?.name || '—'}
                    </TableCell>
                    <TableCell className="w-40 px-4 py-3.5 align-middle whitespace-nowrap text-sm text-slate-600 dark:text-neutral-400">
                      {topic.major?.name || 'Chung cho khoa'}
                    </TableCell>
                    <TableCell className="w-24 px-3 py-3.5 text-center align-middle whitespace-nowrap font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      {topic.activeGroup?.occupiedSeats ?? 0}/{topic.maxStudents}
                    </TableCell>
                    <TableCell className="w-40 px-4 py-3.5 align-middle whitespace-nowrap">
                      <TopicOwnerBadge
                        status={topic.status}
                        activeGroup={topic.activeGroup}
                        variant="text"
                      />
                    </TableCell>
                    <TableCell className="w-16 px-3 py-3.5 align-middle text-right whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8"
                              aria-label="Thao tác"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setPreviewTopicId(topic.id)}
                            className="cursor-pointer text-xs"
                          >
                            <Eye className="size-4 mr-2" />
                            <span>Xem chi tiết</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {isPending && (
          <div className="flex justify-center py-14">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && topics.length === 0 && (
          <EmptyState
            icon={Users}
            title={
              filtering
                ? 'Không tìm thấy đề tài nào của đồng nghiệp khớp bộ lọc.'
                : 'Chưa có đề tài nào của các giảng viên khác trong học kỳ này.'
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

      {/* SHEET XEM CHI TIẾT */}
      <TopicDetailSheet
        topicId={previewTopicId}
        onClose={() => setPreviewTopicId(null)}
        hideRegisterButton
      />
    </div>
  );
}
