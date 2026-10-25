'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { NotificationPage } from '@/lib/api/types';

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (query: NotificationQuery) =>
    [...notificationKeys.all, 'list', query] as const,
};

function toSearch(query: NotificationQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.unreadOnly) params.set('unreadOnly', 'true');

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useNotifications(query: NotificationQuery = {}) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => api<NotificationPage>(`/notifications${toSearch(query)}`),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: () =>
      api<{ message: string }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: invalidate,
  });
}
