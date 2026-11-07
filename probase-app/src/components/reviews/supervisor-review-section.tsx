'use client';

import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useGroupReviews } from '@/lib/api/reviews';
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
  const isThesis = projectTypeCode === 'KLTN' || projectTypeCode === 'DATN';
  const expectedTemplate = isThesis ? 'M04' : 'M02';

  const supervisorReview = reviewsData?.supervisorReview;
  const reviewerReview = reviewsData?.reviewerReview;
  const isDefenseEligible = reviewsData?.isDefenseEligible ?? false;
  const eligibilityStatus = reviewsData?.eligibilityStatus ?? 'PENDING';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Award className="size-4 text-primary" />
          <span>Phiếu nhận xét GVHD & Thẩm định bảo vệ</span>
        </h2>

        <Button
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setDialogOpen(true)}
        >
          <FileText className="size-3.5" />
          {supervisorReview
            ? `Cập nhật nhận xét (${expectedTemplate})`
            : `Lập nhận xét (${expectedTemplate})`}
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
        {/* Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* CB Hướng dẫn */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3.5 text-primary" />
              Ý kiến GVHD:
            </span>
            {supervisorReview ? (
              <div className="space-y-0.5">
                <p
                  className={
                    supervisorReview.isDefenseAllowed
                      ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'text-xs font-semibold text-rose-500'
                  }
                >
                  {supervisorReview.isDefenseAllowed ? 'Đồng ý cho bảo vệ' : 'Không đồng ý'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Ký ngày {new Date(supervisorReview.signedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa lập nhận xét</p>
            )}
          </div>

          {/* CB Phản biện */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3.5 text-blue-500" />
              Ý kiến GVPB:
            </span>
            {reviewerReview ? (
              <div className="space-y-0.5">
                <p
                  className={
                    reviewerReview.isDefenseAllowed
                      ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'text-xs font-semibold text-rose-500'
                  }
                >
                  {reviewerReview.isDefenseAllowed ? 'Đồng ý cho bảo vệ' : 'Không đồng ý'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {reviewerReview.lecturer?.fullName} ({new Date(reviewerReview.signedAt).toLocaleDateString('vi-VN')})
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {group?.assignment?.reviewer
                  ? `Chờ ${group.assignment.reviewer.fullName}`
                  : 'Chưa phân công'}
              </p>
            )}
          </div>

          {/* Cổng thẩm định */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              {isDefenseEligible ? (
                <ShieldCheck className="size-3.5 text-emerald-500" />
              ) : (
                <Clock className="size-3.5 text-amber-500" />
              )}
              Kết quả thẩm định:
            </span>
            <div>
              {eligibilityStatus === 'ELIGIBLE' ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Đủ điều kiện bảo vệ
                </p>
              ) : eligibilityStatus === 'NOT_ELIGIBLE' ? (
                <p className="text-xs font-semibold text-rose-500">
                  Chưa đủ điều kiện
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Đang thẩm định</p>
              )}
            </div>
          </div>
        </div>

        {/* Comment Preview if submitted */}
        {supervisorReview && (
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Nhận xét GVHD:
            </p>
            <p className="text-xs text-foreground italic leading-relaxed">
              "{supervisorReview.generalComment}"
            </p>
          </div>
        )}
      </div>

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
