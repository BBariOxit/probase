'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface PermissionDefinition {
  code: string;
  name: string;
  category: string;
  description: string;
}

export interface SystemRoleInfo {
  code: 'ADMIN' | 'TTBM' | 'GVCN' | 'LECTURER';
  label: string;
  isLocked: boolean;
}

export interface PermissionMatrixResponse {
  permissions: PermissionDefinition[];
  roles: SystemRoleInfo[];
  matrix: Record<string, string[]>;
}

export interface UserPermissionsResponse {
  userId: number;
  email: string;
  fullName: string;
  customPermissions: string[];
  effectivePermissions: string[];
}

export function usePermissionMatrix() {
  return useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: () => api<PermissionMatrixResponse>('/permissions/matrix'),
    staleTime: 30_000,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      role,
      permissions,
    }: {
      role: string;
      permissions: string[];
    }) =>
      api<{ role: string; permissions: string[] }>(
        `/permissions/roles/${role}`,
        {
          method: 'PUT',
          body: { permissions },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', 'matrix'] });
    },
  });
}

export function useUserPermissions(userId?: number) {
  return useQuery({
    queryKey: ['permissions', 'user', userId],
    queryFn: () => api<UserPermissionsResponse>(`/permissions/users/${userId}`),
    enabled: typeof userId === 'number' && userId > 0,
    staleTime: 10_000,
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      permissions,
    }: {
      userId: number;
      permissions: string[];
    }) =>
      api<UserPermissionsResponse>(`/permissions/users/${userId}`, {
        method: 'PUT',
        body: { permissions },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['permissions', 'user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['lecturers', 'admin-roster'],
      });
    },
  });
}

export function useMyPermissions() {
  return useQuery({
    queryKey: ['permissions', 'my'],
    queryFn: () => api<string[]>('/permissions/my-permissions'),
    staleTime: 60_000,
  });
}
