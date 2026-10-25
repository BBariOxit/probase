'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardCheck, Loader2, Search } from 'lucide-react';
import { useTopicTransition, useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicReviewSheet } from '@/components/admin/topic-review-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 10;

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function AdminTopicQueuePage() {
  const allowed = useRequireRole('ADMIN');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const transition = useTopicTransition();

  const { data, isPending, error } = useTopics({
    status: 'PENDING',
    page,
    limit: PAGE_SIZE,
    q: debouncedSearch || undefined,
  });

  if (!allowed) return null;

  const topics = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
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

        {data && (
          <span className="ml-auto text-sm text-muted-foreground">
            {data.total} đề tài chờ duyệt
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">Không tải được hàng chờ.</p>
      )}

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Tiêu đề</TableHead>
                <TableHead className="w-48">Giảng viên</TableHead>
                <TableHead className="w-36">Loại đồ án</TableHead>
                <TableHead className="w-28">Ngày gửi</TableHead>
                <TableHead className="w-28" />
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
                      href={`/admin/topics/${topic.id}`}
                      className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedTopicId(topic.id);
                      }}
                    >
                      {topic.title}
                    </Link>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {topic.semester.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.lecturer.fullName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topic.projectType.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {dateFormat.format(new Date(topic.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={transition.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        transition.mutate({ id: topic.id, to: 'approve' });
                      }}
                    >
                      {transition.isPending &&
                      transition.variables?.id === topic.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Check />
                      )}
                      Duyệt
                    </Button>
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
            icon={ClipboardCheck}
            title={
              debouncedSearch
                ? 'Không có đề tài nào khớp từ khoá.'
                : 'Không còn đề tài nào chờ duyệt.'
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

      <TopicReviewSheet
        topicId={selectedTopicId}
        onClose={() => setSelectedTopicId(null)}
      />
    </div>
  );
}
