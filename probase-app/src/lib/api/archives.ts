'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, download } from '@/lib/api/client';

export interface ArchiveTopicItem {
  id: number;
  title: string;
  titleVi?: string | null;
  titleEn?: string | null;
  description: string;
  status: string;
  maxStudents: number;
  major?: { id: number; name: string; code: string } | null;
  semester: { id: number; name: string; code: string };
  round: {
    id: number;
    projectType: { id: number; name: string; code: string };
  };
  lecturer: {
    id: number;
    fullName: string;
    academicTitle?: string | null;
    lecturerCode: string;
  };
  registrationGroups: Array<{
    id: number;
    name?: string | null;
    status: string;
    leader?: {
      id: number;
      fullName: string;
      studentCode: string;
      class?: string | null;
    };
    members: Array<{
      id: number;
      status: string;
      mentorGrade?: number | null;
      mentorComment?: string | null;
      student: {
        id: number;
        fullName: string;
        studentCode: string;
        class?: string | null;
      };
    }>;
    outline?: {
      id: number;
      status: string;
      attachmentUrl?: string | null;
      fileName?: string | null;
      fileSize?: number | null;
      approvedAt?: string | null;
    } | null;
    archive?: {
      id: number;
      sourceUrl: string;
      databaseUrl: string;
      thesisUrl: string;
      abstractVi?: string | null;
      abstractEn?: string | null;
      keywords?: string | null;
      isVerifiedBySupervisor: boolean;
      isVerifiedByAcademic: boolean;
      archivedAt?: string | null;
    } | null;
    studentGrades?: Array<{
      id: number;
      studentId: number;
      progress1Grade?: number | null;
      progress2Grade?: number | null;
      defenseGrade?: number | null;
      finalGradeNum?: number | null;
      finalGradeLetter?: string | null;
      note?: string | null;
      isLocked: boolean;
    }>;
    councilTopic?: {
      id: number;
      minuteNotes?: string | null;
      reviewer?: {
        id: number;
        fullName: string;
        academicTitle?: string | null;
      } | null;
      grades?: Array<{
        studentId: number;
        councilGrade?: number | null;
        reviewerGrade?: number | null;
        finalGrade?: number | null;
      }>;
    } | null;
  }>;
}

export interface ArchivesQuery {
  semesterId?: number;
  projectTypeId?: number;
  majorId?: number;
  status?: string;
  verified?: 'true' | 'false' | 'all';
  q?: string;
  page?: number;
  limit?: number;
}

export interface ArchivesResponse {
  items: ArchiveTopicItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useArchives(query: ArchivesQuery = {}) {
  const params = new URLSearchParams();
  if (query.semesterId) params.set('semesterId', String(query.semesterId));
  if (query.projectTypeId) params.set('projectTypeId', String(query.projectTypeId));
  if (query.majorId) params.set('majorId', String(query.majorId));
  if (query.status && query.status !== 'ALL') params.set('status', query.status);
  if (query.verified && query.verified !== 'all') params.set('verified', query.verified);
  if (query.q) params.set('q', query.q);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const endpoint = `/archives${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['archives', query],
    queryFn: () => api<ArchivesResponse>(endpoint),
    placeholderData: (previous) => previous,
  });
}

export function useArchiveDetail(id: number | null) {
  return useQuery({
    queryKey: ['archives', id],
    queryFn: () => api<ArchiveTopicItem>(`/archives/${id}`),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useVerifyArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      archiveId,
      isVerified,
    }: {
      archiveId: number;
      isVerified: boolean;
    }) =>
      api<{ id: number; isVerifiedByAcademic: boolean }>(
        `/archives/${archiveId}/verify`,
        {
          method: 'PATCH',
          body: { isVerified },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });
}

export function useExportArchives() {
  return useMutation({
    mutationFn: (query: ArchivesQuery) => {
      const params = new URLSearchParams();
      if (query.semesterId) params.set('semesterId', String(query.semesterId));
      if (query.projectTypeId) params.set('projectTypeId', String(query.projectTypeId));
      if (query.majorId) params.set('majorId', String(query.majorId));
      if (query.status && query.status !== 'ALL') params.set('status', query.status);
      if (query.verified && query.verified !== 'all') params.set('verified', query.verified);
      if (query.q) params.set('q', query.q);

      const qs = params.toString();
      return download(`/archives/export${qs ? `?${qs}` : ''}`, 'so-luu-tru-do-an.xlsx');
    },
  });
}
