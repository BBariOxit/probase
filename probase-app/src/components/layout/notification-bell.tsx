'use client';

import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications';
import type { AppNotification, Role } from '@/lib/api/types';
import { notificationHref, timeAgo } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PREVIEW_COUNT = 6;

export function NotificationBell({ role }: { role: Role }) {
  const router = useRouter();
  const { data } = useNotifications({ limit: PREVIEW_COUNT });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  function open(notice: AppNotification) {
    if (!notice.isRead) markRead.mutate(notice.id);

    const href = notificationHref(notice, role);
    if (href) router.push(href);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-muted-foreground"
            aria-label={
              unread > 0 ? `Thông báo (${unread} chưa đọc)` : 'Thông báo'
            }
          >
            <Bell />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground tabular-nums">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>
        }
      />

      <DropdownMenuContent
        align="end"
        className="w-96 sm:w-[410px] p-0 rounded-xl overflow-hidden shadow-xl border border-border bg-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 dark:bg-neutral-900/60 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
              Thông báo
            </span>
            {unread > 0 && (
              <span className="rounded-full bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 text-[11px] font-bold">
                {unread} mới
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              type="button"
              disabled={markAllRead.isPending}
              onClick={(e) => {
                e.stopPropagation();
                markAllRead.mutate();
              }}
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition cursor-pointer hover:underline disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              <span>Đọc hết</span>
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center space-y-1.5">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="size-5 opacity-40" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Chưa có thông báo nào
              </p>
            </div>
          ) : (
            items.map((notice) => (
              <DropdownMenuItem
                key={notice.id}
                className={cn(
                  'flex-col items-start gap-1 rounded-none px-4 py-3 cursor-pointer transition-colors focus:bg-muted/60',
                  !notice.isRead
                    ? 'bg-blue-50/60 dark:bg-blue-950/25 hover:bg-blue-100/60 dark:hover:bg-blue-900/40'
                    : 'bg-transparent hover:bg-muted/50',
                )}
                onClick={() => open(notice)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {!notice.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary shadow-xs" />
                    )}
                    <span
                      className={cn(
                        'text-sm leading-snug line-clamp-1',
                        !notice.isRead
                          ? 'font-semibold text-slate-900 dark:text-neutral-100'
                          : 'font-medium text-slate-700 dark:text-neutral-300',
                      )}
                    >
                      {notice.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap pt-0.5">
                    {timeAgo(notice.createdAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground pl-0 text-wrap">
                  {notice.content}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-1.5 bg-slate-50/80 dark:bg-neutral-900/60 border-t border-border text-center">
          <DropdownMenuItem
            className="w-full justify-center py-1.5 text-xs font-semibold text-slate-700 hover:text-primary dark:text-neutral-300 dark:hover:text-primary transition rounded-md hover:bg-white dark:hover:bg-neutral-800 cursor-pointer text-center"
            onClick={() => router.push('/notifications')}
          >
            Xem tất cả thông báo
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
