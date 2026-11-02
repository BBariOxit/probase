'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useMyEligibilityStatus } from '@/lib/api/eligible-students';
import { formatDate } from '@/lib/utils';

export function StudentEligibilityBanner() {
  const { data: status, isLoading } = useMyEligibilityStatus();

  if (isLoading || !status) return null;

  if (status.isEligible) {
    const roundNames = status.rounds.map((r) => r.projectTypeName).join(', ');
    const nearestDeadline = status.rounds.find((r) => r.deadline)?.deadline;

    return (
      <div className="rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:border-l-emerald-500 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Đủ điều kiện đăng ký {roundNames || 'đồ án học kỳ này'}
              </span>
              {nearestDeadline && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  • Hạn nộp Đề cương: {formatDate(nearestDeadline)}
                </span>
              )}
            </div>
          </div>

          <Link
            href="/student/groups"
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:self-center"
          >
            Vào nhóm của tôi
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:border-l-amber-500 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <AlertTriangle className="size-4.5 shrink-0 text-amber-500" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Chưa có tên trong danh sách đủ điều kiện làm đồ án
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vui lòng liên hệ Văn phòng Khoa Công nghệ Thông tin (TLGV) để được hỗ trợ kiểm tra và bổ sung.
          </p>
        </div>
      </div>
    </div>
  );
}
