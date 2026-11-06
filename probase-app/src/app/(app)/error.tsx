'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-side error to console for debugging
    console.error('[AppError Boundary]:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        Đã có lỗi xảy ra
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        {error.message || 'Hệ thống gặp sự cố khi tải trang này. Vui lòng thử lại.'}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          variant="default"
          onClick={() => reset()}
          className="gap-1.5 cursor-pointer"
        >
          <RotateCcw className="size-4" />
          Thử lại
        </Button>
        <Button
          variant="outline"
          render={<Link href="/" />}
          className="gap-1.5 cursor-pointer"
        >
          <Home className="size-4" />
          Trang chủ
        </Button>
      </div>
    </div>
  );
}

