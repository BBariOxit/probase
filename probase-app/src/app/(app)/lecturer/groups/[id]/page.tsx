'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  FileCheck2,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGroup } from '@/lib/api/registration';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { useBreadcrumbLabel } from '@/lib/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function copyText(text: string, successMessage: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(successMessage),
    () => toast.error('Không thể sao chép vào bộ nhớ tạm.'),
  );
}

export default function LecturerGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const allowed = useRequireRole(['LECTURER', 'GVCN']);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const { data: group, isPending, error } = useGroup(groupId);

  useBreadcrumbLabel(id, group?.topic.title);

  const isFull =
    group && group.occupiedSeats >= group.topic.maxStudents;

  function handleCopySingleEmail(email: string) {
    copyText(email, `Đã sao chép: ${email}`);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  if (!allowed) return null;

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !group) {
    return <p className="text-sm text-destructive">Không tìm thấy nhóm này.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Top bar: Nút quay lại */}
      <div className="flex items-center justify-between">
        <Link
          href="/lecturer/groups"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary dark:text-neutral-400 dark:hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Danh sách nhóm hướng dẫn</span>
        </Link>
      </div>

      {/* Khối đề tài */}
      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-500 dark:text-neutral-400">
                {group.topic.projectType.name}
              </span>
              <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
                •
              </span>
              <span
                className={cn(
                  'font-mono font-bold',
                  isFull
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400',
                )}
              >
                {group.occupiedSeats}/{group.topic.maxStudents}
              </span>
            </div>

            <h1 className="text-lg font-bold text-slate-900 dark:text-neutral-100 leading-snug">
              {group.topic.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              render={<Link href="/lecturer/outlines" />}
            >
              <FileCheck2 className="size-3.5" />
              <span>Đề cương M03</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              render={<Link href={`/lecturer/topics/${group.topicId}`} />}
            >
              <BookOpen className="size-3.5" />
              <span>Xem & sửa đề tài</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Khối thành viên nhóm: Dạng section gạch ngang từng dòng */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-2xs">
        <div className="border-b border-slate-200/80 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60 px-4 py-3 sm:px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Thành viên nhóm ({group.occupiedSeats}/{group.topic.maxStudents})
            </h2>
          </div>
        </div>

        {group.members.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Chưa có sinh viên nào trong nhóm.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800/80">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 sm:px-5 hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors"
              >
                {/* Cụm 1: Ký tự đại diện + Họ tên + (Trưởng nhóm) */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-7 shrink-0 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center justify-center text-xs font-bold font-mono">
                    {member.student.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                      {member.student.fullName}
                    </span>
                    {member.isLeader && (
                      <span className="text-xs font-medium text-primary">
                        (Trưởng nhóm)
                      </span>
                    )}
                  </div>
                </div>

                {/* Cụm 2: MSSV • Lớp • Email liên hệ */}
                <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-600 dark:text-neutral-400 flex-wrap pl-10 sm:pl-0">
                  <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                    {member.student.studentCode}
                  </span>

                  <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
                    •
                  </span>

                  <span className="font-mono text-slate-600 dark:text-neutral-400">
                    {member.student.class || '—'}
                  </span>

                  <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
                    •
                  </span>

                  <div className="flex items-center gap-1">
                    <a
                      href={`mailto:${member.student.email}`}
                      className="font-mono text-slate-600 hover:text-primary dark:text-neutral-400 dark:hover:text-primary transition-colors hover:underline"
                      title="Gửi email"
                    >
                      {member.student.email}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySingleEmail(member.student.email)
                      }
                      className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Sao chép email"
                    >
                      {copiedEmail === member.student.email ? (
                        <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
