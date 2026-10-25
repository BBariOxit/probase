'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Paginated, Submission } from '@/lib/api/types';

export interface SubmissionQuery {
  requirementId?: number;

  groupId?: number;
  topicId?: number;
  page?: number;
  limit?: number;
}

export const submissionKeys = {
  all: ['submissions'] as const,
  list: (query: SubmissionQuery) =>
    [...submissionKeys.all, 'list', query] as const,
};

function toSearch(query: SubmissionQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useSubmissions(query: SubmissionQuery = {}) {
  return useQuery({
    queryKey: submissionKeys.list(query),
    queryFn: () => api<Paginated<Submission>>(`/submissions${toSearch(query)}`),
    placeholderData: (previous) => previous,
  });
}

function useInvalidateSubmissions() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: submissionKeys.all });
}

export interface SubmissionInput {
  requirementId: number;

  submissionUrl?: string;
  file?: File | null;
}

export function useCreateSubmission() {
  const invalidate = useInvalidateSubmissions();

  return useMutation({
    mutationFn: (input: SubmissionInput) => {
      const body = new FormData();
      body.append('requirementId', String(input.requirementId));
      if (input.submissionUrl)
        body.append('submissionUrl', input.submissionUrl);
      if (input.file) body.append('file', input.file);

      return api<Submission>('/submissions', { method: 'POST', body });
    },
    onSuccess: invalidate,
  });
}

export function useSubmissionFeedback() {
  const invalidate = useInvalidateSubmissions();

  return useMutation({
    mutationFn: ({ id, feedback }: { id: number; feedback: string }) =>
      api<Submission>(`/submissions/${id}/feedback`, {
        method: 'POST',
        body: { feedback },
      }),
    onSuccess: invalidate,
  });
}
