'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  LecturerDirectoryEntry,
  Paginated,
  PublicLecturer,
} from '@/lib/api/types';

export function useLecturer(id: number | undefined) {
  return useQuery({
    queryKey: ['lecturers', id],
    queryFn: () => api<PublicLecturer>(`/lecturers/${id!}`),
    enabled: id !== undefined,
    staleTime: 5 * 60_000,
  });
}

export interface LecturerDirectoryQuery {
  q?: string;
  page?: number;
  limit?: number;
}

export function useLecturerDirectory(query: LecturerDirectoryQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const search = params.toString();

  return useQuery({
    queryKey: ['lecturers', 'directory', query],
    queryFn: () =>
      api<Paginated<LecturerDirectoryEntry>>(
        `/lecturers${search ? `?${search}` : ''}`,
      ),
    // Names and titles do not move; the mentoring load does, but a minute-old
    // count is only ever a warning that the API will repeat properly on submit.
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
