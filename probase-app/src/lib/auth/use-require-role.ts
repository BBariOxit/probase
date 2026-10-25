'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/api/types';
import { homePathFor, useSession } from '@/lib/auth/session';

export function useRequireRole(role: Role): boolean {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const allowed = user?.role === role;

  useEffect(() => {
    if (user && !allowed) router.replace(homePathFor(user.role));
  }, [user, allowed, router]);

  return allowed;
}
