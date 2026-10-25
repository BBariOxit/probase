'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AuditLogEntry, Paginated } from '@/lib/api/types';

export interface AuditQuery {
  action?: string;
  userId?: number;
  targetTable?: string;
  page?: number;
  limit?: number;
}

function toSearch(query: AuditQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useAuditLogs(query: AuditQuery) {
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () =>
      api<Paginated<AuditLogEntry>>(`/audit-logs${toSearch(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: ['audit-logs', 'actions'],
    queryFn: () => api<string[]>('/audit-logs/actions'),
    staleTime: 5 * 60_000,
  });
}
