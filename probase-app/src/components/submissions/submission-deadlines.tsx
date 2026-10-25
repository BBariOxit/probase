'use client';

import type { Submission, SubmissionRequirement } from '@/lib/api/types';
import { daysUntilDay } from '@/lib/named-day';
import { StatusPill, type StatusLabel } from '@/components/shared/status-pill';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
});

export function SubmissionDeadlines({
  requirements,
  submissions,
}: {
  requirements: SubmissionRequirement[];
  submissions: Submission[];
}) {
  if (requirements.length === 0) return null;

  return (
    <ul className="divide-y rounded-xl border">
      {requirements.map((requirement) => {
        const handedIn = submissions.some(
          (submission) => submission.requirement.id === requirement.id,
        );
        const left = daysUntilDay(requirement.dueAt);

        return (
          <li
            key={requirement.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {requirement.name}
                {!requirement.isRequired && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    tuỳ chọn
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hạn {dateFormat.format(new Date(requirement.dueAt))}
                {left > 0 && ` · còn ${left} ngày`}
                {left === 0 && ' · hôm nay'}
              </p>
            </div>
            <StatusPill {...standing(handedIn, left)} />
          </li>
        );
      })}
    </ul>
  );
}

function standing(handedIn: boolean, daysLeft: number): StatusLabel {
  if (handedIn) return { label: 'Đã nộp', tone: 'success' };
  if (daysLeft < 0) return { label: 'Quá hạn', tone: 'danger' };

  return { label: 'Chưa nộp', tone: 'waiting' };
}
