import { api } from '@/lib/api/client';
import type {
  FacultyOutlineOverview,
  LecturerGroupOutlineItem,
  Paginated,
  StudentGroupOutlineResponse,
  TopicOutline,
} from '@/lib/api/types';

export interface OutlineQuery {
  semesterId?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function toSearchParams(query: OutlineQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

export const outlineService = {
  // Lấy thông tin nhóm & đề cương của SV đang đăng nhập
  getMyGroupOutline: () =>
    api<StudentGroupOutlineResponse>('/outlines/my-outline'),

  // Nộp file scan đề cương M03
  submitOutline: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<TopicOutline>('/outlines/submit', {
      method: 'POST',
      body: formData,
    });
  },

  // GVHD: Lấy danh sách đề cương nhóm mình hướng dẫn
  getLecturerOutlines: (query: OutlineQuery = {}) =>
    api<Paginated<LecturerGroupOutlineItem>>(
      `/outlines/lecturer${toSearchParams(query)}`,
    ),

  // GVHD: Duyệt hoặc Yêu cầu sửa
  reviewOutline: (
    id: number,
    data: { action: 'APPROVE' | 'REQUEST_REVISION'; feedback?: string },
  ) =>
    api<TopicOutline>(`/outlines/${id}/review`, {
      method: 'PATCH',
      body: data,
    }),

  // TLGV & BCN Khoa: Tổng hợp toàn Khoa
  getFacultyOutlines: (query: OutlineQuery = {}) =>
    api<FacultyOutlineOverview>(`/outlines/faculty${toSearchParams(query)}`),
};
