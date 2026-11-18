'use client';

import Link from 'next/link';
import { FileCheck2, Loader2 } from 'lucide-react';
import { useMyGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { StudentOutlineCard } from '@/components/outlines/student-outline-card';
import { Button } from '@/components/ui/button';

export default function StudentSubmissionsPage() {
  const allowed = useRequireRole('STUDENT');
  const { data: group, isPending, error } = useMyGroup();

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Không tải được danh sách bài nộp của nhóm.
      </p>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-2xl border border-[#b8c0d0] dark:border-[#333338] bg-white dark:bg-[#1e1e1e]">
          <EmptyState
            icon={FileCheck2}
            title="Bạn chưa đăng ký đề tài nào."
            action={
              <Button render={<Link href="/student" />}>
                Xem danh sách đề tài
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-neutral-400">
        <span className="font-medium text-slate-900 dark:text-neutral-100 truncate">
          {group.topic.title}
        </span>
        <span className="shrink-0">
          {group.topic.projectType.name}
        </span>
      </div>

      <StudentOutlineCard requirements={group.requirements} />
    </div>
  );
}

