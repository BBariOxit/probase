'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, download } from '@/lib/api/client';
import type { Paginated, StudentRosterRow } from '@/lib/api/types';

export interface StudentQuery {
  semesterId?: number;
  roundId?: number;
  cohort?: string;
  majorId?: number;
  class?: string;
  lecturerId?: number;

  hasGroup?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

function toSearch(query: StudentQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useStudents(query: StudentQuery) {
  return useQuery({
    queryKey: ['students', query],
    queryFn: () =>
      api<Paginated<StudentRosterRow>>(`/students${toSearch(query)}`),
    placeholderData: (previous) => previous,
  });
}

export function useExportStudents() {
  return useMutation({
    mutationFn: (query: StudentQuery) =>
      download(
        `/students/export${toSearch({ ...query, page: undefined, limit: undefined })}`,
        'danh-sach-sinh-vien.xlsx',
      ),
  });
}
