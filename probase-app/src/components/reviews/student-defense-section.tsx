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
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useGroupReviews } from '@/lib/api/reviews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StudentDefenseSectionProps {
  groupId: number;
}

export function StudentDefenseSection({ groupId }: StudentDefenseSectionProps) {
  const { data, isPending, error } = useGroupReviews(groupId);

  if (isPending) {
    return (
      <div className="rounded-xl border bg-card p-6 flex justify-center">
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
    recentSubmissions,
  } = data;

  const questions: string[] =
    reviewerReview?.evaluationCriteria?.defenseQuestions || [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-tight flex items-center gap-2">
            <Award className="size-4 text-primary" />
            Hồ sơ Cuối kỳ & Thẩm định ra Hội đồng Bảo vệ (BR-16, BR-17)
          </h2>
          <p className="text-xs text-muted-foreground">
            Theo dõi trạng thái xét duyệt quyển báo cáo cuối kỳ từ GVHD & GVPB trước khi ra Hội đồng.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          render={<Link href="/student/submissions" />}
        >
          <FileDown className="size-3.5" />
          Nộp quyển cuối kỳ & Slide
        </Button>
      </div>

      {/* Main Eligibility Card */}
      <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        {/* Banner Gate */}
        {eligibilityStatus === 'ELIGIBLE' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                🎉 CHÚC MỪNG! ĐỀ TÀI ĐÃ ĐỦ ĐIỀU KIỆN RA BẢO VỆ TRƯỚC HỘI ĐỒNG
              </h3>
            </div>
            <p className="text-xs text-emerald-600/90 dark:text-emerald-400/90 pl-7">
              Nhóm của bạn đã hoàn thành tiến độ giai đoạn 2 và nhận được sự đồng thuận cho phép bảo vệ
              từ cả Giảng viên hướng dẫn và Giảng viên phản biện. Hãy chuẩn bị slide thuyết trình và ôn tập câu hỏi chất vấn.
            </p>
          </div>
        ) : eligibilityStatus === 'NOT_ELIGIBLE' ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-destructive" />
              <h3 className="text-sm font-bold text-destructive">
                ⚠️ CẢNH BÁO: ĐỀ TÀI CHƯA ĐỦ ĐIỀU KIỆN RA HỘI ĐỒNG BẢO VỆ
              </h3>
            </div>
            <p className="text-xs text-destructive/90 pl-7">
              Đề tài bị đình chỉ hoặc từ chối bảo vệ do khối lượng sản phẩm Tiến độ 2 chưa đạt 50%
              hoặc giảng viên chưa đồng ý thông qua. Vui lòng liên hệ trực tiếp với GVHD để được hướng dẫn xử lý.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                ⏳ ĐANG THẨM ĐỊNH HỒ SƠ BẢO VỆ CUỐI KỲ
              </h3>
            </div>
            <p className="text-xs text-amber-600/90 dark:text-amber-400/90 pl-7">
              Hệ thống đang chờ Cán bộ Hướng dẫn và Cán bộ Phản biện đọc quyển báo cáo và hoàn tất Phiếu nhận xét (M02/M04 & M05).
            </p>
          </div>
        )}

        {/* 3 Steps Overview Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Step 1: Progress Stage 2 */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                1. Tiến độ Đợt 2 (≥ 50%)
              </span>
              {stage2 ? (
                <Badge
                  className={
                    stage2Passed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]'
                      : 'bg-destructive/10 text-destructive border-destructive/20 text-[11px]'
                  }
                >
                  {stage2Passed ? '✓ Đạt' : '✕ Chưa đạt'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                  Chưa nộp
                </Badge>
              )}
            </div>
            <p className="text-xs font-medium text-foreground">
              Khối lượng: {stage2?.workloadPercentage ?? 0}%
            </p>
            {stage2?.sourceCodeUrl && (
              <a
                href={stage2.sourceCodeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                Kho mã nguồn Git
              </a>
            )}
          </div>

          {/* Step 2: GVHD Review */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                2. Nhận xét GVHD ({supervisorReview?.templateCode || 'M04'})
              </span>
              {supervisorReview ? (
                <Badge
                  className={
                    supervisorReview.isDefenseAllowed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]'
                      : 'bg-destructive/10 text-destructive border-destructive/20 text-[11px]'
                  }
                >
                  {supervisorReview.isDefenseAllowed ? '✓ Cho bảo vệ' : '✕ Không cho'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                  Đang chờ GVHD
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.group.supervisor?.fullName || 'Giảng viên hướng dẫn'}
            </p>
            {supervisorReview?.signedAt && (
              <p className="text-[10px] text-muted-foreground">
                Ký ngày {new Date(supervisorReview.signedAt).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>

          {/* Step 3: GVPB Review */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                3. Nhận xét GVPB (M05)
              </span>
              {reviewerReview ? (
                <Badge
                  className={
                    reviewerReview.isDefenseAllowed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]'
                      : 'bg-destructive/10 text-destructive border-destructive/20 text-[11px]'
                  }
                >
                  {reviewerReview.isDefenseAllowed ? '✓ Cho bảo vệ' : '✕ Không cho'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                  Đang chờ GVPB
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.group.reviewer?.fullName || 'Giảng viên phản biện'}
            </p>
            {reviewerReview?.signedAt && (
              <p className="text-[10px] text-muted-foreground">
                Ký ngày {new Date(reviewerReview.signedAt).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
        </div>

        {/* Feedback comments */}
        {(supervisorReview?.generalComment || reviewerReview?.generalComment) && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-3.5" />
              Ý kiến nhận xét từ các Thầy/Cô:
            </h4>

            {supervisorReview?.generalComment && (
              <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
                <span className="font-semibold text-primary">
                  GVHD ({data.group.supervisor?.fullName}):
                </span>
                <p className="italic leading-relaxed text-foreground">
                  "{supervisorReview.generalComment}"
                </p>
              </div>
            )}

            {reviewerReview?.generalComment && (
              <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  GVPB ({data.group.reviewer?.fullName}):
                </span>
                <p className="italic leading-relaxed text-foreground">
                  "{reviewerReview.generalComment}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Defense Questions from Reviewer */}
        {questions.length > 0 && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Câu hỏi chất vấn của Giảng viên Phản biện trước Hội đồng:
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nhóm sinh viên cần nghiên cứu kỹ và chuẩn bị câu trả lời vào phần trình bày bảo vệ:
            </p>

            <ol className="list-decimal pl-5 space-y-1.5 text-xs font-medium text-foreground">
              {questions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
