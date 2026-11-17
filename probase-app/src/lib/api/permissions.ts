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

export interface CustomAssignmentItem {
  id: number;
  userId: number;
  permission: string;
  fullName: string;
  email: string;
  lecturerCode: string;
  majorName?: string;
}

export interface PermissionMatrixResponse {
  permissions: PermissionDefinition[];
  roles: SystemRoleInfo[];
  matrix: Record<string, string[]>;
  customAssignments?: CustomAssignmentItem[];
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
    staleTime: 5_000,
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
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useUserPermissions(userId?: number) {
  return useQuery({
    queryKey: ['permissions', 'user', userId],
    queryFn: () => api<UserPermissionsResponse>(`/permissions/users/${userId}`),
    enabled: typeof userId === 'number' && userId > 0,
    staleTime: 5_000,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useGrantPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: number;
      permission: string;
    }) =>
      api<{ success: boolean; userId: number; permission: string }>(
        '/permissions/grant',
        {
          method: 'POST',
          body: { userId, permission },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useRevokePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: number;
      permission: string;
    }) =>
      api<{ success: boolean; userId: number; permission: string }>(
        '/permissions/revoke',
        {
          method: 'POST',
          body: { userId, permission },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
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

