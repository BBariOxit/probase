'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileDown,
  FileText,
  HelpCircle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useGroupReviews } from '@/lib/api/reviews';
import { Button } from '@/components/ui/button';

interface StudentDefenseSectionProps {
  groupId: number;
}

export function StudentDefenseSection({ groupId }: StudentDefenseSectionProps) {
  const { data, isPending, error } = useGroupReviews(groupId);

  if (isPending) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 flex justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) return null;

  const {
    stage2,
    stage2Passed,
    supervisorReview,
    reviewerReview,
    isDefenseEligible,
    eligibilityStatus,
  } = data;

  const questions: string[] =
    reviewerReview?.evaluationCriteria?.defenseQuestions || [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Award className="size-3.5 text-primary" />
          <span>Hồ sơ & Đánh giá bảo vệ</span>
        </h2>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          render={<Link href="/student/submissions" />}
        >
          <FileDown className="size-3" />
          Nộp quyển & slide
        </Button>
      </div>

      <div className="rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#141414] p-4 space-y-3 shadow-xs">
        {/* Banner trạng thái điều kiện */}
        {eligibilityStatus === 'ELIGIBLE' ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-emerald-300">
                Đủ điều kiện ra bảo vệ trước hội đồng
              </h3>
            </div>
            <p className="text-[11px] text-zinc-300 pl-6">
              Đề tài đã hoàn thành khối lượng tiến độ và nhận được sự đồng ý của cả GVHD và GVPB.
            </p>
          </div>
        ) : eligibilityStatus === 'NOT_ELIGIBLE' ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-400" />
              <h3 className="text-xs font-semibold text-rose-300">
                Chưa đủ điều kiện ra hội đồng bảo vệ
              </h3>
            </div>
            <p className="text-[11px] text-zinc-300 pl-6">
              Khối lượng tiến độ 2 chưa đạt hoặc có ý kiến chưa đồng ý từ cán bộ đánh giá.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-300">
                Đang thẩm định hồ sơ bảo vệ
              </h3>
            </div>
            <p className="text-[11px] text-zinc-300 pl-6">
              Hệ thống đang chờ cán bộ hướng dẫn và phản biện hoàn tất phiếu nhận xét.
            </p>
          </div>
        )}

        {/* 3 tiêu chí cốt lõi */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
          {/* Tiêu chí 1: Tiến độ 2 */}
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Tiến độ đợt 2 (≥ 50%)
              </span>
              {stage2 ? (
                <span
                  className={
                    stage2Passed
                      ? 'text-emerald-600 dark:text-emerald-400 text-xs font-medium'
                      : 'text-rose-600 dark:text-rose-400 text-xs font-medium'
                  }
                >
                  {stage2Passed ? 'Đạt' : 'Chưa đạt'}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-neutral-400 text-xs font-medium">
                  Chưa nộp
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-foreground">
              Khối lượng: {stage2?.workloadPercentage ?? 0}%
            </p>
          </div>

          {/* Tiêu chí 2: GVHD */}
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Ý kiến GVHD
              </span>
              {supervisorReview ? (
                <span
                  className={
                    supervisorReview.isDefenseAllowed
                      ? 'text-emerald-600 dark:text-emerald-400 text-xs font-medium'
                      : 'text-rose-600 dark:text-rose-400 text-xs font-medium'
                  }
                >
                  {supervisorReview.isDefenseAllowed ? 'Đồng ý' : 'Không cho'}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                  Chờ duyệt
                </span>
              )}
            </div>
            <p className="text-xs text-foreground truncate">
              {data.group.supervisor?.fullName || 'GVHD'}
            </p>
          </div>

          {/* Tiêu chí 3: GVPB */}
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Ý kiến GVPB
              </span>
              {reviewerReview ? (
                <span
                  className={
                    reviewerReview.isDefenseAllowed
                      ? 'text-emerald-600 dark:text-emerald-400 text-xs font-medium'
                      : 'text-rose-600 dark:text-rose-400 text-xs font-medium'
                  }
                >
                  {reviewerReview.isDefenseAllowed ? 'Đồng ý' : 'Không cho'}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                  Chờ duyệt
                </span>
              )}
            </div>
            <p className="text-xs text-foreground truncate">
              {data.group.reviewer?.fullName || 'GVPB'}
            </p>
          </div>
        </div>

        {/* Ý kiến nhận xét */}
        {(supervisorReview?.generalComment || reviewerReview?.generalComment) && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            {supervisorReview?.generalComment && (
              <div className="text-xs space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Nhận xét GVHD:</span>
                <p className="text-zinc-300 italic">
                  "{supervisorReview.generalComment}"
                </p>
              </div>
            )}
            {reviewerReview?.generalComment && (
              <div className="text-xs space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Nhận xét GVPB:</span>
                <p className="text-zinc-300 italic">
                  "{reviewerReview.generalComment}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Câu hỏi phản biện */}
        {questions.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="size-3.5 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">
                Câu hỏi phản biện cần chuẩn bị
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300 pl-4 list-decimal">
              {questions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
