'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, Check, Loader2 } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/notifications';
import type { AppNotification } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { notificationHref, timeAgo } from '@/lib/notifications';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<AppNotification | null>(
    null,
  );

  const { data, isPending, error } = useNotifications({
    page,
    limit: PAGE_SIZE,
    unreadOnly,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (error) {
    return (
      <p className="text-sm text-destructive">Không tải được thông báo.</p>
    );
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  function open(notice: AppNotification) {
    if (!notice.isRead) markRead.mutate(notice.id);
    setSelectedNotice(notice);
  }

  function toggleFilter() {
    setUnreadOnly((current) => !current);
    // The page number belongs to the old filter; keeping it lands the reader on
    // an empty page of a shorter list.
    setPage(1);
  }

  return (
    /*
      Centred rather than given a rail, and that is the whole decision here.
      Nothing true belongs beside an inbox — a filter by kind of notice is a
      control nobody in a faculty this size would touch, and anything else would
      be invented to fill the space. A reading column with even margins is the
      honest shape for a page that is only ever read.
    */
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={unreadOnly ? 'default' : 'outline'}
          size="sm"
          onClick={toggleFilter}
        >
          Chưa đọc{unread > 0 && ` (${unread})`}
        </Button>

        {/* Only offered when it would do something. A permanently visible
            button that does nothing most of the time is furniture. */}
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <Check />
            Đánh dấu đã đọc hết
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border">
          <EmptyState
            icon={BellOff}
            title={
              unreadOnly
                ? 'Bạn đã đọc hết thông báo.'
                : 'Chưa có thông báo nào.'
            }
          />
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((notice) => (
            <li key={notice.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => open(notice)}
              >
                <div className="flex w-full items-center gap-2">
                  {!notice.isRead && (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="text-sm font-medium">{notice.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {timeAgo(notice.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {notice.content}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PaginationBar
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      <Sheet
        open={selectedNotice !== null}
        onOpenChange={(open) => !open && setSelectedNotice(null)}
      >
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          {selectedNotice && (
            <>
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="font-heading text-lg leading-snug">
                  {selectedNotice.title}
                </SheetTitle>
                <SheetDescription>
                  {new Intl.DateTimeFormat('vi-VN', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  }).format(new Date(selectedNotice.createdAt))}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                  {selectedNotice.content}
                </p>
              </div>

              <SheetFooter className="border-t pt-4 flex-row justify-end gap-2">
                <Button variant="ghost" onClick={() => setSelectedNotice(null)}>
                  Đóng
                </Button>
                {user && notificationHref(selectedNotice, user.role) && (
                  <Button
                    onClick={() => {
                      const href = notificationHref(selectedNotice, user.role);
                      if (href) {
                        router.push(href);
                        setSelectedNotice(null);
                      }
                    }}
                  >
                    Đi tới
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
