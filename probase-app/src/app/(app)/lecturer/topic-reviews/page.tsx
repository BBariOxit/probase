'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardCheck, Loader2, Search } from 'lucide-react';
import { useMyProfile } from '@/lib/api/me';
import { useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { TopicReviewSheet } from '@/components/topics/topic-review-sheet';
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
import { TOPIC_PAGE_SIZE } from '@/constants/pagination.constant';
import { useDebounce } from '@/hooks';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function LecturerTopicReviewsPage() {
  const allowed = useRequireRole('LECTURER');
  const { data: profile, isPending: isProfilePending } = useMyProfile({
    enabled: allowed,
  });

  const lecturer = profile?.lecturer;
  const isHeadOfDepartment = lecturer?.isHeadOfDepartment ?? false;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isPending, error } = useTopics(
    {
      reviewStage: 'DEPARTMENT',
      ...(lecturer?.major?.id ? { majorId: lecturer.major.id } : {}),
      page,
      limit: TOPIC_PAGE_SIZE,
      q: debouncedSearch || undefined,
    },
    { enabled: allowed && !isProfilePending && isHeadOfDepartment },
  );

  if (!allowed) return null;

  if (isProfilePending) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isHeadOfDepartment) {
    return (
      <div className="isolate overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
        <EmptyState
          icon={ClipboardCheck}
          title="Chức năng này chỉ dành cho Tổ trưởng Bộ môn."
        />
      </div>
    );
  }

  const topics = data?.items ?? [];

  return (
    <div className="w-full min-w-0 space-y-4">
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

      <div className="isolate w-full min-w-0 overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] shadow-2xs">
        <Table
          containerClassName="w-full overflow-x-auto"
          className="w-full min-w-[850px] table-fixed text-left text-sm"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[340px] max-w-[380px] min-w-[280px] px-5 py-3.5 whitespace-nowrap">
                Tiêu đề
              </TableHead>
              <TableHead className="w-40 px-3 py-3.5 whitespace-nowrap">
                Giảng viên
              </TableHead>
              <TableHead className="w-44 px-3 py-3.5 whitespace-nowrap">
                Loại đồ án
              </TableHead>
              <TableHead className="w-28 px-3 py-3.5 whitespace-nowrap">
                Ngày gửi
              </TableHead>
              <TableHead className="w-28 px-4 py-3.5 text-right whitespace-nowrap" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((topic) => (
              <TableRow
                key={topic.id}
                className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-800/40"
                onClick={() => setSelectedTopicId(topic.id)}
              >
                <TableCell className="w-[340px] max-w-[380px] min-w-[280px] px-5 py-3.5 align-middle font-medium whitespace-normal">
                  <div className="w-full max-w-[380px] whitespace-normal">
                    <Link
                      href={`/lecturer/topics/${topic.id}?from=topic-reviews`}
                      className="line-clamp-2 font-bold text-slate-900 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors leading-snug break-words [overflow-wrap:anywhere] whitespace-normal"
                      title={topic.title}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {topic.title}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="w-40 px-3 py-3.5 align-middle truncate font-medium text-slate-800 dark:text-neutral-200">
                  {topic.lecturer.fullName}
                </TableCell>
                <TableCell className="w-44 px-3 py-3.5 align-middle truncate font-medium text-slate-700 dark:text-neutral-300">
                  {topic.projectType.name}
                </TableCell>
                <TableCell className="w-28 px-3 py-3.5 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
                  {dateFormat.format(new Date(topic.createdAt))}
                </TableCell>
                <TableCell
                  className="w-28 px-4 py-3.5 align-middle text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className="cursor-pointer"
                  >
                    <Check />
                    Duyệt
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
        stage="DEPARTMENT"
        isHeadOfDepartment={isHeadOfDepartment}
      />
    </div>
  );
}
