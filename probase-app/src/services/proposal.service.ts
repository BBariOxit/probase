import { api } from '@/lib/api/client';
import type {
  Paginated,
  ProposalAttachment,
  ProposalComment,
  ProposalStatus,
  TopicProposal,
} from '@/lib/api/types';

export interface ProposalQuery {
  status?: ProposalStatus;
  semesterId?: number;
  page?: number;
  limit?: number;
}

export interface ProposalInput {
  projectTypeId: number;
  requestedLecturerId: number;
  title: string;
  description: string;
  expectedOutcomes: string;
  isDraft?: boolean;
}

export type ProposalPatch = Partial<
  Pick<ProposalInput, 'title' | 'description' | 'expectedOutcomes'>
>;

function toSearch(query: ProposalQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

export const proposalService = {
  getAll(query: ProposalQuery = {}) {
    return api<Paginated<TopicProposal>>(`/proposals${toSearch(query)}`);
  },

  getById(id: number) {
    return api<TopicProposal>(`/proposals/${id}`);
  },

  create(input: ProposalInput) {
    return api<TopicProposal>('/proposals', {
      method: 'POST',
      body: input,
    });
  },

  update(id: number, patch: ProposalPatch) {
    return api<TopicProposal>(`/proposals/${id}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  submit(id: number) {
    return api<TopicProposal>(`/proposals/${id}/submit`, {
      method: 'POST',
    });
  },

  withdraw(id: number) {
    return api<{ message: string }>(`/proposals/${id}`, {
      method: 'DELETE',
    });
  },

  accept(id: number, input: { maxStudents?: number } = {}) {
    return api<TopicProposal>(`/proposals/${id}/accept`, {
      method: 'POST',
      body: input,
    });
  },

  reject(id: number, input: { feedback: string }) {
    return api<TopicProposal>(`/proposals/${id}/reject`, {
      method: 'POST',
      body: input,
    });
  },

  addComment(id: number, input: { content: string }) {
    return api<ProposalComment>(`/proposals/${id}/comments`, {
      method: 'POST',
      body: input,
    });
  },

  uploadAttachment(id: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return api<ProposalAttachment>(`/proposals/${id}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteAttachment(proposalId: number, attachmentId: number) {
    return api<{ message: string }>(
      `/proposals/${proposalId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
    );
  },
};
