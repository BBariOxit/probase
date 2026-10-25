'use client';

import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications';
import type { AppNotification, Role } from '@/lib/api/types';
import { notificationHref, timeAgo } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PREVIEW_COUNT = 5;

export function NotificationBell({ role }: { role: Role }) {
  const router = useRouter();
  const { data } = useNotifications({ limit: PREVIEW_COUNT });
  const markRead = useMarkNotificationRead();

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

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 text-sm font-medium">Thông báo</div>
        <DropdownMenuSeparator className="m-0" />

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Chưa có thông báo nào.
          </p>
        ) : (
          items.map((notice) => (
            <DropdownMenuItem
              key={notice.id}
              className="flex-col items-start gap-0.5 px-3 py-2"
              onClick={() => open(notice)}
            >
              <div className="flex w-full items-center gap-2">
                {!notice.isRead && (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                )}
                <span className="truncate text-sm font-medium">
                  {notice.title}
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {timeAgo(notice.createdAt)}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-wrap text-muted-foreground">
                {notice.content}
              </p>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="justify-center text-sm"
          onClick={() => router.push('/notifications')}
        >
          Xem tất cả
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
