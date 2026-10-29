'use client';

import { AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useMyEligibilityStatus } from '@/lib/api/eligible-students';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function StudentEligibilityBanner() {
  const { data: status, isLoading } = useMyEligibilityStatus();

  if (isLoading || !status) return null;

  if (status.isEligible) {
    const roundNames = status.rounds.map((r) => r.projectTypeName).join(', ');
    const nearestDeadline = status.rounds.find((r) => r.deadline)?.deadline;

    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-background p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="size-3" /> Đủ điều kiện làm đồ án
                </span>
                {status.specific && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    Phòng Đào tạo thẩm định
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-base font-bold text-foreground">
                Được phép đăng ký {roundNames || 'đồ án học kỳ này'}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {status.message}
                {nearestDeadline && (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {' '}• Hạn nộp Đề cương M03: {formatDate(nearestDeadline)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <Link
            href="/student/groups"
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 sm:self-center"
          >
            Vào nhóm của tôi
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">
            Chưa có tên trong danh sách đủ điều kiện làm đồ án
          </h3>
          <p className="text-xs text-muted-foreground sm:text-sm leading-relaxed">
            {status.message} Nếu bạn đã đăng ký học phần trên cổng trường và đóng học phí đầy đủ,
            vui lòng liên hệ Văn phòng Khoa Công nghệ Thông tin (TLGV) để được bổ sung vào danh sách.
          </p>
        </div>
      </div>
    </div>
  );
}
