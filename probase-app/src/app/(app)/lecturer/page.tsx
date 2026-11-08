'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  DoorClosed,
  DoorOpen,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TopicListItem, TopicStatus } from '@/lib/api/types';
import {
  useDeleteTopic,
  useSubmitDraftTopics,
  useTopicTransition,
  useTopics,
} from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicDetailSheet } from '@/components/topics/topic-detail-sheet';
import { TopicOwnerBadge } from '@/components/topics/topic-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { TOPIC_PAGE_SIZE } from '@/constants/pagination.constant';
import { TOPIC_STATUS_FILTERS } from '@/constants/status.constant';
import { useDebounce, useDisclosure, usePagination } from '@/hooks';

function RowActions({ topic }: { topic: TopicListItem }) {
  const transition = useTopicTransition();
  const remove = useDeleteTopic();
  const deleteDialog = useDisclosure();
  const withdrawDialog = useDisclosure();

  const isPendingReview =
    topic.status === 'PENDING_DEPARTMENT' || topic.status === 'PENDING';
  const canEdit =
    !isPendingReview &&
    topic.status !== 'IN_PROGRESS' &&
    topic.status !== 'COMPLETED';
  const canDelete =
    topic.activeGroup === null &&
    topic.status !== 'IN_PROGRESS' &&
    topic.status !== 'COMPLETED';

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
              transition
                .mutateAsync({ id: topic.id, to: 'submit' })
                .then(() => toast.success('Đã gửi đề tài lên Bộ môn thẩm định.'))
                .catch(() => toast.error('Không thể gửi duyệt đề tài.'));
            }}
          >
            {transition.isPending && transition.variables?.id === topic.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            <span>Gửi duyệt</span>
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
            {topic.status === 'DRAFT' && (
              <DropdownMenuItem
                onClick={() => {
                  transition
                    .mutateAsync({ id: topic.id, to: 'submit' })
                    .then(() => toast.success('Đã gửi đề tài lên Bộ môn thẩm định.'))
                    .catch(() => toast.error('Không thể gửi duyệt đề tài.'));
                }}
              >
                <Send className="size-4" />
                Gửi duyệt Bộ môn
              </DropdownMenuItem>
            )}

            {isPendingReview && (
              <DropdownMenuItem
                onClick={withdrawDialog.onOpen}
                className="text-amber-600 focus:text-amber-600 dark:text-amber-500 dark:focus:text-amber-500 cursor-pointer"
              >
                <Undo2 className="size-4" />
                Thu hồi gửi duyệt
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
          } catch (err: any) {
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

export default function LecturerTopicsPage() {
  const allowed = useRequireRole('LECTURER');
  const { page, setPage, resetPage } = usePagination({
    initialPageSize: TOPIC_PAGE_SIZE,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isPending, error } = useTopics({
    mine: true,
    page,
    limit: TOPIC_PAGE_SIZE,
    q: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : (status as TopicStatus),
  });

  const { data: draftsData } = useTopics({
    mine: true,
    status: 'DRAFT',
    limit: 100,
  });
  const submitDrafts = useSubmitDraftTopics();
  const draftCount = draftsData?.total ?? 0;

  if (!allowed) return null;

  const topics = data?.items ?? [];
  const filtering = debouncedSearch !== '' || status !== 'ALL';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Tìm theo tên đề tài…"
            className="pl-8"
            aria-label="Tìm đề tài"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as string);
            resetPage();
          }}
        >
          <SelectTrigger className="w-56" aria-label="Lọc theo trạng thái">
            <SelectValue>
              {(value) =>
                TOPIC_STATUS_FILTERS.find((option) => option.value === value)
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TOPIC_STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total} đề tài
            </span>
          )}
          {draftCount > 0 && (
            <Button
              variant="outline"
              className="gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
              disabled={submitDrafts.isPending}
              onClick={() => {
                submitDrafts
                  .mutateAsync(undefined)
                  .then((res) => toast.success(res.message))
                  .catch(() => toast.error('Không thể gửi duyệt đề tài'));
              }}
            >
              {submitDrafts.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Gửi duyệt cho Bộ môn ({draftCount})
            </Button>
          )}
          <Button render={<Link href="/lecturer/topics/new" />}>
            <Plus />
            Tạo đề tài
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Không tải được danh sách đề tài.
        </p>
      )}

      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed text-left text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[380px] max-w-[440px] min-w-[280px] px-5 py-3.5 whitespace-nowrap">Tiêu đề</TableHead>
                <TableHead className="w-40 px-3 py-3.5 whitespace-nowrap">Loại đồ án</TableHead>
                <TableHead className="w-36 px-3 py-3.5 whitespace-nowrap">Trạng thái</TableHead>
                <TableHead className="w-24 px-4 py-3.5 text-right whitespace-nowrap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <TableCell className="w-[380px] max-w-[440px] min-w-[280px] px-5 py-3.5 align-middle whitespace-normal">
                    <div className="w-full max-w-[440px] whitespace-normal">
                      <Link
                        href={`/lecturer/topics/${topic.id}`}
                        className="block font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal line-clamp-2 cursor-pointer"
                        title={topic.title}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {topic.title}
                      </Link>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {topic.activeGroup
                          ? `Nhóm ${topic.activeGroup.occupiedSeats}/${topic.maxStudents} sinh viên`
                          : 'Chưa có nhóm sinh viên'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-40 px-3 py-3.5 align-middle whitespace-nowrap font-medium text-slate-700 dark:text-neutral-300">
                    {topic.projectType.name}
                  </TableCell>
                  <TableCell className="w-36 px-3 py-3.5 align-middle whitespace-nowrap">
                    <TopicOwnerBadge
                      status={topic.status}
                      activeGroup={topic.activeGroup}
                      variant="text"
                    />
                  </TableCell>
                  <TableCell className="w-24 px-4 py-3.5 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <RowActions topic={topic} />
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
                  render={<Link href="/lecturer/topics/new" />}
                >
                  <Plus />
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

      <TopicDetailSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
        hideRegisterButton
      />
    </div>
  );
}
