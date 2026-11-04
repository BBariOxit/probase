'use client';

import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { useMyGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { StudentProgressSection } from '@/components/progress/student-progress-section';
import { Button } from '@/components/ui/button';

export default function StudentProgressPage() {
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
      <p className="text-sm text-destructive">Không tải được thông tin tiến độ.</p>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700/80 bg-white dark:bg-[#141414]">
          <EmptyState
            icon={Users}
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
    <div className="max-w-4xl space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-neutral-100">
          Tiến độ thực hiện & Nhật ký
        </h1>
        <p className="text-xs text-muted-foreground">
          Theo dõi các mốc tiến độ định kỳ và ghi nhận nhật ký làm việc nhóm.
        </p>
      </div>

      <StudentProgressSection />
    </div>
  );
}
