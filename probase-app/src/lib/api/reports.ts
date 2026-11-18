'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, download } from '@/lib/api/client';
import type { FacultyReport } from '@/lib/api/types';

function buildReportQuery(semesterId?: number, roundId?: number) {
  const params = new URLSearchParams();
  if (semesterId) params.set('semesterId', String(semesterId));
  if (roundId) params.set('roundId', String(roundId));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useFacultyReport(
  semesterId: number | undefined,
  roundId?: number,
) {
  return useQuery({
    queryKey: ['reports', semesterId ?? 'active', roundId ?? 'all'],
    queryFn: () =>
      api<FacultyReport>(`/reports${buildReportQuery(semesterId, roundId)}`),
    placeholderData: (previous) => previous,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: ({
      semesterId,
      roundId,
    }: {
      semesterId?: number;
      roundId?: number;
    }) =>
      download(
        `/reports/export${buildReportQuery(semesterId, roundId)}`,
        'bao-cao-thong-ke.xlsx',
      ),
  });
}
