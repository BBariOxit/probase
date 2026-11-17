'use client';

import { useState } from 'react';
import { BookOpen, FileDown, Inbox, Loader2 } from 'lucide-react';
import { useSubmissions } from '@/lib/api/submissions';
import { useTopics } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { PageWithRail } from '@/components/layout/page-with-rail';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { SubmissionCard } from '@/components/submissions/submission-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 15;

export default function AdminSubmissionsPage() {
  const allowed = useRequireRole('ADMIN');
  const [page, setPage] = useState(1);
  const [topicId, setTopicId] = useState<number | undefined>(undefined);

  const { data, isPending, error } = useSubmissions({
    topicId,
    page,
    limit: PAGE_SIZE,
  });

  if (!allowed) return null;

  const submissions = data?.items ?? [];

  return (
    <PageWithRail
      rail={
        <TopicFilter
          selected={topicId}
          onSelect={(next) => {
            setTopicId(next);
            setPage(1);
          }}
        />
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Tất cả bài nộp
        </h2>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} bài nộp
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">Không tải được bài nộp.</p>
      )}

      {isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && submissions.length === 0 && (
        <div className="rounded-xl border">
          <EmptyState
            icon={Inbox}
            title={
              topicId === undefined
                ? 'Chưa có bài nộp nào trong hệ thống.'
                : 'Đề tài này chưa có bài nộp nào.'
            }
          />
        </div>
      )}

      <ul className="space-y-3">
        {submissions.map((submission) => (
          <li key={submission.id}>
            <SubmissionCard
              submission={submission}
              who={
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {submission.group.topic.title}
                  </span>
                  <span className="shrink-0">·</span>
                  <span className="truncate">
                    {submission.group.topic.lecturer.academicTitle
                      ? `${submission.group.topic.lecturer.academicTitle} ${submission.group.topic.lecturer.fullName}`
                      : submission.group.topic.lecturer.fullName}
                  </span>
                </p>
              }
              actions={
                <div className="flex items-center gap-2">
                  {submission.fileUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      render={
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        />
                      }
                    >
                      <FileDown />
                      Tải file
                    </Button>
                  )}
                </div>
              }
            />
          </li>
        ))}
      </ul>

      {data && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </PageWithRail>
  );
}

function TopicFilter({
  selected,
  onSelect,
}: {
  selected: number | undefined;
  onSelect: (topicId: number | undefined) => void;
}) {
  const { data } = useTopics({ status: 'IN_PROGRESS', limit: 100 });
  const topics = data?.items ?? [];

  if (topics.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Lọc theo đề tài
      </p>
      <Select
        value={selected !== undefined ? String(selected) : 'all'}
        onValueChange={(val) =>
          onSelect(val === 'all' ? undefined : (Number(val) as number))
        }
      >
        <SelectTrigger className="w-full" aria-label="Lọc theo đề tài">
          <SelectValue>
            {(val) =>
              val === 'all'
                ? 'Tất cả đề tài'
                : (topics.find((t) => String(t.id) === val)?.title ?? 'Đề tài')
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả đề tài</SelectItem>
          {topics.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              <span className="line-clamp-1">{t.title}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
