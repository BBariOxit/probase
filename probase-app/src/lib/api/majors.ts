'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CatalogueInput } from '@/lib/api/master-data';
import type { Major } from '@/lib/api/types';

const majorKeys = ['majors'] as const;

export function useMajors() {
  return useQuery({
    queryKey: majorKeys,
    queryFn: () => api<Major[]>('/majors'),
    // The same half hour as the rest of the master data: this changes when the
    // faculty opens a new specialisation, which is not often.
    staleTime: 30 * 60_000,
  });
}

function useInvalidateMajors() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: majorKeys });
}

export function useCreateMajor() {
  const invalidate = useInvalidateMajors();

  return useMutation({
    mutationFn: (input: CatalogueInput) =>
      api<Major>('/majors', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateMajor() {
  const invalidate = useInvalidateMajors();

  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<CatalogueInput> & { id: number }) =>
      api<Major>(`/majors/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: invalidate,
  });
}

export function useDeleteMajor() {
  const invalidate = useInvalidateMajors();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/majors/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
