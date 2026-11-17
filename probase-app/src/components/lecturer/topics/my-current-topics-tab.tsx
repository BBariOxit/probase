'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Major,
  ProjectType,
  Semester,
  TopicListItem,
  TopicStatus,
} from '@/lib/api/types';
import {
  useDeleteTopic,
  useSubmitDraftTopics,
  useTopicTransition,
  useTopics,
} from '@/lib/api/topics';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicOwnerBadge } from '@/components/topics/topic-status-badge';
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
import { useDebounce, useDisclosure, usePagination } from '@/hooks';
import { TopicFilterBar } from './topic-filter-bar';

function RowActions({
  topic,
  isHeadOfDepartment,
  lecturerMajorId,
}: {
  topic: TopicListItem;
  isHeadOfDepartment: boolean;
  lecturerMajorId?: number;
}) {
  const transition = useTopicTransition();
  const remove = useDeleteTopic();
  const deleteDialog = useDisclosure();
  const withdrawDialog = useDisclosure();

  const isPendingReview =
    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';
  const topicMajorId = topic.majorId ?? topic.major?.id;
  const willAutoApprove =
    isHeadOfDepartment &&
    (!lecturerMajorId || !topicMajorId || topicMajorId === lecturerMajorId);
  const submitLabel = willAutoApprove ? 'Gửi & duyệt' : 'Gửi duyệt';
  const hasNoRegisteredStudents =
    topic.activeGroup === null || topic.activeGroup.occupiedSeats === 0;
  const canEdit =
    topic.status !== 'REJECTED' &&
    topic.status !== 'IN_PROGRESS' &&
    topic.status !== 'COMPLETED' &&
    hasNoRegisteredStudents;
  const canDelete =
    topic.activeGroup === null &&
    topic.status !== 'IN_PROGRESS' &&
    topic.status !== 'COMPLETED';

  async function handleSubmitTopic() {
    try {
      const updated = await transition.mutateAsync({
        id: topic.id,
        to: 'submit',
      });
      toast.success(
        updated.status === 'APPROVED'
          ? 'Đề tài đã được tự động phê duyệt (TTBM), sẵn sàng chờ Giáo vụ mở đăng ký.'
          : 'Đã gửi đề tài lên Bộ môn thẩm định.',
      );
    } catch {
      toast.error('Không thể gửi duyệt đề tài.');
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 justify-end">
        {topic.status === 'DRAFT' && (
          <Button
            size="xs"
            variant="default"
            className="h-7.5 px-2.5 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
            disabled={transition.isPending}
            onClick={(e) => {
              e.stopPropagation();
              void handleSubmitTopic();
            }}
          >
            {transition.isPending && transition.variables?.id === topic.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            <span>{submitLabel}</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Hành động">
                {transition.isPending && transition.variables?.id === topic.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <MoreHorizontal />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={<Link href={`/lecturer/topics/${topic.id}`} />}
              className="cursor-pointer"
            >
              <Eye className="size-4" />
              Xem chi tiết
            </DropdownMenuItem>

            {topic.status === 'DRAFT' && (
              <DropdownMenuItem
                onClick={() => {
                  void handleSubmitTopic();
                }}
              >
                <Send className="size-4" />
                {submitLabel}
              </DropdownMenuItem>
            )}

            {isPendingReview && (
              <DropdownMenuItem
                onClick={withdrawDialog.onOpen}
                className="text-amber-600 focus:text-amber-600 dark:text-amber-500 dark:focus:text-amber-500 cursor-pointer"
              >
                <Undo2 className="size-4" />
                Thu hồi
              </DropdownMenuItem>
            )}

            {canEdit && (
              <DropdownMenuItem
                render={<Link href={`/lecturer/topics/${topic.id}?edit=true`} />}
              >
                <Pencil className="size-4" />
                Sửa
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                variant="destructive"
                onClick={deleteDialog.onOpen}
              >
                <Trash2 className="size-4" />
                Xoá
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={withdrawDialog.isOpen}
        onOpenChange={withdrawDialog.setIsOpen}
        title="Thu hồi gửi duyệt đề tài?"
        description={`Đề tài "${topic.title}" sẽ được chuyển về trạng thái Bản nháp để bạn có thể chỉnh sửa và gửi duyệt lại sau.`}
        confirmLabel="Thu hồi về bản nháp"
        onConfirm={async () => {
          try {
            await transition.mutateAsync({ id: topic.id, to: 'withdraw' });
            toast.success('Đã thu hồi đề tài về bản nháp thành công.');
          } catch (err: unknown) {
            toast.error(
              err instanceof Error ? err.message : 'Không thể thu hồi đề tài.',
            );
          }
        }}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.setIsOpen}
        title="Xoá đề tài?"
        description={`"${topic.title}" sẽ bị xoá vĩnh viễn. Không thể hoàn tác.`}
        confirmLabel="Xoá đề tài"
        onConfirm={() => remove.mutateAsync(topic.id)}
      />
    </>
  );
}

interface MyCurrentTopicsTabProps {
  activeSemester?: Semester;
  isHeadOfDepartment: boolean;
  lecturerMajorId?: number;
  projectTypes?: ProjectType[];
  majors?: Major[];
}

export function MyCurrentTopicsTab({
  activeSemester,
  isHeadOfDepartment,
  lecturerMajorId,
  projectTypes = [],
  majors = [],
}: MyCurrentTopicsTabProps) {
  const { page, setPage, resetPage } = usePagination({
    initialPageSize: TOPIC_PAGE_SIZE,
  });

  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState(0);
  const [majorId, setMajorId] = useState(0);
  const [status, setStatus] = useState('ALL');

  const debouncedSearch = useDebounce(search);

  const { data, isPending, error } = useTopics({
    mine: true,
    semesterId: activeSemester?.id,
    projectTypeId: projectTypeId || undefined,
    majorId: majorId || undefined,
    status: status === 'ALL' ? undefined : (status as TopicStatus),
    q: debouncedSearch || undefined,
    page,
    limit: TOPIC_PAGE_SIZE,
  });

  const { data: draftsData } = useTopics({
    mine: true,
    semesterId: activeSemester?.id,
    status: 'DRAFT',
    limit: 100,
  });

  const submitDrafts = useSubmitDraftTopics();
  const draftCount = draftsData?.total ?? 0;

  const topics = data?.items ?? [];
  const filtering =
    debouncedSearch !== '' ||
    projectTypeId > 0 ||
    majorId > 0 ||
    status !== 'ALL';

  function handleResetFilters() {
    setSearch('');
    setProjectTypeId(0);
    setMajorId(0);
    setStatus('ALL');
    resetPage();
  }

  return (
    <div className="space-y-4">
      <TopicFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          resetPage();
        }}
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
        rightActions={
          <div className="flex items-center gap-2.5">
            {draftCount > 0 && (
              <Button
                variant="outline"
                className="gap-1.5 h-9 text-xs font-semibold border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
                disabled={submitDrafts.isPending}
                onClick={() => {
                  submitDrafts
                    .mutateAsync(undefined)
                    .then((res) => toast.success(res.message))
                    .catch(() => toast.error('Không thể gửi duyệt đề tài'));
                }}
              >
                {submitDrafts.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {isHeadOfDepartment
                  ? `Gửi & duyệt (${draftCount})`
                  : `Gửi duyệt cho Bộ môn (${draftCount})`}
              </Button>
            )}
            <Button
              className="h-9 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
              render={<Link href="/lecturer/topics/new" />}
            >
              <Plus className="size-4" />
              Tạo đề tài
            </Button>
          </div>
        }
      />

      {error && (
        <p className="text-xs text-destructive">
          Không tải được danh sách đề tài.
        </p>
      )}

      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed text-left text-sm">
            <TableHeader className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-300 dark:border-neutral-700">
              <TableRow>
                <TableHead className="w-[360px] max-w-[420px] min-w-[260px] px-5 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Tiêu đề đề tài
                </TableHead>
                <TableHead className="w-36 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Loại đồ án
                </TableHead>
                <TableHead className="w-36 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Chuyên ngành
                </TableHead>
                <TableHead className="w-24 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 text-center whitespace-nowrap">
                  Chỗ
                </TableHead>
                <TableHead className="w-36 px-3 py-3 text-xs font-bold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  Trạng thái
                </TableHead>
                <TableHead className="w-28 px-4 py-3 text-right whitespace-nowrap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 border-b border-slate-200 dark:border-neutral-800/60"
                >
                  <TableCell className="w-[360px] max-w-[420px] min-w-[260px] px-5 py-3.5 align-middle whitespace-normal">
                    <div className="w-full max-w-[420px] whitespace-normal">
                      <Link
                        href={`/lecturer/topics/${topic.id}`}
                        className="block font-semibold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal line-clamp-2 cursor-pointer text-sm"
                        title={topic.title}
                      >
                        {topic.title}
                      </Link>
                      {(topic.status === 'DRAFT' ||
                        topic.status === 'REJECTED') &&
                        topic.departmentFeedback?.trim() && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-normal">
                            <Link
                              href={`/lecturer/topics/${topic.id}`}
                              title={topic.departmentFeedback}
                              className="font-medium text-amber-600 hover:underline dark:text-amber-400"
                            >
                              Xem góp ý từ Bộ môn
                            </Link>
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="w-36 px-3 py-3.5 align-middle whitespace-nowrap text-xs font-medium text-slate-700 dark:text-neutral-300">
                    {topic.projectType?.name || '—'}
                  </TableCell>
                  <TableCell className="w-36 px-3 py-3.5 align-middle whitespace-nowrap text-xs text-slate-600 dark:text-neutral-400">
                    {topic.major?.name || 'Chung cho khoa'}
                  </TableCell>
                  <TableCell className="w-24 px-3 py-3.5 text-center align-middle whitespace-nowrap font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                    {topic.activeGroup?.occupiedSeats ?? 0}/{topic.maxStudents}
                  </TableCell>
                  <TableCell className="w-36 px-3 py-3.5 align-middle whitespace-nowrap">
                    <TopicOwnerBadge
                      status={topic.status}
                      activeGroup={topic.activeGroup}
                      variant="text"
                    />
                  </TableCell>
                  <TableCell className="w-28 px-4 py-3.5 align-middle text-right whitespace-nowrap">
                    <RowActions
                      topic={topic}
                      isHeadOfDepartment={isHeadOfDepartment}
                      lecturerMajorId={lecturerMajorId}
                    />
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
            icon={BookOpen}
            title={
              filtering
                ? 'Không có đề tài nào khớp bộ lọc.'
                : 'Bạn chưa ra đề tài nào cho học kỳ này.'
            }
            action={
              filtering ? undefined : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs cursor-pointer"
                  render={<Link href="/lecturer/topics/new" />}
                >
                  <Plus className="size-3.5" />
                  Tạo đề tài đầu tiên
                </Button>
              )
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
