'use client';

import { useState } from 'react';
import {
  BookOpen,
  FileDown,
  FileUp,
  Inbox,
  Loader2,
  MessageSquareText,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useSubmissions, useSubmissionFeedback } from '@/lib/api/submissions';
import { useTopics } from '@/lib/api/topics';
import type { Submission } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { FormError } from '@/components/shared/form-error';
import { PageWithRail } from '@/components/layout/page-with-rail';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { SubmissionCard } from '@/components/submissions/submission-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [answering, setAnswering] = useState<Submission | null>(null);

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
                  <Button
                    size="sm"
                    variant={submission.feedbackAt ? 'outline' : 'default'}
                    onClick={() => setAnswering(submission)}
                  >
                    <MessageSquareText />
                    {submission.feedbackAt ? 'Sửa nhận xét' : 'Nhận xét'}
                  </Button>
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

      {answering && (
        <FeedbackDialog
          submission={answering}
          onClose={() => setAnswering(null)}
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

function FeedbackDialog({
  submission,
  onClose,
}: {
  submission: Submission;
  onClose: () => void;
}) {
  const answer = useSubmissionFeedback();
  const [feedback, setFeedback] = useState(submission.lecturerFeedback ?? '');
  const [error, setError] = useState<string | null>(null);

  const trimmed = feedback.trim();

  async function submit() {
    setError(null);
    try {
      await answer.mutateAsync({ id: submission.id, feedback: trimmed });
      toast.success('Đã gửi phản hồi.');
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Không kết nối được máy chủ',
      );
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && !answer.isPending && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Nhận xét {submission.requirement.name.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            {submission.group.topic.title} · lần {submission.version}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="admin-feedback">Nhận xét</Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Nhóm sẽ nhận thông báo và đọc được nguyên văn nhận xét này.
            </p>
            <Textarea
              id="admin-feedback"
              rows={5}
              maxLength={4000}
              autoFocus
              value={feedback}
              aria-invalid={trimmed === ''}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={answer.isPending}
            onClick={onClose}
          >
            Huỷ
          </Button>
          <Button
            disabled={trimmed === '' || answer.isPending}
            onClick={submit}
          >
            {answer.isPending && <Loader2 className="animate-spin" />}
            Gửi nhận xét
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
