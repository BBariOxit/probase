'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/api/types';
import { homePathFor, useSession } from '@/lib/auth/session';

export function useRequireRole(role: Role | Role[]): boolean {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const roles = Array.isArray(role) ? role : [role];
  const allowed = user ? roles.includes(user.role) : false;

  useEffect(() => {
    if (user && !allowed) router.replace(homePathFor(user.role));
  }, [user, allowed, router]);

  return allowed;
}
