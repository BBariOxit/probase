'use client';

import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';
import type { RegistrationGroup } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function SupervisedGroupCard({
  group,
  onNotifyGroup,
}: {
  group: RegistrationGroup;
  onNotifyGroup: (groupId: number) => void;
}) {
  const isFull = group.occupiedSeats >= group.topic.maxStudents;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs transition-all hover:border-slate-400 hover:shadow-sm dark:border-neutral-700 dark:bg-[#18181b] dark:hover:border-neutral-600">
      {/* Header đề tài */}
      <div className="space-y-1 border-b border-slate-200 bg-slate-100/75 px-4 py-3 sm:px-5 dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-600 dark:text-neutral-400">
            {group.topic.projectType.name}
          </span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              isFull
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {group.occupiedSeats}/{group.topic.maxStudents}
          </span>
        </div>

        <Link
          href={`/lecturer/topics/${group.topicId}`}
          className="block break-words text-[15px] font-bold leading-snug text-slate-900 transition-colors hover:text-primary sm:text-base dark:text-neutral-100 dark:hover:text-primary"
          title={group.topic.title}
        >
          {group.topic.title}
        </Link>
      </div>

      {/* Thành viên nhóm */}
      <div className="flex-1 bg-white p-4 sm:p-5 dark:bg-[#18181b]">
        {group.members.length === 0 ? (
          <p className="py-1 text-xs text-muted-foreground">
            Chưa có sinh viên nào trong nhóm.
          </p>
        ) : (
          <div className="space-y-3">
            {group.members.map((member, idx) => (
              <div
                key={member.id}
                className={cn(
                  'flex items-center gap-3 pt-3 first:pt-0',
                  idx > 0 &&
                    'border-t border-slate-100 dark:border-neutral-800/80',
                )}
              >
                <div className="flex size-8.5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {member.student.fullName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                      {member.student.fullName}
                    </span>
                    {member.isLeader && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary dark:bg-primary/20">
                        Trưởng nhóm
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
                    <span className="rounded border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-800 tabular-nums dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {member.student.studentCode}
                    </span>
                    <span
                      className="text-slate-300 dark:text-neutral-700"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span className="font-medium text-slate-600 dark:text-neutral-300">
                      {member.student.class || '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer thao tác nhanh */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-2.5 text-xs sm:px-5 dark:border-neutral-800 dark:bg-neutral-900/40">
        <Link
          href={`/lecturer/groups/${group.id}`}
          className="inline-flex items-center gap-1 font-medium text-slate-600 transition-colors hover:text-primary dark:text-neutral-400 dark:hover:text-primary"
        >
          <span>Chi tiết & Liên hệ</span>
          <ArrowUpRight className="size-3.5" />
        </Link>

        {group.members.length > 0 && (
          <button
            type="button"
            onClick={() => onNotifyGroup(group.id)}
            className="inline-flex items-center gap-1.5 font-semibold text-primary transition-colors hover:text-primary/80 cursor-pointer"
          >
            <Mail className="size-3.5" />
            <span>Gửi thông báo</span>
          </button>
        )}
      </div>
    </section>
  );
}

