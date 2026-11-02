'use client';

import { useRequireRole } from '@/lib/auth/use-require-role';
import { AdminCouncilsView } from '@/components/councils/admin-councils-view';

export default function AdminCouncilsPage() {
  const allowed = useRequireRole(['ADMIN', 'LECTURER']);

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <AdminCouncilsView />
    </div>
  );
}
