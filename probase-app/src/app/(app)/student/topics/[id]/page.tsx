'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTopic } from '@/lib/api/topics';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { TopicDetailView } from '@/components/topics/topic-detail-view';
import { Button } from '@/components/ui/button';

export default function StudentTopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // Cho phép sinh viên, giảng viên và quản trị viên xem chi tiết đề tài
  const allowed = useRequireRole(['STUDENT', 'LECTURER', 'ADMIN']);
  const { data: topic, isPending, error } = useTopic(Number(id));

  // Cập nhật tiêu đề đề tài lên breadcrumb
  useBreadcrumbLabel(id, topic?.title);

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề tài
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Đang tải thông tin đề tài...
          </p>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách đề tài
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <p className="text-sm text-destructive font-medium">
            Không tìm thấy thông tin đề tài này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Nút quay lại danh sách đề tài ở góc trên */}
      <div className="flex items-center justify-between">
        <Button
          variant="default"
          size="sm"
          render={<Link href="/student" />}
          className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách đề tài</span>
        </Button>
      </div>

      {/* Chi tiết nội dung đề tài chia khối rõ ràng, căn giữa, chữ to, text-justify */}
      <TopicDetailView topic={topic} />
    </div>
  );
}
