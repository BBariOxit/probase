'use client';

import Link from 'next/link';
import { Award, Layers, ShieldCheck, Users } from 'lucide-react';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { DefenseEligibilityAdminView } from '@/components/reviews/defense-eligibility-admin-view';
import { Button } from '@/components/ui/button';

export default function DefenseEligibilityAdminPage() {
  const allowed = useRequireRole(['ADMIN', 'LECTURER']);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Thẩm định điều kiện bảo vệ
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Đối soát danh sách nhóm đồ án đủ điều kiện bảo vệ và kết quả đánh giá cuối kỳ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            render={<Link href="/admin/reviewers" />}
          >
            <Users className="size-3.5" />
            Phân công GVPB
          </Button>
        </div>
      </div>

      <DefenseEligibilityAdminView />
    </div>
  );
}
