'use client';

import { useMemo, useState } from 'react';
import { Archive, Copy, Eye, Loader2 } from 'lucide-react';
import type {
  Major,
  ProjectType,
  Semester,
  TopicListItem,
  TopicStatus,
} from '@/lib/api/types';
import { useTopicLecturers, useTopics } from '@/lib/api/topics';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicStatusBadge } from '@/components/topics/topic-status-badge';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-4">
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
        <p className="text-xs text-destructive">
          Không tải được kho đề tài cũ.
        </p>
      )}

      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed text-left text-sm">
            <TableHeader className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-300 dark:border-neutral-700">
              <TableRow>
                <TableHead className="w-[340px] max-w-[400px] min-w-[240px] px-5 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Tiêu đề đề tài
                </TableHead>
                <TableHead className="w-32 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Học kỳ
                </TableHead>
                <TableHead className="w-44 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Giảng viên ra đề
                </TableHead>
                <TableHead className="w-36 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Loại đồ án
                </TableHead>
                <TableHead className="w-36 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Chuyên ngành
                </TableHead>
                <TableHead className="w-28 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Trạng thái
                </TableHead>
                <TableHead className="w-32 px-4 py-3 text-right whitespace-nowrap">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => {
                const isMyTopic = topic.lecturer?.id === currentLecturerId;
                return (
                  <TableRow
                    key={topic.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 border-b border-slate-200 dark:border-neutral-800/60"
                  >
                    <TableCell className="w-[340px] max-w-[400px] min-w-[240px] px-5 py-3.5 align-middle whitespace-normal">
                      <button
                        type="button"
                        onClick={() => setPreviewTopicId(topic.id)}
                        className="text-left font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal line-clamp-2 cursor-pointer text-sm"
                        title={topic.title}
                      >
                        {topic.title}
                      </button>
                    </TableCell>
                    <TableCell className="w-32 px-3 py-3.5 align-middle whitespace-nowrap text-xs text-slate-600 dark:text-neutral-400">
                      {topic.semester?.name || '—'}
                    </TableCell>
                    <TableCell className="w-44 px-3 py-3.5 align-middle whitespace-nowrap text-xs">
                      <span className="font-medium text-slate-800 dark:text-neutral-200">
                        {topic.lecturer?.academicTitle
                          ? `${topic.lecturer.academicTitle} `
                          : ''}
                        {topic.lecturer?.fullName}
                      </span>
                      {isMyTopic && (
                        <span className="ml-1.5 text-[10px] font-semibold text-primary">
                          (Tôi)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-36 px-3 py-3.5 align-middle whitespace-nowrap text-xs font-medium text-slate-700 dark:text-neutral-300">
                      {topic.projectType?.name || '—'}
                    </TableCell>
                    <TableCell className="w-36 px-3 py-3.5 align-middle whitespace-nowrap text-xs text-slate-600 dark:text-neutral-400">
                      {topic.major?.name || 'Chung cho khoa'}
                    </TableCell>
                    <TableCell className="w-28 px-3 py-3.5 align-middle whitespace-nowrap">
                      <TopicStatusBadge status={topic.status} variant="text" />
                    </TableCell>
                    <TableCell className="w-32 px-4 py-3.5 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7.5 px-2.5 gap-1.5 text-xs font-semibold border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
                          onClick={() => handleOpenClone(topic)}
                          title="Tạo bản sao đề tài vào học kỳ hiện tại"
                        >
                          <Copy className="size-3 text-primary" />
                          <span>Nhân bản</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7.5 text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer"
                          onClick={() => setPreviewTopicId(topic.id)}
                          title="Xem chi tiết"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </div>
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
