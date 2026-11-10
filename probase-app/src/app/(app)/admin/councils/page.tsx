'use client';

import { useRequireRole } from '@/lib/auth/use-require-role';
import { AdminCouncilsView } from '@/components/councils/admin-councils-view';

export default function AdminCouncilsPage() {
  const allowed = useRequireRole('ADMIN');

  if (!allowed) return null;

  return (
    <div className="w-full min-w-0 space-y-4">
      <AdminCouncilsView />
    </div>
  );
}
