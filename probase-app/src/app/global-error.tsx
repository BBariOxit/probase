'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans antialiased text-foreground">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold">Lỗi hệ thống</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || 'Đã có lỗi nghiêm trọng xảy ra trên ứng dụng.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
