import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  DefenseEligibilityOverviewResponse,
  GroupReviewsResponse,
  MyReviewWorkItem,
  SubmitTopicReviewInput,
  TopicReviewItem,
} from '@/lib/api/types';

export interface QueryDefenseEligibilityParams {
  roundId?: number;
  semesterId?: number;
  majorId?: number;
  search?: string;
  status?: 'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING';
  page?: number;
  limit?: number;
}

/**
 * Lấy các phiếu nhận xét và trạng thái điều kiện bảo vệ của một nhóm đồ án.
 */
export function useGroupReviews(groupId: number | null | undefined) {
  return useQuery({
    queryKey: ['reviews', 'group', groupId],
    queryFn: () => api<GroupReviewsResponse>(`/reviews/groups/${groupId}`),
    enabled: typeof groupId === 'number' && groupId > 0,
  });
}

/**
 * Danh sách các đề tài mà giảng viên cần lập hoặc đã lập phiếu nhận xét (GVHD hoặc GVPB).
 */
export function useMyReviews() {
  return useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: () => api<MyReviewWorkItem[]>('/reviews/mine'),
  });
}

/**
 * Bảng tổng hợp đối soát điều kiện bảo vệ toàn khoa (dành cho Giáo vụ, TTBM, BCN Khoa).
 */
export function useDefenseEligibility(params?: QueryDefenseEligibilityParams) {
  const searchParams = new URLSearchParams();
  if (params?.roundId) searchParams.set('roundId', String(params.roundId));
  if (params?.semesterId) searchParams.set('semesterId', String(params.semesterId));
  if (params?.majorId) searchParams.set('majorId', String(params.majorId));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status && params.status !== 'ALL')
    searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const url = `/reviews/eligibility${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: ['reviews', 'eligibility', params],
    queryFn: () => api<DefenseEligibilityOverviewResponse>(url),
  });
}

/**
 * Lấy chi tiết một phiếu nhận xét (để xem trước hoặc in biểu mẫu DLU).
 */
export function useReviewDetail(reviewId: number | null | undefined) {
  return useQuery({
    queryKey: ['reviews', 'detail', reviewId],
    queryFn: () => api<TopicReviewItem>(`/reviews/${reviewId}`),
    enabled: typeof reviewId === 'number' && reviewId > 0,
  });
}

/**
 * Mutation gửi hoặc cập nhật Phiếu nhận xét (M02/M04 cho GVHD, M05 cho GVPB).
 */
export function useSubmitTopicReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubmitTopicReviewInput) =>
      api<TopicReviewItem>('/reviews', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'group', variables.groupId],
      });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility'] });
      queryClient.invalidateQueries({ queryKey: ['lecturer-groups'] });
    },
  });
}

