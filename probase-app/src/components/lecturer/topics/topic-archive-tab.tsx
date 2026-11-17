'use client';

import { useMemo, useState } from 'react';
import { Archive, Copy, Eye, Loader2, MoreHorizontal } from 'lucide-react';
import type {
  Major,
  ProjectType,
  Semester,
  TopicListItem,
  TopicStatus,
} from '@/lib/api/types';
import { formatSemesterShort } from '@/lib/utils';
import { useTopicLecturers, useTopics } from '@/lib/api/topics';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
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
import { CloneTopicDialog } from './clone-topic-dialog';
import { TopicFilterBar } from './topic-filter-bar';

interface TopicArchiveTabProps {
  currentLecturerId: number;
  activeSemester?: Semester;
  allSemesters?: Semester[];
  projectTypes?: ProjectType[];
  majors?: Major[];
  onTopicCloned?: () => void;
}

export function TopicArchiveTab({
  currentLecturerId,
  activeSemester,
  allSemesters = [],
  projectTypes = [],
  majors = [],
  onTopicCloned,
}: TopicArchiveTabProps) {
  const { page, setPage, resetPage } = usePagination({
    initialPageSize: TOPIC_PAGE_SIZE,
  });

  // Past semesters (excluding current active semester)
  const pastSemesters = useMemo(
    () => allSemesters.filter((s) => !s.isActive),
    [allSemesters],
  );

  const [search, setSearch] = useState('');
  const [semesterId, setSemesterId] = useState(0); // 0 = all past semesters
  const [lecturerId, setLecturerId] = useState(currentLecturerId); // default to my past topics
  const [projectTypeId, setProjectTypeId] = useState(0);
  const [majorId, setMajorId] = useState(0);
  const [status, setStatus] = useState('ALL');

  const [cloneTarget, setCloneTarget] = useState<TopicListItem | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [previewTopicId, setPreviewTopicId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search);

  // Fetch all lecturers for the filter combobox
  const { data: lecturers = [] } = useTopicLecturers(undefined);

  const { data, isPending, error, refetch } = useTopics({
    // If specific past semester is picked, use it; otherwise exclude active semester
    semesterId: semesterId || undefined,
    excludeSemesterId: semesterId ? undefined : activeSemester?.id,
    lecturerId: lecturerId || undefined,
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
    semesterId > 0 ||
    lecturerId !== currentLecturerId ||
    projectTypeId > 0 ||
    majorId > 0 ||
    status !== 'ALL';

  function handleResetFilters() {
    setSearch('');
    setSemesterId(0);
    setLecturerId(currentLecturerId);
    setProjectTypeId(0);
    setMajorId(0);
    setStatus('ALL');
    resetPage();
  }

  function handleOpenClone(topic: TopicListItem) {
    setCloneTarget(topic);
    setCloneDialogOpen(true);
  }

  return (
    <div className="space-y-3.5">
      <TopicFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          resetPage();
        }}
        semesterId={semesterId}
        onSemesterChange={(val) => {
          setSemesterId(val);
          resetPage();
        }}
        semesters={pastSemesters}
        lecturerId={lecturerId}
        onLecturerChange={(val) => {
          setLecturerId(val);
          resetPage();
        }}
        lecturers={lecturers}
        allLecturerLabel="Tất cả giảng viên"
        defaultLecturerId={currentLecturerId}
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
          Không tải được kho đề tài cũ.
        </p>
      )}

      {/* Bảng dữ liệu dùng chuẩn TableHeader của ứng dụng */}
      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed text-left text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[360px] max-w-[420px] min-w-[260px] px-5 py-3">
                  Tiêu đề đề tài
                </TableHead>
                <TableHead className="w-36 px-4 py-3">Học kỳ</TableHead>
                <TableHead className="w-48 px-4 py-3">Giảng viên ra đề</TableHead>
                <TableHead className="w-36 px-4 py-3">Loại đồ án</TableHead>
                <TableHead className="w-36 px-4 py-3">Chuyên ngành</TableHead>
                <TableHead className="w-32 px-4 py-3">Trạng thái</TableHead>
                <TableHead className="w-16 px-3 py-3 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                >
                  <TableCell className="w-[360px] max-w-[420px] min-w-[260px] px-5 py-3.5 align-middle whitespace-normal">
                    <button
                      type="button"
                      onClick={() => setPreviewTopicId(topic.id)}
                      className="text-left font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal line-clamp-2 cursor-pointer text-sm"
                      title={topic.title}
                    >
                      {topic.title}
                    </button>
                  </TableCell>
                  <TableCell className="w-36 px-4 py-3.5 align-middle whitespace-nowrap text-sm font-medium text-slate-700 dark:text-neutral-300">
                    {formatSemesterShort(topic.semester)}
                  </TableCell>
                  <TableCell className="w-48 px-4 py-3.5 align-middle whitespace-nowrap text-sm text-slate-800 dark:text-neutral-200">
                    <span className="font-medium">
                      {topic.lecturer?.academicTitle
                        ? `${topic.lecturer.academicTitle} `
                        : ''}
                      {topic.lecturer?.fullName}
                    </span>
                  </TableCell>
                  <TableCell className="w-36 px-4 py-3.5 align-middle whitespace-nowrap text-sm font-medium text-slate-700 dark:text-neutral-300">
                    {topic.projectType?.name || '—'}
                  </TableCell>
                  <TableCell className="w-36 px-4 py-3.5 align-middle whitespace-nowrap text-sm text-slate-600 dark:text-neutral-400">
                    {topic.major?.name || 'Chung cho khoa'}
                  </TableCell>
                  <TableCell className="w-32 px-4 py-3.5 align-middle whitespace-nowrap">
                    <TopicStatusBadge status={topic.status} variant="text" />
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
                        <DropdownMenuItem
                          onClick={() => handleOpenClone(topic)}
                          className="cursor-pointer text-xs"
                        >
                          <Copy className="size-4 mr-2 text-primary" />
                          <span>Nhân bản sang kỳ này</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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
            icon={Archive}
            title={
              filtering
                ? 'Không tìm thấy đề tài cũ nào khớp bộ lọc.'
                : 'Chưa có dữ liệu đề tài từ các học kỳ trước.'
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

      {/* MODAL NHÂN BẢN ĐỀ TÀI */}
      <CloneTopicDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        topic={cloneTarget}
        activeSemester={activeSemester}
        projectTypes={projectTypes}
        majors={majors}
        onSuccess={() => {
          refetch();
          onTopicCloned?.();
        }}
      />

      {/* SHEET XEM CHI TIẾT */}
      <TopicDetailSheet
        topicId={previewTopicId}
        onClose={() => setPreviewTopicId(null)}
        hideRegisterButton
      />
    </div>
  );
}
