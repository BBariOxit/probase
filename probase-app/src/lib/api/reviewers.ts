import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  AutoAssignResult,
  MyReviewItem,
  ReviewAssignmentsOverviewResponse,
} from '@/lib/api/types';

export interface QueryReviewAssignmentsParams {
  semesterId?: number;
  roundId?: number;
  majorId?: number;
  status?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
  q?: string;
}

export function useReviewAssignmentsOverview(
  params?: QueryReviewAssignmentsParams,
  options?: { enabled?: boolean },
) {
  const searchParams = new URLSearchParams();
  if (params?.semesterId)
    searchParams.set('semesterId', String(params.semesterId));
  if (params?.roundId) searchParams.set('roundId', String(params.roundId));
  if (params?.majorId) searchParams.set('majorId', String(params.majorId));
  if (params?.status && params.status !== 'ALL')
    searchParams.set('status', params.status);
  if (params?.q) searchParams.set('q', params.q);

  const qs = searchParams.toString();
  const url = `/reviewers/assignments${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: ['reviewers', 'assignments', params],
    queryFn: () => api<ReviewAssignmentsOverviewResponse>(url),
    enabled: options?.enabled ?? true,
    placeholderData: (previous) => previous,
  });
}

export function useAssignReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { groupId: number; reviewerId: number }) =>
      api('/reviewers/assignments', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewers', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['reviewers', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility'] });
    },
  });
}

export function useUnassignReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: number) =>
      api(`/reviewers/assignments/${groupId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewers', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['reviewers', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility'] });
    },
  });
}

export function useAutoAssignReviewers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      semesterId?: number;
      roundId?: number;
      majorId?: number;
      maxReviewsPerLecturer?: number;
    }) =>
      api<AutoAssignResult>('/reviewers/assignments/auto', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewers', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['reviewers', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility'] });
    },
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: ['reviewers', 'mine'],
    queryFn: () => api<MyReviewItem[]>('/reviewers/mine'),
  });
}
