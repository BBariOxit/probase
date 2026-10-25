'use client';

import { use } from 'react';
import Link from 'next/link';
import { BookOpen, FileText, Loader2, MessageSquareText } from 'lucide-react';
import { useGroup } from '@/lib/api/registration';
import { useSubmissions, useSubmissionFeedback } from '@/lib/api/submissions';
import type { Submission } from '@/lib/api/types';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';
import { EmptyState } from '@/components/shared/empty-state';
import { FormError } from '@/components/shared/form-error';
import { toast } from 'sonner';
import { SubmissionCard } from '@/components/submissions/submission-card';
import { SubmissionDeadlines } from '@/components/submissions/submission-deadlines';
import { UserAvatar } from '@/components/shared/user-avatar';
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
import { PageWithRail } from '@/components/layout/page-with-rail';
import { useState } from 'react';

const JOIN_SOURCE_LABEL: Record<string, string> = {
  SELF: 'Tự đăng ký',
  LINK: 'Qua link nhóm',
  ASSIGNED: 'Khoa phân công',
};

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default function LecturerGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const allowed = useRequireRole('LECTURER');
  const [answering, setAnswering] = useState<Submission | null>(null);

  const { data: group, isPending, error } = useGroup(groupId);

  // Inject the topic title so the header breadcrumb reads
  // "Nhóm hướng dẫn › [Tên đề tài]" instead of "Nhóm hướng dẫn › 42".
  useBreadcrumbLabel(id, group?.topic.title);
  const { data: submissionsData, isPending: subPending } = useSubmissions({
    groupId,
    limit: 50,
  });

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !group) {
    return <p className="text-sm text-destructive">Không tìm thấy nhóm này.</p>;
  }

  const submissions = submissionsData?.items ?? [];

  return (
    <PageWithRail
      rail={
        <>
          {/* Topic brief */}
          <section className="space-y-1 rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Đề tài</p>
            <p className="text-sm font-medium">{group.topic.title}</p>
            <p className="text-xs text-muted-foreground">
              {group.topic.projectType.name}
            </p>
            <Link
              href={`/lecturer/topics/${group.topicId}`}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BookOpen className="size-3.5 shrink-0" />
              Xem & sửa đề tài
            </Link>
          </section>

          {/* Submission deadlines */}
          {group.requirements.length > 0 && (
            <SubmissionDeadlines
              requirements={group.requirements}
              submissions={submissions}
            />
          )}
        </>
      }
    >
      {/* Members table */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          Thành viên · {group.occupiedSeats}/{group.topic.maxStudents}
        </h2>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Sinh viên</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Mã SV
                </th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  Lớp
                </th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">
                  Vào nhóm
                </th>
                <th className="px-4 py-2.5 font-medium">Nguồn</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {group.members.map((member) => (
                <tr
                  key={member.id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    member.isLeader && 'bg-muted/20',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={member.student.fullName}
                        src={member.student.avatarUrl}
                        className="size-7 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {member.student.fullName}
                          {member.isLeader && (
                            <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Nhóm trưởng
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground sm:hidden">
                          {member.student.studentCode}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                    {member.student.studentCode}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {member.student.class ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {member.joinedAt
                      ? dateFormat.format(new Date(member.joinedAt))
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {JOIN_SOURCE_LABEL[member.joinSource] ?? member.joinSource}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Submissions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold tracking-tight">
            Bài nộp
          </h2>
          {submissionsData && (
            <span className="text-sm text-muted-foreground">
              {submissionsData.total} phiên bản
            </span>
          )}
        </div>

        {subPending && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!subPending && submissions.length === 0 && (
          <div className="rounded-xl border">
            <EmptyState icon={FileText} title="Nhóm này chưa nộp bài nào." />
          </div>
        )}

        <ul className="space-y-3">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <SubmissionCard
                submission={submission}
                actions={
                  <Button
                    size="sm"
                    variant={submission.feedbackAt ? 'outline' : 'default'}
                    onClick={() => setAnswering(submission)}
                  >
                    <MessageSquareText />
                    {submission.feedbackAt ? 'Sửa nhận xét' : 'Nhận xét'}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </section>

      {answering && (
        <FeedbackDialog
          submission={answering}
          onClose={() => setAnswering(null)}
        />
      )}
    </PageWithRail>
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
            <Label htmlFor="feedback">Nhận xét cho nhóm</Label>
            <p className="text-xs text-muted-foreground">
              Cả nhóm sẽ nhận thông báo và đọc được nguyên văn.
            </p>
            <Textarea
              id="feedback"
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
