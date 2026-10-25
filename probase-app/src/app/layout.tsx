import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/layout/providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  // Geist ships no vietnamese subset; latin-ext carries the diacritics.
  subsets: ['latin', 'latin-ext'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
