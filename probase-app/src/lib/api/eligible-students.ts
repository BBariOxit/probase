'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, download } from '@/lib/api/client';
import type {
  EligibleStudentsResponse,
  ImportEligibleStudentsResult,
  StudentEligibilityStatus,
} from '@/lib/api/types';

export interface EligibleStudentsQuery {
  class?: string;
  hasGroup?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

function toSearch(query: EligibleStudentsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function useEligibleStudents(
  roundId: number | undefined,
  query: EligibleStudentsQuery,
) {
  return useQuery({
    queryKey: ['eligible-students', roundId, query],
    queryFn: () =>
      api<EligibleStudentsResponse>(
        `/rounds/${roundId}/eligible-students${toSearch(query)}`,
      ),
    enabled: typeof roundId === 'number' && roundId > 0,
    placeholderData: (prev) => prev,
  });
}

export function useImportEligibleStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundId, file }: { roundId: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      return api<ImportEligibleStudentsResult>(
        `/rounds/${roundId}/eligible-students/import`,
        {
          method: 'POST',
          body: formData,
        },
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['eligible-students', variables.roundId] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export async function downloadEligibleTemplate(roundId?: number) {
  const endpoint = roundId
    ? `/rounds/${roundId}/eligible-students/template`
    : '/rounds/0/eligible-students/template';
  return download(endpoint, 'Mau_DS_SV_Du_Dieu_Kien.xlsx');
}

export function useRemoveEligibleStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roundId,
      studentId,
    }: {
      roundId: number;
      studentId: number;
    }) =>
      api<{ message: string }>(
        `/rounds/${roundId}/eligible-students/${studentId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['eligible-students', variables.roundId] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useMyEligibilityStatus() {
  return useQuery({
    queryKey: ['my-eligibility-status'],
    queryFn: () =>
      api<StudentEligibilityStatus>('/rounds/eligibility/my-status'),
    staleTime: 60 * 1000,
  });
}
