'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { topicKeys } from '@/lib/api/topics';
import type { JoinPreview, RegistrationGroup } from '@/lib/api/types';

export const groupKeys = {
  all: ['registration-groups'] as const,
  mine: () => [...groupKeys.all, 'mine'] as const,
  supervised: (semesterId?: number) =>
    [...groupKeys.all, 'supervised', semesterId] as const,
  detail: (id: number) => [...groupKeys.all, 'detail', id] as const,
  preview: (code: string) => [...groupKeys.all, 'preview', code] as const,
};

function useInvalidateRegistration() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      queryClient.invalidateQueries({ queryKey: topicKeys.all }),
    ]);
  };
}

export function useMyGroup() {
  return useQuery({
    queryKey: groupKeys.mine(),
    queryFn: () => api<RegistrationGroup | null>('/registration-groups/me'),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSupervisedGroups(semesterId?: number) {
  const params = semesterId ? `?semesterId=${semesterId}` : '';

  return useQuery({
    queryKey: groupKeys.supervised(semesterId),
    queryFn: () =>
      api<RegistrationGroup[]>(`/registration-groups/my-supervised${params}`),
    staleTime: 2 * 60_000,
  });
}

export function useGroup(id: number | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(id ?? 0),
    queryFn: () => api<RegistrationGroup>(`/registration-groups/${id!}`),
    enabled: id !== undefined,
  });
}

export interface RegisterTopicInput {
  topicId: number;

  declaredSize?: number;
  name?: string;
}

export function useRegisterTopic() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: ({ topicId, ...body }: RegisterTopicInput) =>
      api<RegistrationGroup>(`/topics/${topicId}/register`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(groupKeys.mine(), data);
      return invalidate();
    },
  });
}

export function useJoinTopic() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: (topicId: number) =>
      api<RegistrationGroup>(`/topics/${topicId}/join`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(groupKeys.mine(), data);
      return invalidate();
    },
  });
}

export function useJoinPreview(code: string) {
  return useQuery({
    queryKey: groupKeys.preview(code),
    queryFn: () =>
      api<JoinPreview>(`/registration-groups/join/${encodeURIComponent(code)}`),
    staleTime: 0,
    retry: false,
  });
}

export function useJoinByCode() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: (code: string) =>
      api<RegistrationGroup>(
        `/registration-groups/join/${encodeURIComponent(code)}`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(groupKeys.mine(), data);
      return invalidate();
    },
  });
}

export interface GroupPatch {
  name?: string | null;
  openForJoin?: boolean;

  declaredSize?: number | null;

  releaseHold?: true;

  leaderId?: number;
}

export function useUpdateGroup(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: (patch: GroupPatch) =>
      api<RegistrationGroup>(`/registration-groups/${id}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(groupKeys.mine(), data);
      return invalidate();
    },
  });
}

export function useLeaveGroup(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: () =>
      api<{ message: string }>(`/registration-groups/${id}/leave`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.setQueryData(groupKeys.mine(), null);
      return invalidate();
    },
  });
}

export function useRemoveMember(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: (studentId: number) =>
      api<RegistrationGroup>(
        `/registration-groups/${id}/members/${studentId}`,
        { method: 'DELETE' },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(groupKeys.mine(), data);
      return invalidate();
    },
  });
}

export function useDisbandGroup(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistration();

  return useMutation({
    mutationFn: () =>
      api<{ message: string }>(`/registration-groups/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.setQueryData(groupKeys.mine(), null);
      return invalidate();
    },
  });
}
