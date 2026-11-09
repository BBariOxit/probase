'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/lib/auth/use-require-role';

export default function AdminLandingPage() {
  const allowed = useRequireRole('ADMIN');
  const router = useRouter();

  useEffect(() => {
    if (allowed) {
      router.replace('/admin/topic-registry');
    }
  }, [allowed, router]);

  return null;
}
