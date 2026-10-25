'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { topicKeys } from '@/lib/api/topics';
import type { Paginated, ProposalStatus, TopicProposal } from '@/lib/api/types';

export interface ProposalQuery {
  status?: ProposalStatus;
  semesterId?: number;
  page?: number;
  limit?: number;
}

export const proposalKeys = {
  all: ['proposals'] as const,
  lists: () => [...proposalKeys.all, 'list'] as const,
  list: (query: ProposalQuery) => [...proposalKeys.lists(), query] as const,
  detail: (id: number) => [...proposalKeys.all, 'detail', id] as const,
};

function toSearch(query: ProposalQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useProposals(query: ProposalQuery = {}) {
  return useQuery({
    queryKey: proposalKeys.list(query),
    queryFn: () =>
      api<Paginated<TopicProposal>>(`/proposals${toSearch(query)}`),
    // Keeps the current page on screen while the next one loads, so filtering
    // does not empty the list and jump the page.
    placeholderData: (previous) => previous,
  });
}

export function useProposal(id: number) {
  return useQuery({
    queryKey: proposalKeys.detail(id),
    queryFn: () => api<TopicProposal>(`/proposals/${id}`),
  });
}

function useInvalidateProposals() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: proposalKeys.all }),
      queryClient.invalidateQueries({ queryKey: topicKeys.all }),
    ]);
  };
}

export interface ProposalInput {
  projectTypeId: number;
  requestedLecturerId: number;
  title: string;
  description: string;
  expectedOutcomes: string;
}

export function useCreateProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: (input: ProposalInput) =>
      api<TopicProposal>('/proposals', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export type ProposalPatch = Partial<
  Pick<ProposalInput, 'title' | 'description' | 'expectedOutcomes'>
>;

export function useUpdateProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, ...patch }: ProposalPatch & { id: number }) =>
      api<TopicProposal>(`/proposals/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: invalidate,
  });
}

export function useWithdrawProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/proposals/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useAcceptProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, maxStudents }: { id: number; maxStudents: number }) =>
      api<TopicProposal>(`/proposals/${id}/accept`, {
        method: 'POST',
        body: { maxStudents },
      }),
    onSuccess: invalidate,
  });
}

export function useRejectProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, feedback }: { id: number; feedback: string }) =>
      api<TopicProposal>(`/proposals/${id}/reject`, {
        method: 'POST',
        body: { feedback },
      }),
    onSuccess: invalidate,
  });
}
