'use client';

import { ExternalLink, FileText, Link2, MessageSquareText } from 'lucide-react';
import type { Submission } from '@/lib/api/types';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';

const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function fileSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function answered(submission: Submission): StatusLabel {
  return submission.feedbackAt
    ? { label: 'Đã nhận xét', tone: 'success' }
    : { label: 'Chờ nhận xét', tone: 'waiting' };
}

export function SubmissionCard({
  submission,
  who,
  actions,
}: {
  submission: Submission;
  who?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const size = fileSize(submission.fileSize);

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">
            {submission.requirement.name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              lần {submission.version}
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dateTimeFormat.format(new Date(submission.submittedAt))}
            {submission.submittedBy &&
              ` · ${submission.submittedBy.fullName} (${submission.submittedBy.studentCode})`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {submission.isLate && <StatusPill label="Nộp muộn" tone="danger" />}
          <StatusPill {...answered(submission)} />
        </div>
      </div>

      {who}

      <div className="flex flex-wrap gap-2">
        {submission.fileUrl && (
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">
              {submission.fileName ?? 'Tệp đã nộp'}
            </span>
            {size && (
              <span className="shrink-0 text-muted-foreground">{size}</span>
            )}
          </a>
        )}

        {submission.submissionUrl && (
          <a
            href={submission.submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Link2 className="size-3.5 shrink-0" />
            <span className="truncate">{submission.submissionUrl}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
        )}
      </div>

      {submission.lecturerFeedback && (
        <section className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquareText className="size-3.5" />
            Nhận xét của giảng viên
          </h4>
          <p className="text-sm whitespace-pre-line break-words">
            {submission.lecturerFeedback}
          </p>
        </section>
      )}

      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </article>
  );
}
