'use client';

import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications';
import type { AppNotification, Role } from '@/lib/api/types';
import { timeAgo } from '@/lib/notifications';
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
    router.push(`/notifications/${notice.id}`);
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
        sideOffset={8}
        className="w-[360px] sm:w-[384px] max-w-[calc(100vw-1.5rem)] p-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b]"
      >
        <div className="w-[360px] sm:w-[384px] max-w-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/90 dark:bg-[#141414] border-b border-slate-200 dark:border-neutral-800">
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
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800/60 bg-white dark:bg-[#18181b]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-6 sm:py-7 text-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 mb-2">
                  <Bell className="size-4 opacity-75" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
                  Chưa có thông báo nào
                </p>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5 max-w-[260px]">
                  Thông báo mới về đề tài và nhóm sẽ hiển thị tại đây
                </p>
              </div>
            ) : (
              items.map((notice) => (
                <DropdownMenuItem
                  key={notice.id}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors focus:bg-slate-100/70 dark:focus:bg-neutral-800/80',
                    !notice.isRead
                      ? 'bg-slate-50/80 dark:bg-neutral-800/40 hover:bg-slate-100/80 dark:hover:bg-neutral-800/70'
                      : 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-neutral-800/40',
                  )}
                  onClick={() => open(notice)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {!notice.isRead ? (
                      <span className="size-2 shrink-0 rounded-full bg-primary shadow-xs" />
                    ) : (
                      <span className="size-2 shrink-0 rounded-full bg-slate-300 dark:bg-neutral-600" />
                    )}
                    <span
                      className={cn(
                        'text-xs sm:text-sm leading-snug truncate',
                        !notice.isRead
                          ? 'font-semibold text-slate-900 dark:text-neutral-100'
                          : 'font-normal text-slate-700 dark:text-neutral-300',
                      )}
                    >
                      {notice.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400 dark:text-neutral-500 tabular-nums whitespace-nowrap">
                    {timeAgo(notice.createdAt)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-1.5 bg-slate-50/90 dark:bg-[#141414] border-t border-slate-200 dark:border-neutral-800 text-center">
            <DropdownMenuItem
              className="w-full justify-center py-1.5 text-xs font-semibold text-slate-700 hover:text-primary dark:text-neutral-300 dark:hover:text-primary transition rounded-lg hover:bg-white dark:hover:bg-neutral-800 cursor-pointer text-center"
              onClick={() => router.push('/notifications')}
            >
              Xem tất cả thông báo
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
