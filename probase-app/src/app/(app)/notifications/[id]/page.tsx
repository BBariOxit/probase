'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useNotification } from '@/lib/api/notifications';
import { useSession } from '@/lib/auth/session';
import { notificationCategory, notificationHref } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function NotificationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const notificationId = Number(params?.id);

  const { data: notice, isPending, error } = useNotification(notificationId);
  const user = useSession((s) => s.user);

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/notifications')}
          className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
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
          variant="ghost"
          size="sm"
          onClick={() => router.push('/notifications')}
          className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
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

  const category = notificationCategory(notice.type);
  const targetHref = user ? notificationHref(notice, user.role) : null;

  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(notice.createdAt));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/notifications')}
          className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại danh sách thông báo</span>
        </Button>
      </div>

      {/* Main Mail Card */}
      <article className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Email Header */}
        <header className="p-6 sm:p-8 pb-6 border-b border-border/70 space-y-5 bg-card">
          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-semibold px-2.5 py-1 rounded-md border text-xs',
                  category.color,
                )}
              >
                {category.label}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" />
                <span>{formattedDate}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/40">
              <ShieldCheck className="size-3" />
              Đã nhận
            </span>
          </div>

          {/* Hero Title */}
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-neutral-50 tracking-tight leading-tight">
            {notice.title}
          </h1>

          {/* Sender & Recipient Box */}
          <div className="flex items-start gap-3.5 pt-2 border-t border-border/50">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              <Mail className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Ban Quản lý Đào tạo & Hệ thống ProBase
                </span>
                <span className="text-muted-foreground">
                  &lt;noreply@probase.edu.vn&gt;
                </span>
              </div>
              <div className="text-muted-foreground">
                Gửi tới:{' '}
                <span className="text-slate-800 dark:text-neutral-200 font-medium">
                  {user?.fullName ?? user?.email ?? 'Bạn'}
                </span>
                {user?.role && (
                  <span className="ml-1 text-muted-foreground">
                    (
                    {user.role === 'STUDENT'
                      ? 'Sinh viên'
                      : user.role === 'LECTURER'
                        ? 'Giảng viên'
                        : 'Quản trị viên'}
                    )
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Email Content Body */}
        <section className="p-6 sm:p-8 py-8 space-y-6">
          <div className="text-base sm:text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200 whitespace-pre-line font-normal space-y-4 selection:bg-primary/20">
            {notice.content}
          </div>

          {/* Direct CTA when related entity URL exists */}
          {targetHref && (
            <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                  Nội dung liên quan đến thông báo này
                </h4>
                <p className="text-xs text-muted-foreground">
                  Nhấn vào nút bên cạnh để chuyển nhanh đến màn hình làm việc hoặc danh sách tương ứng.
                </p>
              </div>
              <Button
                onClick={() => router.push(targetHref)}
                className="gap-2 shadow-xs shrink-0 cursor-pointer"
              >
                <span>Xem chi tiết nội dung</span>
                <ExternalLink className="size-4" />
              </Button>
            </div>
          )}
        </section>

        {/* Email Footer */}
        <footer className="bg-slate-50/80 dark:bg-neutral-900/60 px-6 py-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Đây là thông báo tự động từ Hệ thống Quản lý Đồ án & Khóa luận ProBase.
          </p>
          <button
            type="button"
            onClick={() => router.push('/notifications')}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Về danh sách thông báo
          </button>
        </footer>
      </article>
    </div>
  );
}
