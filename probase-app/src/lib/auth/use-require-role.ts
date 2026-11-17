'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/api/types';
import { homePathFor, useSession } from '@/lib/auth/session';
import { useMyProfile } from '@/lib/api/me';
import { useMyPermissions } from '@/lib/api/permissions';

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

export function useRequireGvcnOrAdmin(permission?: string): {
  allowed: boolean;
  isLoading: boolean;
} {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const isLecturer = user?.role === 'LECTURER';

  const { data: myProfile, isLoading: isProfileLoading } = useMyProfile({
    enabled: isLecturer,
  });
  const { data: myPermissions, isLoading: isPermsLoading } = useMyPermissions();

  const isHomeroomTeacher =
    user?.role === 'GVCN' || (myProfile?.lecturer?.isHomeroomTeacher ?? false);
  const hasCustomPerm = permission
    ? (myPermissions?.includes(permission) ?? false)
    : false;

  const allowed =
    user?.role === 'ADMIN' ||
    user?.role === 'GVCN' ||
    isHomeroomTeacher ||
    hasCustomPerm;

  const isLoading = isLecturer && (isProfileLoading || isPermsLoading);

  useEffect(() => {
    if (user && !isLoading && !allowed) {
      router.replace(homePathFor(user.role));
    }
  }, [user, isLoading, allowed, router]);

  return { allowed, isLoading };
}
