'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { topicKeys } from '@/lib/api/topics';
import {
  proposalService,
  type ProposalInput,
  type ProposalPatch,
  type ProposalQuery,
} from '@/services/proposal.service';

export type { ProposalInput, ProposalPatch, ProposalQuery };

export const proposalKeys = {
  all: ['proposals'] as const,
  lists: () => [...proposalKeys.all, 'list'] as const,
  list: (query: ProposalQuery) => [...proposalKeys.lists(), query] as const,
  detail: (id: number) => [...proposalKeys.all, 'detail', id] as const,
};

export function useProposals(query: ProposalQuery = {}) {
  return useQuery({
    queryKey: proposalKeys.list(query),
    queryFn: () => proposalService.getAll(query),
    // Keeps the current page on screen while the next one loads, so filtering
    // does not empty the list and jump the page.
    placeholderData: (previous) => previous,
  });
}

export function useProposal(id: number) {
  return useQuery({
    queryKey: proposalKeys.detail(id),
    queryFn: () => proposalService.getById(id),
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

export function useCreateProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: (input: ProposalInput) => proposalService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, ...patch }: ProposalPatch & { id: number }) =>
      proposalService.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useSubmitProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: (id: number) => proposalService.submit(id),
    onSuccess: invalidate,
  });
}

export function useWithdrawProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: (id: number) => proposalService.withdraw(id),
    onSuccess: invalidate,
  });
}

export function useAcceptProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, maxStudents }: { id: number; maxStudents: number }) =>
      proposalService.accept(id, { maxStudents }),
    onSuccess: invalidate,
  });
}

export function useRejectProposal() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, feedback }: { id: number; feedback: string }) =>
      proposalService.reject(id, { feedback }),
    onSuccess: invalidate,
  });
}

export function useCreateProposalComment() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      proposalService.addComment(id, { content }),
    onSuccess: invalidate,
  });
}

export function useUploadProposalAttachment() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      proposalService.uploadAttachment(id, file),
    onSuccess: invalidate,
  });
}

export function useDeleteProposalAttachment() {
  const invalidate = useInvalidateProposals();

  return useMutation({
    mutationFn: ({
      proposalId,
      attachmentId,
    }: {
      proposalId: number;
      attachmentId: number;
    }) => proposalService.deleteAttachment(proposalId, attachmentId),
    onSuccess: invalidate,
  });
}
