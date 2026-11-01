'use client';

import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useGroupReviews } from '@/lib/api/reviews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TopicReviewDialog } from './topic-review-dialog';

interface SupervisorReviewSectionProps {
  groupId: number;
  group: any;
}

export function SupervisorReviewSection({
  groupId,
  group,
}: SupervisorReviewSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: reviewsData, isPending } = useGroupReviews(groupId);

  const projectTypeCode = group?.topic?.round?.projectType?.code;
  const expectedTemplate = projectTypeCode === 'KLTN' ? 'M04' : 'M02';

  const supervisorReview = reviewsData?.supervisorReview;
  const reviewerReview = reviewsData?.reviewerReview;
  const isDefenseEligible = reviewsData?.isDefenseEligible ?? false;
  const eligibilityStatus = reviewsData?.eligibilityStatus ?? 'PENDING';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-tight flex items-center gap-2">
            <Award className="size-4 text-primary" />
            Phiếu Nhận xét của Cán bộ Hướng dẫn & Thẩm định Bảo vệ (BR-17)
          </h2>
          <p className="text-xs text-muted-foreground">
            Đánh giá chất lượng toàn văn cuối kỳ, xác nhận điều kiện cho phép bảo vệ trước Hội đồng.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setDialogOpen(true)}
        >
          <FileText className="size-3.5" />
          {supervisorReview
            ? `Cập nhật Nhận xét (${expectedTemplate})`
            : `Lập Phiếu nhận xét (${expectedTemplate})`}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* CB Hướng dẫn */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3.5 text-primary" />
              Cán bộ Hướng dẫn ({expectedTemplate}):
            </span>
            {supervisorReview ? (
              <div className="space-y-1">
                <Badge
                  className={
                    supervisorReview.isDefenseAllowed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs'
                      : 'bg-destructive/10 text-destructive border-destructive/20 font-bold text-xs'
                  }
                >
                  {supervisorReview.isDefenseAllowed ? '✓ ĐỒNG Ý BẢO VỆ' : '✕ KHÔNG ĐỒNG Ý'}
                </Badge>
                <p className="text-[10px] text-muted-foreground">
                  Ký ngày {new Date(supervisorReview.signedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 text-xs">
                Chờ bạn lập nhận xét
              </Badge>
            )}
          </div>

          {/* CB Phản biện */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3.5 text-blue-600" />
              Cán bộ Phản biện (M05):
            </span>
            {reviewerReview ? (
              <div className="space-y-1">
                <Badge
                  className={
                    reviewerReview.isDefenseAllowed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-xs'
                      : 'bg-destructive/10 text-destructive border-destructive/20 font-bold text-xs'
                  }
                >
                  {reviewerReview.isDefenseAllowed ? '✓ ĐỒNG Ý BẢO VỆ' : '✕ KHÔNG ĐỒNG Ý'}
                </Badge>
                <p className="text-[10px] text-muted-foreground">
                  {reviewerReview.lecturer?.fullName} ({new Date(reviewerReview.signedAt).toLocaleDateString('vi-VN')})
                </p>
              </div>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                {group?.assignment?.reviewer
                  ? `Chờ ${group.assignment.reviewer.fullName} nhận xét`
                  : 'Chưa phân công GVPB'}
              </Badge>
            )}
          </div>

          {/* Cổng thẩm định */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              {isDefenseEligible ? (
                <ShieldCheck className="size-3.5 text-emerald-600" />
              ) : (
                <ShieldAlert className="size-3.5 text-amber-600" />
              )}
              Kết quả thẩm định ra Hội đồng:
            </span>
            <div>
              {eligibilityStatus === 'ELIGIBLE' ? (
                <Badge className="bg-emerald-600 text-white font-bold text-xs">
                  ✓ ĐỦ ĐIỀU KIỆN BẢO VỆ
                </Badge>
              ) : eligibilityStatus === 'NOT_ELIGIBLE' ? (
                <Badge variant="destructive" className="font-bold text-xs">
                  ✕ TỪ CHỐI BẢO VỆ
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 font-semibold text-xs">
                  ⏳ ĐANG THẨM ĐỊNH
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Comment Preview if submitted */}
        {supervisorReview && (
          <div className="rounded-lg border bg-muted/10 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Nhận xét đã lưu của bạn:
            </p>
            <p className="text-xs text-foreground italic leading-relaxed">
              "{supervisorReview.generalComment}"
            </p>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {dialogOpen && (
        <TopicReviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          groupId={groupId}
          groupName={group?.name}
          topicTitle={group?.topic?.title || ''}
          projectTypeName={group?.topic?.round?.projectType?.name}
          projectTypeCode={projectTypeCode}
          role="SUPERVISOR"
          expectedTemplate={expectedTemplate}
          supervisorName={group?.topic?.lecturer?.fullName}
          members={group?.members ? group.members.map((m: any) => m.student) : []}
          existingReview={supervisorReview}
        />
      )}
    </section>
  );
}
