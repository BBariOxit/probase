import { api, download } from '@/lib/api/client';
import type {
  BulkOpenResult,
  DepartmentReviewInput,
  Paginated,
  SimilarityMatch,
  TopicDetail,
  TopicListItem,
  TopicStatus,
} from '@/lib/api/types';

export type ExportTopicsMode = 'SIGN_OFF' | 'FILTERED';

export interface TopicExportQuery {
  mode: ExportTopicsMode;
  semesterId?: number;
  projectTypeId?: number;
  lecturerId?: number;
  majorId?: number;
  status?: TopicStatus;
  q?: string;
  semesterCode?: string;
}

export interface TopicQuery {
  semesterId?: number;
  projectTypeId?: number;
  lecturerId?: number;
  majorId?: number;
  status?: TopicStatus;
  reviewStage?: 'DEPARTMENT' | 'ALL';
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
export type TopicTransition =
  | 'submit'
  | 'withdraw'
  | 'open'
  | 'close';

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

  getSimilarity(id: number) {
    return api<SimilarityMatch[]>(`/topics/${id}/similarity`);
  },

  submitDrafts(topicIds?: number[]) {
    return api<{
      count: number;
      approvedCount?: number;
      pendingCount?: number;
      message: string;
    }>('/topics/submit-drafts', {
      method: 'POST',
      body: { topicIds },
    });
  },

  bulkOpen(semesterId?: number) {
    return api<BulkOpenResult>('/topics/bulk-open', {
      method: 'PATCH',
      body: semesterId !== undefined ? { semesterId } : {},
    });
  },

  getLecturers(semesterId?: number) {
    return api<TopicLecturer[]>(
      `/topics/lecturers${semesterId ? `?semesterId=${semesterId}` : ''}`,
    );
  },

  exportExcel(query: TopicExportQuery) {
    const params = new URLSearchParams();
    params.set('mode', query.mode);

    if (query.semesterId !== undefined) {
      params.set('semesterId', String(query.semesterId));
    }

    if (query.mode === 'FILTERED') {
      if (query.projectTypeId !== undefined) {
        params.set('projectTypeId', String(query.projectTypeId));
      }
      if (query.lecturerId !== undefined) {
        params.set('lecturerId', String(query.lecturerId));
      }
      if (query.majorId !== undefined) {
        params.set('majorId', String(query.majorId));
      }
      if (query.status !== undefined) {
        params.set('status', query.status);
      }
      if (query.q) {
        params.set('q', query.q);
      }
    }

    const codeSuffix = query.semesterCode
      ? `-${query.semesterCode.toLowerCase()}`
      : '';
    const fallbackName =
      query.mode === 'SIGN_OFF'
        ? `trinh-ky-de-tai${codeSuffix}.xlsx`
        : `danh-sach-de-tai${codeSuffix}.xlsx`;

    return download(`/topics/export?${params.toString()}`, fallbackName);
  },
};
