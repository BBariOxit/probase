import type { Metadata } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/layout/providers';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | ProBase',
    default: 'ProBase — Quản lý đồ án',
  },
  description:
    'Hệ thống quản lý đồ án sinh viên: đăng ký đề tài, nộp bài, theo dõi tiến độ.',
  keywords: ['đồ án', 'quản lý đề tài', 'sinh viên', 'giảng viên'],
  openGraph: {
    title: 'ProBase — Quản lý đồ án',
    description: 'Hệ thống quản lý đồ án sinh viên',
    type: 'website',
    locale: 'vi_VN',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
