import type { Metadata } from 'next';
import { Brand } from '@/components/layout/brand';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export const metadata: Metadata = {
  title: {
    template: '%s | ProBase',
    default: 'ProBase',
  },
  description: 'Đăng nhập vào hệ thống quản lý đồ án ProBase',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
