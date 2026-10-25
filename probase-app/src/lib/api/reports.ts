'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, download } from '@/lib/api/client';
import type { FacultyReport } from '@/lib/api/types';

export function useFacultyReport(semesterId: number | undefined) {
  return useQuery({
    queryKey: ['reports', semesterId ?? 'active'],
    queryFn: () =>
      api<FacultyReport>(
        semesterId ? `/reports?semesterId=${semesterId}` : '/reports',
      ),
    placeholderData: (previous) => previous,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (semesterId: number | undefined) =>
      download(
        semesterId
          ? `/reports/export?semesterId=${semesterId}`
          : '/reports/export',
        'bao-cao-thong-ke.xlsx',
      ),
  });
}
