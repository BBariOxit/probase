'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { nextParam } from '@/lib/auth/next-path';
import { useSession } from '@/lib/auth/session';
import { authService } from '@/services/auth.service';
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
    }
  }, [status, user, router, pathname]);

  const queryClient = useQueryClient();

  async function handleSignOut() {
    await authService.logout();
    queryClient.clear();
    signOut();
    router.replace('/login');
  }

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex min-h-svh min-w-0 flex-1 overflow-x-clip bg-sidebar">
        <div className="hidden w-64 shrink-0 md:block" />
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="h-14 border-b border-border bg-card" />
          <div className="flex flex-1 items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <BreadcrumbProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="min-w-0 overflow-x-clip"
      >
        <AppSidebar user={user} />
        <SidebarInset className="min-w-0 overflow-x-clip">
          <AppHeader user={user} onSignOut={handleSignOut} />
          <div className="w-full min-w-0 flex-1 overflow-x-clip p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
