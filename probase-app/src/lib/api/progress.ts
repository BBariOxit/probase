'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  LecturerGroupProgressItem,
  MyGroupProgressResponse,
  ProgressReportItem,
  WeeklyLogItem,
} from '@/lib/api/types';

export interface CreateWeeklyLogInput {
  weekNumber: number;
  title?: string;
  completionPercentage: number;
  gitCommitUrl?: string;
  summaryNotes: string;
  blockers?: string;
}

export interface UpdateWeeklyLogInput {
  title?: string;
  completionPercentage?: number;
  gitCommitUrl?: string;
  summaryNotes?: string;
  blockers?: string;
}

export interface FeedbackWeeklyLogInput {
  logId: number;
  lecturerComment?: string;
  isAcknowledged?: boolean;
}

export interface SubmitProgressReportInput {
  stage: 'STAGE_1' | 'STAGE_2';
  sourceCodeUrl?: string;
  reportFileUrl?: string;
  reportFileName?: string;
  file?: File | null;
}

export interface GradeProgressReportInput {
  groupId: number;
  stage: 'STAGE_1' | 'STAGE_2';
  grade: number;
  feedback?: string;
  workloadPercentage?: number;
  isPassed?: boolean;
}

export interface QueryLecturerProgressInput {
  semesterId?: number;
  roundId?: number;
}

export const progressKeys = {
  all: ['progress'] as const,
  myGroup: () => [...progressKeys.all, 'my-group'] as const,
  lecturerList: (query?: QueryLecturerProgressInput) =>
    [...progressKeys.all, 'lecturer', 'list', query] as const,
  lecturerDetail: (groupId: number) =>
    [...progressKeys.all, 'lecturer', 'detail', groupId] as const,
};

// ── Sinh viên ─────────────────────────────────────────────

export function useMyGroupProgress() {
  return useQuery({
    queryKey: progressKeys.myGroup(),
    queryFn: () => api<MyGroupProgressResponse>('/progress/my-group'),
  });
}

export function useCreateWeeklyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWeeklyLogInput) =>
      api<WeeklyLogItem>('/progress/weekly-logs', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

export function useUpdateWeeklyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWeeklyLogInput & { id: number }) =>
      api<WeeklyLogItem>(`/progress/weekly-logs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

export function useDeleteWeeklyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api<{ success: boolean; message: string }>(
        `/progress/weekly-logs/${id}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

export function useSubmitProgressReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stage, file, ...input }: SubmitProgressReportInput) => {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (input.sourceCodeUrl) formData.append('sourceCodeUrl', input.sourceCodeUrl);
        return api<ProgressReportItem>(`/progress/reports/${stage}`, {
          method: 'POST',
          body: formData,
        });
      }

      return api<ProgressReportItem>(`/progress/reports/${stage}`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

// ── Giảng viên ───────────────────────────────────────────

export function useLecturerGroupsProgress(query: QueryLecturerProgressInput = {}) {
  const params = new URLSearchParams();
  if (query.semesterId) params.set('semesterId', String(query.semesterId));
  if (query.roundId) params.set('roundId', String(query.roundId));
  const search = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: progressKeys.lecturerList(query),
    queryFn: () =>
      api<LecturerGroupProgressItem[]>(`/progress/lecturer/groups${search}`),
  });
}

export function useLecturerGroupProgressDetail(groupId: number) {
  return useQuery({
    queryKey: progressKeys.lecturerDetail(groupId),
    queryFn: () =>
      api<{
        group: any;
        isSupervisor: boolean;
        isReviewer: boolean;
        weeklyLogs: WeeklyLogItem[];
        progressReports: {
          stage1: ProgressReportItem | null;
          stage2: ProgressReportItem | null;
        };
      }>(`/progress/lecturer/groups/${groupId}`),
    enabled: !!groupId,
  });
}

export function useFeedbackWeeklyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ logId, ...input }: FeedbackWeeklyLogInput) =>
      api<WeeklyLogItem>(`/progress/lecturer/weekly-logs/${logId}/feedback`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

export function useGradeProgressReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, stage, ...input }: GradeProgressReportInput) =>
      api<ProgressReportItem>(
        `/progress/lecturer/groups/${groupId}/reports/${stage}/grade`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}
