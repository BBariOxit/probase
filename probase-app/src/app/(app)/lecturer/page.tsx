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

function RowActions({ topic }: { topic: TopicListItem }) {
  const transition = useTopicTransition();
  const remove = useDeleteTopic();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canEdit =
    topic.status !== 'IN_PROGRESS' && topic.status !== 'COMPLETED';
  const canDelete = topic.activeGroup === null;

  return (
    <>
      <div className="flex items-center gap-1.5 justify-end">
        {topic.status === 'DRAFT' && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
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
            Gửi duyệt
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
                <Send />
                Gửi duyệt Bộ môn
              </DropdownMenuItem>
            )}

            {canEdit && (
              <DropdownMenuItem
                render={<Link href={`/lecturer/topics/${topic.id}`} />}
              >
                <Pencil />
                Sửa
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 />
                Xoá
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);

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
              setPage(1);
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
            setPage(1);
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

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Tiêu đề</TableHead>
                <TableHead className="w-40">Loại đồ án</TableHead>
                <TableHead className="w-36">Trạng thái</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/lecturer/topics/${topic.id}`}
                      className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedTopicId(topic.id);
                      }}
                    >
                      {topic.title}
                    </Link>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {topic.semester.name} ·{' '}
                      {topic.activeGroup
                        ? `nhóm ${topic.activeGroup.occupiedSeats}/${topic.maxStudents}`
                        : 'chưa có nhóm'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.projectType.name}
                  </TableCell>
                  <TableCell>
                    <TopicOwnerBadge
                      status={topic.status}
                      activeGroup={topic.activeGroup}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
