'use client';

import type { SessionUser } from '@/lib/api/types';
import { AppBreadcrumb } from '@/components/layout/app-breadcrumb';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader({
  user,
  onSignOut,
}: {
  user: SessionUser;
  onSignOut: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <Separator orientation="vertical" className="mr-1 !h-4" />

      {/* Breadcrumb trail — single-segment paths degrade to a plain h1. */}
      <AppBreadcrumb role={user.role} />

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell role={user.role} />
        <ThemeToggle />
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
