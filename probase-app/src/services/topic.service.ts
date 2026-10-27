import { api } from '@/lib/api/client';
import type {
  BulkOpenResult,
  DepartmentReviewInput,
  FacultyReviewInput,
  Paginated,
  SimilarityMatch,
  TopicDetail,
  TopicListItem,
  TopicStatus,
} from '@/lib/api/types';

export interface TopicQuery {
  semesterId?: number;
  projectTypeId?: number;
  lecturerId?: number;
  majorId?: number;
  status?: TopicStatus;
  reviewStage?: 'DEPARTMENT' | 'FACULTY' | 'ALL';
  q?: string;
  mine?: boolean;
  forMyCohort?: boolean;
  page?: number;
  limit?: number;
}

export interface TopicLecturer {
  id: number;
  fullName: string;
  academicTitle: string | null;
}

export interface TopicInput {
  semesterId: number;
  projectTypeId: number;
  majorId?: number;
  title: string;
  description: string;
  objectives?: string;
  expectedOutcomes: string;
  techStack?: string;
  maxStudents: number;
}

export type TopicPatch = Partial<Omit<TopicInput, 'semesterId'>>;
export type TopicTransition = 'submit' | 'approve' | 'open' | 'close';

function toSearchParams(query: TopicQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export const topicService = {
  getAll(query: TopicQuery = {}) {
    return api<Paginated<TopicListItem>>(`/topics${toSearchParams(query)}`);
  },

  getById(id: number) {
    return api<TopicDetail>(`/topics/${id}`);
  },

  create(input: TopicInput) {
    return api<TopicDetail>('/topics', {
      method: 'POST',
      body: input,
    });
  },

  update(id: number, patch: TopicPatch) {
    return api<TopicDetail>(`/topics/${id}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  delete(id: number) {
    return api<{ message: string }>(`/topics/${id}`, {
      method: 'DELETE',
    });
  },

  transition(id: number, to: TopicTransition) {
    return api<TopicDetail>(`/topics/${id}/${to}`, {
      method: 'PATCH',
    });
  },

  reviewDepartment(id: number, input: DepartmentReviewInput) {
    return api<TopicDetail>(`/topics/${id}/department-review`, {
      method: 'PATCH',
      body: input,
    });
  },

  reviewFaculty(id: number, input: FacultyReviewInput) {
    return api<TopicDetail>(`/topics/${id}/faculty-review`, {
      method: 'PATCH',
      body: input,
    });
  },

  getSimilarity(id: number) {
    return api<SimilarityMatch[]>(`/topics/${id}/similarity`);
  },

  submitDrafts(topicIds?: number[]) {
    return api<{ count: number; message: string }>('/topics/submit-drafts', {
      method: 'POST',
      body: { topicIds },
    });
  },

  bulkOpen(semesterId: number) {
    return api<BulkOpenResult>('/topics/bulk-open', {
      method: 'PATCH',
      body: { semesterId },
    });
  },

  getLecturers(semesterId?: number) {
    return api<TopicLecturer[]>(
      `/topics/lecturers${semesterId ? `?semesterId=${semesterId}` : ''}`,
    );
  },
};
