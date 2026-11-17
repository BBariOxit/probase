'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  LecturerDirectoryEntry,
  Paginated,
  PublicLecturer,
} from '@/lib/api/types';

export type AssignedLecturerRole = 'LECTURER' | 'TTBM' | 'GVCN' | 'ADMIN';
export type AssignableLecturerRole = 'LECTURER' | 'TTBM' | 'GVCN';

export interface AdminLecturerItem {
  id: number;
  userId: number;
  lecturerCode: string;
  fullName: string;
  academicTitle?: string | null;
  phone?: string | null;
  email: string;
  avatarUrl?: string | null;
  isActive: boolean;
  userRole: string;
  major?: { id: number; name: string; code: string } | null;
  assignedRole: AssignedLecturerRole;
  isHeadOfDepartment: boolean;
  isAcademicAssistant: boolean;
  isHomeroomTeacher: boolean;
  customPermissions?: string[];
}

export interface QueryAdminLecturersParams {
  q?: string;
  role?: string;
  majorId?: number;
  page?: number;
  limit?: number;
}

export interface UpdateLecturerRoleInput {
  assignedRole: AssignableLecturerRole;
  majorId?: number | null;
  customPermissions?: string[];
}

export function useAdminLecturers(query: QueryAdminLecturersParams = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.role && query.role !== 'ALL') params.set('role', query.role);
  if (query.majorId) params.set('majorId', String(query.majorId));
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const search = params.toString();

  return useQuery({
    queryKey: ['lecturers', 'admin-roster', query],
    queryFn: () =>
      api<Paginated<AdminLecturerItem>>(
        `/lecturers/admin/roster${search ? `?${search}` : ''}`,
      ),
    staleTime: 10_000,
  });
}

export function useUpdateLecturerRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      ...input
    }: UpdateLecturerRoleInput & { userId: number }) =>
      api<{ success: boolean; assignedRole: AssignedLecturerRole }>(
        `/lecturers/admin/${userId}/role`,
        {
          method: 'PATCH',
          body: input,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLecturer(id: number | undefined) {
  return useQuery({
    queryKey: ['lecturers', id],
    queryFn: () => api<PublicLecturer>(`/lecturers/${id!}`),
    enabled: id !== undefined,
    staleTime: 5 * 60_000,
  });
}

export interface LecturerDirectoryQuery {
  q?: string;
  page?: number;
  limit?: number;
}

export function useLecturerDirectory(query: LecturerDirectoryQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const search = params.toString();

  return useQuery({
    queryKey: ['lecturers', 'directory', query],
    queryFn: () =>
      api<Paginated<LecturerDirectoryEntry>>(
        `/lecturers${search ? `?${search}` : ''}`,
      ),
    // Names and titles do not move; the mentoring load does, but a minute-old
    // count is only ever a warning that the API will repeat properly on submit.
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
