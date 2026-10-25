'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, request } from '@/lib/api/client';
import type {
  BulkImportResult,
  ColumnMapping,
  CommitImportResult,
  LecturerProfileDetail,
  LecturerProfileInput,
  ParseImportResult,
  PreviewImportResult,
  Role,
  StudentProfileDetail,
  StudentProfileInput,
  UserAccount,
  UserDetail,
  UsersPage,
} from '@/lib/api/types';

export interface UserQuery {
  role?: Role;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const userKeys = {
  all: ['users'] as const,
  list: (query: UserQuery) => [...userKeys.all, 'list', query] as const,
};

function toSearch(query: UserQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useUsers(query: UserQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => api<UsersPage>(`/users${toSearch(query)}`),
    placeholderData: (previous) => previous,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: userKeys.all });
}

export type CreateUserInput =
  | {
      role: 'STUDENT';
      email: string;
      studentCode: string;
      fullName: string;
      majorId?: number;
      class?: string;
      phone?: string;
    }
  | {
      role: 'LECTURER';
      email: string;
      lecturerCode: string;
      fullName: string;
      academicTitle?: string;
      researchInterests?: string;
      phone?: string;
    }
  | { role: 'ADMIN'; email: string };

export function useCreateUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      api<UserAccount>('/users', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export interface UserPatch {
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: ({ id, ...patch }: UserPatch & { id: number }) =>
      api<UserAccount>(`/users/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: invalidate,
  });
}

export function useDeactivateUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useHardDeleteUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/users/${id}/hard`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/users/${id}/reset-password`, {
        method: 'POST',
      }),
    onSuccess: invalidate,
  });
}

export function useBulkImportUsers() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);

      return api<BulkImportResult>('/users/bulk-import', {
        method: 'POST',
        body,
      });
    },
    onSuccess: invalidate,
  });
}

// ── Import Wizard hooks ────────────────────────────────────

/** Step 1: Upload file → receive headers + fuzzy suggestions + sessionId. */
export function useParseImport() {
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api<ParseImportResult>('/users/import/parse', {
        method: 'POST',
        body,
      });
    },
  });
}

/** Step 2: Dry-run validate with confirmed mapping. */
export function usePreviewImport() {
  return useMutation({
    mutationFn: ({
      sessionId,
      mapping,
    }: {
      sessionId: string;
      mapping: ColumnMapping;
    }) =>
      api<PreviewImportResult>('/users/import/preview', {
        method: 'POST',
        body: { sessionId, mapping },
      }),
  });
}

/** Step 3: Commit — create accounts in DB (no emails). */
export function useCommitImport() {
  return useMutation({
    mutationFn: ({
      sessionId,
      mapping,
    }: {
      sessionId: string;
      mapping: ColumnMapping;
    }) =>
      api<CommitImportResult>('/users/import/commit', {
        method: 'POST',
        body: { sessionId, mapping },
      }),
  });
}

/** Step 4: Send welcome emails for all committed accounts. */
export function useSendImportEmails() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (sessionId: string) =>
      api<{ sent: number; failed: number }>(
        `/users/import/${sessionId}/send-emails`,
        { method: 'POST' },
      ),
    onSuccess: invalidate,
  });
}

/** Download pre-filled Excel template as a blob and trigger browser download. */
export async function downloadImportTemplate(role: 'STUDENT' | 'LECTURER') {
  const response = await request(`/users/import/template?role=${role}`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import-template-${role.toLowerCase()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: [...userKeys.all, 'detail', id],
    queryFn: () => api<UserDetail>(`/users/${id!}`),
    enabled: id !== undefined,
  });
}

export function useUpsertStudentProfile() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: ({ id, ...input }: StudentProfileInput & { id: number }) =>
      api<StudentProfileDetail>(`/users/${id}/student-profile`, {
        method: 'PUT',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useUpsertLecturerProfile() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: ({ id, ...input }: LecturerProfileInput & { id: number }) =>
      api<LecturerProfileDetail>(`/users/${id}/lecturer-profile`, {
        method: 'PUT',
        body: input,
      }),
    onSuccess: async () => {
      await invalidate();
      // The mentoring quota decides whether this lecturer may accept another
      // proposal, and it is read by the directory the proposal form picks from
      // and by their own profile screen.
      await queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      await queryClient.invalidateQueries({ queryKey: ['me', 'profile'] });
    },
  });
}
