'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { topicKeys } from '@/lib/api/topics';
import type { AllocationDesk } from '@/lib/api/types';

export const allocationKeys = {
  all: ['allocation'] as const,
  desk: (roundId: number) => [...allocationKeys.all, 'desk', roundId] as const,
};

export function useAllocationDesk(roundId: number | undefined) {
  return useQuery({
    queryKey: allocationKeys.desk(roundId ?? 0),
    queryFn: () => api<AllocationDesk>(`/rounds/${roundId!}/allocation`),
    enabled: roundId !== undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

function useInvalidateAllocation() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: allocationKeys.all }),
      queryClient.invalidateQueries({ queryKey: topicKeys.all }),
    ]);
  };
}

export interface PlacementInput {
  roundId: number;
  studentId: number;
  topicId: number;
}

export function usePlaceStudent() {
  const invalidate = useInvalidateAllocation();

  return useMutation({
    mutationFn: ({ roundId, ...body }: PlacementInput) =>
      api<{ groupId: number; message: string }>(
        `/rounds/${roundId}/allocation/placements`,
        { method: 'POST', body },
      ),
    onSuccess: invalidate,
  });
}

export function useUnplaceStudent() {
  const invalidate = useInvalidateAllocation();

  return useMutation({
    mutationFn: ({
      roundId,
      studentId,
    }: {
      roundId: number;
      studentId: number;
    }) =>
      api<{ message: string }>(
        `/rounds/${roundId}/allocation/placements/${studentId}`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidate,
  });
}

export interface FinalizeInput {
  roundId: number;
  acknowledgeUnplaced?: boolean;
  reason?: string;
}

export function useUnlockRound() {
  const invalidate = useInvalidateAllocation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roundId, reason }: { roundId: number; reason: string }) =>
      api<{ id: number }>(`/rounds/${roundId}/unlock`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rounds'] });
      await invalidate();
    },
  });
}

export function useFinalizeRound() {
  const invalidate = useInvalidateAllocation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roundId, ...body }: FinalizeInput) =>
      api<{ unplacedCount: number; message: string }>(
        `/rounds/${roundId}/allocation/finalize`,
        { method: 'POST', body },
      ),
    onSuccess: async () => {
      // The round's own phase moved, and it is read by the sidebar countdown
      // and every student screen that asks what stage the term is at.
      await queryClient.invalidateQueries({ queryKey: ['rounds'] });
      await invalidate();
    },
  });
}
