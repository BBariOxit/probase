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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              BR-17 & BR-18
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Thẩm định Điều kiện Bảo vệ & Nhận xét Cuối kỳ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Đối soát danh sách nhóm đồ án đủ điều kiện ra Hội đồng bảo vệ (GVHD M02/M04 & GVPB M05)
            theo chuẩn quy định Khoa Công nghệ Thông tin – Trường Đại học Đà Lạt.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5 text-xs"
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

