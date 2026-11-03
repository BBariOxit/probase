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
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 shadow-2xs">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground cursor-pointer" />
      <Separator orientation="vertical" className="mr-1 !h-4" />

      {/* Breadcrumb trail — single-segment paths degrade to a plain h1. */}
      <AppBreadcrumb role={user.role} />

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell role={user.role} />
        <ThemeToggle />
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
