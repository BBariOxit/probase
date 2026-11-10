'use client';

import Link from 'next/link';
import { Gavel, Users } from 'lucide-react';
import { useRequireRole } from '@/lib/auth/use-require-role';
import { DefenseEligibilityAdminView } from '@/components/reviews/defense-eligibility-admin-view';
import { Button } from '@/components/ui/button';

export default function DefenseEligibilityAdminPage() {
  const allowed = useRequireRole('ADMIN');

  if (!allowed) return null;

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Điều kiện bảo vệ</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            render={<Link href="/admin/reviewers" />}
          >
            <Users className="size-3.5" />
            Phân công GVPB
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            render={<Link href="/admin/councils" />}
          >
            <Gavel className="size-3.5" />
            Hội đồng bảo vệ
          </Button>
        </div>
      </div>

      <DefenseEligibilityAdminView />
    </div>
  );
}
