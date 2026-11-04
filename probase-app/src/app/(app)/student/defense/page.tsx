'use client';

import Link from 'next/link';
import { Award, Loader2, Users } from 'lucide-react';
import { useMyGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { EmptyState } from '@/components/shared/empty-state';
import { StudentDefenseSection } from '@/components/reviews/student-defense-section';
import { Button } from '@/components/ui/button';

export default function StudentDefensePage() {
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
      <p className="text-sm text-destructive">Không tải được thông tin bảo vệ.</p>
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

  const isKLTN =
    group.topic.projectType.code === 'DATN' ||
    group.topic.projectType.name.toLowerCase().includes('khóa luận') ||
    group.topic.projectType.name.toLowerCase().includes('tốt nghiệp');

  if (!isKLTN) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700/80 bg-white dark:bg-[#141414]">
          <EmptyState
            icon={Award}
            title="Học phần đồ án hiện tại không có hội đồng bảo vệ."
            action={
              <Button variant="outline" render={<Link href="/student/groups" />}>
                Về nhóm của tôi
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
          Hồ sơ & Đánh giá bảo vệ
        </h1>
        <p className="text-xs text-muted-foreground">
          Theo dõi thẩm định hồ sơ, ý kiến GVHD và GVPB trước khi ra Hội đồng bảo vệ.
        </p>
      </div>

      <StudentDefenseSection groupId={group.id} />
    </div>
  );
}
