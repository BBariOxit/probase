'use client';

import { useRequireRole } from '@/lib/auth/use-require-role';
import { LecturerCouncilsView } from '@/components/councils/lecturer-councils-view';

export default function LecturerCouncilsPage() {
  const allowed = useRequireRole('LECTURER');

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <LecturerCouncilsView />
    </div>
  );
}
