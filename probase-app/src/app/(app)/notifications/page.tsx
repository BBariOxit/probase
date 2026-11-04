'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CheckCheck, ChevronRight, Loader2 } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications';
import type { AppNotification } from '@/lib/api/types';
import { notificationCategory, timeAgo } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isPending, error } = useNotifications({
    page,
    limit: PAGE_SIZE,
    unreadOnly,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          Không tải được thông báo. Vui lòng thử lại sau.
        </p>
      </div>
    );
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  function handleClick(notice: AppNotification) {
    if (!notice.isRead) {
      markRead.mutate(notice.id);
    }
    router.push(`/notifications/${notice.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-neutral-100 flex items-center gap-2.5">
            <Bell className="size-6 text-primary" />
            <span>Thông báo</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cập nhật về tiến độ đồ án, hạn nộp báo cáo và kết quả từ Giảng viên, Khoa
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unread > 0 && (
            <Button
              variant="default"
              size="sm"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <CheckCheck className="size-3.5" />
              <span>Đánh dấu đã đọc hết</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer',
            !unreadOnly
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          )}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer',
            unreadOnly
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          )}
        >
          <span>Chưa đọc</span>
          {unread > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold',
                unreadOnly
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* Main Notification Card List */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Đang tải danh sách thông báo...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={BellOff}
            title={
              unreadOnly
                ? 'Bạn đã đọc hết mọi thông báo.'
                : 'Chưa có thông báo nào.'
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden divide-y divide-border/60">
          {items.map((notice) => {
            const cat = notificationCategory(notice.type);
            return (
              <div
                key={notice.id}
                role="button"
                tabIndex={0}
                onClick={() => handleClick(notice)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(notice);
                  }
                }}
                className={cn(
                  'group flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 transition-colors cursor-pointer text-left',
                  !notice.isRead
                    ? 'bg-blue-50/50 hover:bg-blue-100/60 dark:bg-blue-950/25 dark:hover:bg-blue-900/40'
                    : 'bg-card hover:bg-muted/40',
                )}
              >
                {/* Left side: status dot + category badge + title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Indicator Dot */}
                  <div className="shrink-0 flex items-center justify-center">
                    {!notice.isRead ? (
                      <span className="size-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-100 dark:ring-blue-950/60" />
                    ) : (
                      <span className="size-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>

                  {/* Category Badge */}
                  <span
                    className={cn(
                      'shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                      cat.color,
                    )}
                  >
                    {cat.label}
                  </span>

                  {/* Title */}
                  <span
                    className={cn(
                      'truncate text-sm tracking-tight group-hover:text-primary transition-colors',
                      !notice.isRead
                        ? 'font-semibold text-slate-900 dark:text-neutral-100'
                        : 'font-normal text-slate-700 dark:text-neutral-300',
                    )}
                  >
                    {notice.title}
                  </span>
                </div>

                {/* Right side: Timestamp & Action indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {timeAgo(notice.createdAt)}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <PaginationBar
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
