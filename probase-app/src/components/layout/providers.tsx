'use client';

import { useEffect, useRef, useState } from 'react';
import { QueryCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';
import { useSessionBootstrap } from '@/lib/auth/use-session-bootstrap';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GoogleAuthProvider } from '@/components/auth/google-auth-provider';

function SessionBootstrap() {
  useSessionBootstrap();
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (
      prevUserIdRef.current !== undefined &&
      prevUserIdRef.current !== userId
    ) {
      queryClient.clear();
    }
    prevUserIdRef.current = userId;
  }, [userId, queryClient]);

  return null;
}

function ThemeToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={(theme as 'light' | 'dark' | 'system') ?? 'system'}
      toastOptions={{
        className: 'w-auto min-w-0',
        style: { width: 'fit-content', minWidth: 'min-content' },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 401) return;
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[QueryCache Error]:', error);
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // The client already retries a 401 once with a refreshed token.
            // Retrying again here would only replay a genuine auth failure.
            retry: (failureCount, error) =>
              error instanceof ApiError && error.status < 500
                ? false
                : failureCount < 2,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {/* The collapsed sidebar labels its icons with tooltips, so the
            provider has to sit above every signed-in screen. */}
        <TooltipProvider delay={300}>
          <SessionBootstrap />
          <GoogleAuthProvider>{children}</GoogleAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
      <ThemeToaster />
    </ThemeProvider>
  );
}
