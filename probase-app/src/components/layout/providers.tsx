'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useSessionBootstrap } from '@/lib/auth/use-session-bootstrap';
import { TooltipProvider } from '@/components/ui/tooltip';

function SessionBootstrap() {
  useSessionBootstrap();
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
          {children}
        </TooltipProvider>
      </QueryClientProvider>
      <ThemeToaster />
    </ThemeProvider>
  );
}
