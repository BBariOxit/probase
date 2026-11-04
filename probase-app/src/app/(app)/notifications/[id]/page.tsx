'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Inbox, Loader2 } from 'lucide-react';
import { useNotification } from '@/lib/api/notifications';
import { Button } from '@/components/ui/button';

export default function NotificationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const notificationId = Number(params?.id);

  const { data: notice, isPending, error } = useNotification(notificationId);

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default" size="sm" onClick={() => router.push('/notifications')} className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách thông báo
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground font-medium">
            Đang tải chi tiết thông báo...
          </p>
        </div>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="default" size="sm" onClick={() => router.push('/notifications')} className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách thông báo
        </Button>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Inbox className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
            Không tìm thấy thông báo
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Thông báo này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/notifications')}
            className="mt-2"
          >
            Quay lại hộp thư
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(notice.createdAt));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="default" size="sm" onClick={() => router.push('/notifications')} className="gap-2 cursor-pointer shadow-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách thông báo</span>
        </Button>
      </div>

      {/* Main Notification Card */}
      <article className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 space-y-3">
          {/* Thời gian ở góc trái */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{formattedDate}</span>
          </div>

          {/* Tên thông báo to, đậm */}
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-snug">
            {notice.title}
          </h1>

          {/* 1 cái gạch ngang */}
          <hr className="border-border my-4" />

          {/* Dưới gạch ngang là nội dung thông báo */}
          <div className="text-base leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line font-normal py-2 selection:bg-primary/20">
            {notice.content}
          </div>
        </div>

        {/* Footer gọn gàng */}
        <div className="bg-slate-50/70 dark:bg-neutral-900/50 px-6 py-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Đây là thông báo tự động.</span>
          <button
            type="button"
            onClick={() => router.push('/notifications')}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Về danh sách thông báo
          </button>
        </div>
      </article>
    </div>
  );
}
