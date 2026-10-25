'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { nextParam } from '@/lib/auth/next-path';
import { useSession } from '@/lib/auth/session';
import { BreadcrumbProvider } from '@/lib/breadcrumb-context';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

function storedSidebarOpen(): boolean {
  if (typeof document === 'undefined') return true;
  return !/(^|;\s*)sidebar_state=false(;|$)/.test(document.cookie);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, signOut } = useSession();
  const [defaultOpen] = useState(storedSidebarOpen);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login${nextParam(pathname)}`);
    } else if (status === 'authenticated' && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [status, user, router, pathname]);

  async function handleSignOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    signOut();
    router.replace('/login');
  }

  if (status !== 'authenticated' || !user || user.mustChangePassword) {
    return (
      <div className="flex min-h-svh flex-1 bg-sidebar">
        <div className="hidden w-64 shrink-0 md:block" />
        <div className="m-2 ml-0 flex flex-1 flex-col rounded-xl bg-background shadow-sm">
          <div className="h-14 border-b" />
          <div className="flex flex-1 items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <BreadcrumbProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar user={user} />
        <SidebarInset>
          <AppHeader user={user} onSignOut={handleSignOut} />
          <div className="min-w-0 flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
