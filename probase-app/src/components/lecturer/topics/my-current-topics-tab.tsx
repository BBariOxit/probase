'use client';

import { useMemo, useState } from 'react';
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
import { formatMajorShort, formatProjectTypeShort } from '@/lib/utils';
import {
  useBulkDeleteTopics,
  useBulkWithdrawTopics,
  useDeleteTopic,
  useSubmitDraftTopics,
  useTopicTransition,
  useTopics,
} from '@/lib/api/topics';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicOwnerBadge } from '@/components/topics/topic-status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  useDebounce,
  useDisclosure,
  usePagination,
  useTableSelection,
} from '@/hooks';
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
            className="h-8 px-2.5 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
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
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8"
                aria-label="Hành động"
              >
                {transition.isPending && transition.variables?.id === topic.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" />
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
              <span>Xem chi tiết</span>
            </DropdownMenuItem>

            {topic.status === 'DRAFT' && (
              <DropdownMenuItem
                onClick={() => {
                  void handleSubmitTopic();
                }}
                className="cursor-pointer"
              >
                <Send className="size-4" />
                <span>{submitLabel}</span>
              </DropdownMenuItem>
            )}

            {isPendingReview && (
              <DropdownMenuItem
                onClick={withdrawDialog.onOpen}
                className="text-amber-600 focus:text-amber-600 dark:text-amber-500 dark:focus:text-amber-500 cursor-pointer"
              >
                <Undo2 className="size-4" />
                <span>Thu hồi</span>
              </DropdownMenuItem>
            )}

            {canEdit && (
              <DropdownMenuItem
                render={<Link href={`/lecturer/topics/${topic.id}?edit=true`} />}
                className="cursor-pointer"
              >
                <Pencil className="size-4" />
                <span>Sửa</span>
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                variant="destructive"
                onClick={deleteDialog.onOpen}
                className="cursor-pointer"
              >
                <Trash2 className="size-4" />
                <span>Xoá</span>
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
        confirmVariant="default"
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
  const bulkWithdraw = useBulkWithdrawTopics();
  const bulkDelete = useBulkDeleteTopics();
  const bulkWithdrawDialog = useDisclosure();
  const bulkDeleteDialog = useDisclosure();
  const draftCount = draftsData?.total ?? 0;

  const topics = useMemo(() => data?.items ?? [], [data?.items]);
  const {
    selectedItems,
    selectedCount,
    allOnPageSelected,
    isSelected,
    toggleRow,
    toggleAllOnPage,
    clearSelection,
    removeSelectedIds,
  } = useTableSelection(topics);

  const selectedDraftIds = useMemo(
    () => selectedItems.filter((t) => t.status === 'DRAFT').map((t) => t.id),
    [selectedItems],
  );
  const selectedPendingIds = useMemo(
    () =>
      selectedItems
        .filter(
          (t) =>
            (t.status === 'PENDING_DEPARTMENT' || t.status === 'PENDING') &&
            t.activeGroup === null,
        )
        .map((t) => t.id),
    [selectedItems],
  );
  const selectedDeletableIds = useMemo(
    () =>
      selectedItems
        .filter(
          (t) =>
            t.activeGroup === null &&
            t.status !== 'IN_PROGRESS' &&
            t.status !== 'COMPLETED',
        )
        .map((t) => t.id),
    [selectedItems],
  );
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
    <div className="space-y-3.5">
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
                className="gap-1.5 h-9.5 text-xs font-semibold border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
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
              className="h-9.5 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer bg-primary text-white hover:bg-primary/90"
              render={<Link href="/lecturer/topics/new" />}
            >
              <Plus className="size-4" />
              Tạo đề tài
            </Button>
          </div>
        }
      />

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách đề tài.
        </p>
      )}

      <BulkActionBar
        count={selectedCount}
        itemName="đề tài"
        onClear={clearSelection}
      >
        {selectedDraftIds.length > 0 && (
          <Button
            type="button"
            size="sm"
            disabled={submitDrafts.isPending}
            onClick={() => {
              submitDrafts
                .mutateAsync(selectedDraftIds)
                .then((res) => {
                  toast.success(res.message);
                  removeSelectedIds(selectedDraftIds);
                })
                .catch(() => toast.error('Không thể gửi duyệt các đề tài đã chọn.'));
            }}
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            {submitDrafts.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>
              {isHeadOfDepartment
                ? `Gửi & duyệt (${selectedDraftIds.length})`
                : `Gửi duyệt (${selectedDraftIds.length})`}
            </span>
          </Button>
        )}

        {selectedPendingIds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={bulkWithdraw.isPending}
            onClick={bulkWithdrawDialog.onOpen}
            className="h-8 gap-1.5 text-xs font-medium text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/30 cursor-pointer"
          >
            <Undo2 className="size-3.5" />
            <span>Thu hồi ({selectedPendingIds.length})</span>
          </Button>
        )}

        {selectedDeletableIds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={bulkDelete.isPending}
            onClick={bulkDeleteDialog.onOpen}
            className="h-8 gap-1.5 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            <span>Xóa ({selectedDeletableIds.length})</span>
          </Button>
        )}
      </BulkActionBar>

      {/* Bảng dữ liệu dùng chuẩn TableHeader của ứng dụng */}
      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed text-left text-sm">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-11 px-3 py-3 text-center">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAllOnPage}
                    disabled={topics.length === 0}
                    aria-label="Chọn tất cả đề tài trên trang"
                  />
                </TableHead>
                <TableHead className="w-[380px] max-w-[440px] min-w-[260px] px-5 py-3">
                  Tiêu đề đề tài
                </TableHead>
                <TableHead className="w-28 px-4 py-3">Loại đồ án</TableHead>
                <TableHead className="w-28 px-4 py-3">Chuyên ngành</TableHead>
                <TableHead className="w-24 px-3 py-3 text-center">Chỗ</TableHead>
                <TableHead className="w-40 px-4 py-3">Trạng thái</TableHead>
                <TableHead className="w-32 px-4 py-3 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => {
                const checked = isSelected(topic.id);
                return (
                <TableRow
                  key={topic.id}
                  data-state={checked ? 'selected' : undefined}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                >
                  <TableCell className="w-11 px-3 py-3.5 text-center align-middle">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => toggleRow(topic, val)}
                      aria-label={`Chọn đề tài ${topic.title}`}
                    />
                  </TableCell>
                  <TableCell className="w-[380px] max-w-[440px] min-w-[260px] px-5 py-3.5 align-middle whitespace-normal">
                    <div className="w-full max-w-[440px] whitespace-normal">
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
                  <TableCell className="w-28 px-4 py-3.5 align-middle whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    <span title={formatProjectTypeShort(topic.projectType).full}>
                      {formatProjectTypeShort(topic.projectType).short}
                    </span>
                  </TableCell>
                  <TableCell className="w-28 px-4 py-3.5 align-middle whitespace-nowrap text-sm font-medium text-slate-600 dark:text-neutral-400">
                    <span title={formatMajorShort(topic.major).full}>
                      {formatMajorShort(topic.major).short}
                    </span>
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
                  <TableCell className="w-32 px-4 py-3.5 align-middle text-right whitespace-nowrap">
                    <RowActions
                      topic={topic}
                      isHeadOfDepartment={isHeadOfDepartment}
                      lecturerMajorId={lecturerMajorId}
                    />
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

      <ConfirmDialog
        open={bulkWithdrawDialog.isOpen}
        onOpenChange={bulkWithdrawDialog.setIsOpen}
        title={`Thu hồi ${selectedPendingIds.length} đề tài?`}
        description="Các đề tài đang chờ Bộ môn thẩm định sẽ được chuyển về trạng thái Bản nháp để bạn chỉnh sửa."
        confirmLabel="Thu hồi về bản nháp"
        confirmVariant="default"
        onConfirm={async () => {
          const res = await bulkWithdraw.mutateAsync(selectedPendingIds);
          toast.success(`Đã thu hồi ${res.updated} đề tài về bản nháp.`);
          removeSelectedIds(selectedPendingIds);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteDialog.isOpen}
        onOpenChange={bulkDeleteDialog.setIsOpen}
        title={`Xóa ${selectedDeletableIds.length} đề tài đã chọn?`}
        description="Các đề tài chưa có sinh viên đăng ký sẽ bị xóa vĩnh viễn và không thể hoàn tác."
        confirmLabel="Xóa hàng loạt"
        onConfirm={async () => {
          const res = await bulkDelete.mutateAsync(selectedDeletableIds);
          toast.success(`Đã xóa ${res.deleted} đề tài.`);
          removeSelectedIds(selectedDeletableIds);
        }}
      />
    </div>
  );
}
