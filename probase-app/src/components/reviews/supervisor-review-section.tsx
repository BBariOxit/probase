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
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <span>Phiếu nhận xét GVHD & Thẩm định bảo vệ</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Đánh giá chất lượng toàn văn cuối kỳ và xác nhận điều kiện ra bảo vệ.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setDialogOpen(true)}
        >
          <FileText className="size-3.5" />
          {supervisorReview
            ? `Cập nhật nhận xét (${expectedTemplate})`
            : `Lập phiếu nhận xét (${expectedTemplate})`}
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
        {/* Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* CB Hướng dẫn */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3.5 text-primary" />
              Ý kiến GVHD ({expectedTemplate}):
            </span>
            {supervisorReview ? (
              <div className="space-y-0.5">
                <Badge
                  className={
                    supervisorReview.isDefenseAllowed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs'
                  }
                >
                  {supervisorReview.isDefenseAllowed ? 'Đồng ý cho bảo vệ' : 'Không đồng ý'}
                </Badge>
                <p className="text-[10px] text-muted-foreground">
                  Ký ngày {new Date(supervisorReview.signedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-xs">
                Chờ lập nhận xét
              </Badge>
            )}
          </div>

          {/* CB Phản biện */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3.5 text-blue-400" />
              Ý kiến GVPB (M05):
            </span>
            {reviewerReview ? (
              <div className="space-y-0.5">
                <Badge
                  className={
                    reviewerReview.isDefenseAllowed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs'
                  }
                >
                  {reviewerReview.isDefenseAllowed ? 'Đồng ý cho bảo vệ' : 'Không đồng ý'}
                </Badge>
                <p className="text-[10px] text-muted-foreground">
                  {reviewerReview.lecturer?.fullName} ({new Date(reviewerReview.signedAt).toLocaleDateString('vi-VN')})
                </p>
              </div>
            ) : (
              <Badge variant="outline" className="text-zinc-500 border-zinc-700/40 text-xs">
                {group?.assignment?.reviewer
                  ? `Chờ ${group.assignment.reviewer.fullName}`
                  : 'Chưa phân công GVPB'}
              </Badge>
            )}
          </div>

          {/* Cổng thẩm định */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-3 space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              {isDefenseEligible ? (
                <ShieldCheck className="size-3.5 text-emerald-400" />
              ) : (
                <Clock className="size-3.5 text-amber-400" />
              )}
              Kết quả thẩm định:
            </span>
            <div>
              {eligibilityStatus === 'ELIGIBLE' ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                  Đủ điều kiện bảo vệ
                </Badge>
              ) : eligibilityStatus === 'NOT_ELIGIBLE' ? (
                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs">
                  Chưa đủ điều kiện
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-xs">
                  Đang thẩm định
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Comment Preview if submitted */}
        {supervisorReview && (
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Nhận xét đã lưu của bạn:
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
