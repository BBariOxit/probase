'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, download } from '@/lib/api/client';
import type {
  CommitEligibleImportResult,
  EligibleColumnMapping,
  EligibleNameMode,
  EligibleStudentsResponse,
  ImportEligibleStudentsResult,
  ParseEligibleImportResult,
  PreviewEligibleImportResult,
  ReanalyzeEligibleImportResult,
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
      qc.invalidateQueries({ queryKey: ['my-eligibility-status'] });
    },
  });
}

export function useParseEligibleImport() {
  return useMutation({
    mutationFn: async ({ roundId, file }: { roundId: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      return api<ParseEligibleImportResult>(
        `/rounds/${roundId}/eligible-students/import/parse`,
        {
          method: 'POST',
          body: formData,
        },
      );
    },
  });
}

export function useReanalyzeEligibleImport() {
  return useMutation({
    mutationFn: ({
      roundId,
      sessionId,
      headerRowIndex,
    }: {
      roundId: number;
      sessionId: string;
      headerRowIndex: number;
    }) =>
      api<ReanalyzeEligibleImportResult>(
        `/rounds/${roundId}/eligible-students/import/reanalyze`,
        {
          method: 'POST',
          body: { sessionId, headerRowIndex },
        },
      ),
  });
}

export function usePreviewEligibleImport() {
  return useMutation({
    mutationFn: ({
      roundId,
      sessionId,
      headerRowIndex,
      nameMode,
      mapping,
    }: {
      roundId: number;
      sessionId: string;
      headerRowIndex: number;
      nameMode: EligibleNameMode;
      mapping: EligibleColumnMapping;
    }) =>
      api<PreviewEligibleImportResult>(
        `/rounds/${roundId}/eligible-students/import/preview`,
        {
          method: 'POST',
          body: { sessionId, headerRowIndex, nameMode, mapping },
        },
      ),
  });
}

export function useCommitEligibleImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roundId,
      sessionId,
      headerRowIndex,
      nameMode,
      mapping,
    }: {
      roundId: number;
      sessionId: string;
      headerRowIndex: number;
      nameMode: EligibleNameMode;
      mapping: EligibleColumnMapping;
    }) =>
      api<CommitEligibleImportResult>(
        `/rounds/${roundId}/eligible-students/import/commit`,
        {
          method: 'POST',
          body: { sessionId, headerRowIndex, nameMode, mapping },
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['eligible-students', variables.roundId] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['my-eligibility-status'] });
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
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['my-eligibility-status'] });
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

export interface AddEligibleStudentInput {
  roundId: number;
  studentCode: string;
  fullName: string;
  class?: string | null;
  email?: string | null;
  majorId?: number | null;
  note?: string | null;
}

export function useAddEligibleStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundId, ...body }: AddEligibleStudentInput) => {
      return api<{
        success: boolean;
        studentId: number;
        studentCode: string;
        fullName: string;
        createdAccount: boolean;
      }>(`/rounds/${roundId}/eligible-students`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['eligible-students', variables.roundId] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['my-eligibility-status'] });
    },
  });
}
