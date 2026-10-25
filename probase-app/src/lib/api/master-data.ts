'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  ProjectType,
  ProjectTypeDetail,
  RegistrationRound,
  RoundPlanInput,
  Semester,
  SubmissionRequirement,
} from '@/lib/api/types';

const MASTER_DATA_STALE_TIME = 30 * 60_000;

export function useSemesters() {
  return useQuery({
    queryKey: ['semesters'],
    queryFn: () => api<Semester[]>('/semesters'),
    staleTime: MASTER_DATA_STALE_TIME,
  });
}

export function useProjectTypes() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: () => api<ProjectType[]>('/project-types'),
    staleTime: MASTER_DATA_STALE_TIME,
  });
}

export function useActiveSemester(): Semester | undefined {
  const { data } = useSemesters();
  return data?.find((semester) => semester.isActive);
}

export function useMyRounds(semesterId: number | undefined) {
  return useQuery({
    queryKey: ['rounds', semesterId, 'mine'],
    queryFn: () =>
      api<RegistrationRound[]>(`/rounds?semesterId=${semesterId!}&mine=true`),
    enabled: semesterId !== undefined,
    // Shorter than the rest of the master data: this is the countdown a student
    // reads before deciding whether they still have time, and the phase can move
    // between two page loads.
    staleTime: 60_000,
  });
}

export function useRoundsForSemester(semesterId: number | undefined) {
  return useQuery({
    queryKey: ['rounds', semesterId, 'all'],
    queryFn: () =>
      api<RegistrationRound[]>(`/rounds?semesterId=${semesterId!}`),
    enabled: semesterId !== undefined,
    // The same minute as the student view, and for the same reason: this is
    // where somebody reads which stage a round has reached before acting on it.
    staleTime: 60_000,
  });
}

export function useMyRound(semesterId: number | undefined) {
  const { data } = useMyRounds(semesterId);

  return data?.[0];
}

export function useMyEligibleProjectTypes(semesterId: number | undefined) {
  return useQuery({
    queryKey: ['semesters', semesterId, 'eligibility', 'mine'],
    queryFn: () =>
      api<ProjectType[]>(`/semesters/${semesterId!}/eligibility/mine`),
    enabled: semesterId !== undefined,
    staleTime: MASTER_DATA_STALE_TIME,
  });
}

// ── the office's side of the same data ──────────────────────

function useInvalidate(key: readonly unknown[]) {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: key });
}

export interface SemesterInput {
  name: string;
  code: string;

  startDate: string;
  endDate: string;
  gradeSubmissionDeadline?: string | null;
}

export function useCreateSemester() {
  const invalidate = useInvalidate(['semesters']);

  return useMutation({
    mutationFn: (input: SemesterInput) =>
      api<Semester>('/semesters', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateSemester() {
  const invalidate = useInvalidate(['semesters']);

  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<SemesterInput> & { id: number }) =>
      api<Semester>(`/semesters/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: invalidate,
  });
}

export function useDeleteSemester() {
  const invalidate = useInvalidate(['semesters']);

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/semesters/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useActivateSemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api<Semester>(`/semesters/${id}/activate`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useSemesterRounds(semesterId: number | undefined) {
  return useQuery({
    queryKey: ['semesters', semesterId, 'rounds'],
    queryFn: () => api<RegistrationRound[]>(`/semesters/${semesterId!}/rounds`),
    enabled: semesterId !== undefined,
  });
}

export function useSetSemesterRounds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      semesterId,
      rounds,
    }: {
      semesterId: number;
      rounds: RoundPlanInput[];
    }) =>
      api<RegistrationRound[]>(`/semesters/${semesterId}/rounds`, {
        method: 'PUT',
        body: { rounds },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rounds'] }),
  });
}

export interface CatalogueInput {
  name: string;
  code: string;
}

export function useCreateProjectType() {
  const invalidate = useInvalidate(['project-types']);

  return useMutation({
    mutationFn: (input: CatalogueInput) =>
      api<ProjectType>('/project-types', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectType() {
  const invalidate = useInvalidate(['project-types']);

  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<CatalogueInput> & { id: number }) =>
      api<ProjectType>(`/project-types/${id}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteProjectType() {
  const invalidate = useInvalidate(['project-types']);

  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/project-types/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useProjectTypeDetails() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: () => api<ProjectTypeDetail[]>('/project-types'),
    staleTime: MASTER_DATA_STALE_TIME,
  });
}

export function useRoundRequirements(roundId: number | undefined) {
  return useQuery({
    queryKey: ['rounds', roundId, 'requirements'],
    queryFn: () =>
      api<SubmissionRequirement[]>(`/rounds/${roundId!}/requirements`),
    enabled: roundId !== undefined,
    staleTime: 60_000,
  });
}

export interface RequirementInput {
  id?: number;
  name: string;

  dueAt: string;
  isRequired: boolean;
}

export function useSetRoundRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roundId,
      requirements,
    }: {
      roundId: number;
      requirements: RequirementInput[];
    }) =>
      api<SubmissionRequirement[]>(`/rounds/${roundId}/requirements`, {
        method: 'PUT',
        body: { requirements },
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['rounds', variables.roundId, 'requirements'],
      });
      // A student's own group screen carries the same list.
      await queryClient.invalidateQueries({ queryKey: ['registration'] });
    },
  });
}
