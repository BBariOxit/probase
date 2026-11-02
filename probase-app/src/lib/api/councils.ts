import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export type CouncilMemberRole = 'PRESIDENT' | 'SECRETARY' | 'MEMBER';
export type CouncilStatus = 'PREP' | 'IN_PROGRESS' | 'COMPLETED';
export type CouncilTopicStatus = 'SCHEDULED' | 'DEFENDING' | 'COMPLETED';

export interface CouncilMemberItem {
  id: number;
  lecturerId: number;
  councilRole: CouncilMemberRole;
  lecturer: {
    id: number;
    fullName: string;
    academicTitle?: string | null;
    lecturerCode?: string | null;
  };
}

export interface CouncilEvaluationItem {
  lecturerId: number;
  lecturerName: string;
  role: CouncilMemberRole;
  score: number;
  feedback?: string | null;
  submittedAt: string;
}

export interface CouncilTopicItem {
  id: number;
  councilId: number;
  topicId: number;
  groupId: number;
  timeSlot?: string | null;
  defenseOrder: number;
  status: CouncilTopicStatus;
  isLocked: boolean;
  minuteNotes?: string | null;
  topic: {
    id: number;
    title: string;
    englishTitle?: string | null;
    major?: { id: number; name: string; code: string } | null;
    lecturer: { id: number; fullName: string; academicTitle?: string | null };
  };
  reviewer?: { id: number; fullName: string; academicTitle?: string | null } | null;
  group: {
    id: number;
    name?: string | null;
    leader: { id: number; fullName: string; studentCode: string; class?: string | null };
    members: Array<{ id: number; fullName: string; studentCode: string; class?: string | null }>;
    latestSubmission?: {
      id: number;
      fileName?: string | null;
      fileUrl?: string | null;
      submissionUrl?: string | null;
      submittedAt: string;
    } | null;
    studentGrades?: Array<{
      studentId: number;
      progress1Grade?: number | null;
      progress2Grade?: number | null;
      defenseGrade?: number | null;
      finalGradeNum?: number | null;
      finalGradeLetter?: string | null;
      isLocked?: boolean;
    }>;
  };
  evaluationSummary?: {
    totalMembers: number;
    evaluatedCount: number;
    isFullyEvaluated?: boolean;
    avgScore?: number | null;
  };
  myEvaluation?: {
    score: number;
    feedback?: string | null;
    submittedAt: string;
  } | null;
}

export interface CouncilListItem {
  id: number;
  name: string;
  location?: string | null;
  defenseDate: string;
  status: CouncilStatus;
  semester: { id: number; name: string; code: string; isActive: boolean };
  major?: { id: number; name: string; code: string } | null;
  members: CouncilMemberItem[];
  stats: {
    totalTopics: number;
    completedTopics: number;
  };
}

export interface CouncilDetailResponse extends CouncilListItem {
  topics: CouncilTopicItem[];
}

export interface EligibleGroupItem {
  id: number;
  name?: string | null;
  topic: {
    id: number;
    title: string;
    major?: { id: number; name: string; code: string } | null;
    lecturer: { id: number; fullName: string; academicTitle?: string | null };
  };
  supervisor: { id: number; fullName: string; academicTitle?: string | null } | null;
  reviewer: { id: number; fullName: string; academicTitle?: string | null } | null;
  members: Array<{ id: number; fullName: string; studentCode: string; class?: string | null }>;
}

export interface MyCouncilItem {
  councilId: number;
  name: string;
  location?: string | null;
  defenseDate: string;
  status: CouncilStatus;
  semester: { id: number; name: string; code: string };
  major?: { id: number; name: string; code: string } | null;
  myRole: CouncilMemberRole;
  members: Array<{
    lecturerId: number;
    fullName: string;
    academicTitle?: string | null;
    councilRole: CouncilMemberRole;
  }>;
  topics: CouncilTopicItem[];
}

export interface QueryCouncilsParams {
  semesterId?: number;
  majorId?: number;
  search?: string;
  status?: 'ALL' | CouncilStatus;
}

export interface CreateCouncilInput {
  name: string;
  semesterId: number;
  majorId?: number | null;
  location: string;
  defenseDate: string;
}

export interface UpdateCouncilInput {
  name?: string;
  majorId?: number | null;
  location?: string;
  defenseDate?: string;
  status?: CouncilStatus;
}

export interface AddCouncilMemberInput {
  lecturerId: number;
  councilRole: CouncilMemberRole;
}

export interface ScheduleCouncilTopicInput {
  groupId: number;
  timeSlot?: string | null;
  defenseOrder?: number;
}

export interface SubmitCouncilEvaluationInput {
  score: number;
  feedback?: string | null;
}

export interface FinalizeCouncilTopicInput {
  minuteNotes?: string | null;
  isLocked?: boolean;
}

// ─────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────

export function useCouncils(params?: QueryCouncilsParams) {
  const searchParams = new URLSearchParams();
  if (params?.semesterId) searchParams.set('semesterId', String(params.semesterId));
  if (params?.majorId) searchParams.set('majorId', String(params.majorId));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status && params.status !== 'ALL')
    searchParams.set('status', params.status);

  const qs = searchParams.toString();
  const url = `/councils${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: ['councils', params],
    queryFn: () => api<CouncilListItem[]>(url),
  });
}

export function useCouncilDetail(id: number | null | undefined) {
  return useQuery({
    queryKey: ['councils', id],
    queryFn: () => api<CouncilDetailResponse>(`/councils/${id}`),
    enabled: typeof id === 'number' && id > 0,
  });
}

export function useEligibleGroupsForCouncil(semesterId?: number, majorId?: number) {
  const searchParams = new URLSearchParams();
  if (semesterId) searchParams.set('semesterId', String(semesterId));
  if (majorId) searchParams.set('majorId', String(majorId));

  const qs = searchParams.toString();
  const url = `/councils/eligible-groups${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: ['councils', 'eligible-groups', semesterId, majorId],
    queryFn: () => api<EligibleGroupItem[]>(url),
  });
}

export function useMyCouncils() {
  return useQuery({
    queryKey: ['councils', 'my-councils'],
    queryFn: () => api<MyCouncilItem[]>('/councils/my-councils'),
  });
}

export function useCreateCouncil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCouncilInput) =>
      api<CouncilListItem>('/councils', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}

export function useUpdateCouncil(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCouncilInput) =>
      api<CouncilListItem>(`/councils/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}

export function useDeleteCouncil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<{ message: string }>(`/councils/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}

export function useAddCouncilMember(councilId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCouncilMemberInput) =>
      api<CouncilMemberItem>(`/councils/${councilId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils', councilId] });
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}

export function useRemoveCouncilMember(councilId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lecturerId: number) =>
      api<{ message: string }>(`/councils/${councilId}/members/${lecturerId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils', councilId] });
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}

export function useScheduleCouncilTopic(councilId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleCouncilTopicInput) =>
      api<CouncilTopicItem>(`/councils/${councilId}/topics`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils', councilId] });
      queryClient.invalidateQueries({ queryKey: ['councils', 'eligible-groups'] });
    },
  });
}

export function useRemoveCouncilTopic(councilId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (councilTopicId: number) =>
      api<{ message: string }>(`/councils/${councilId}/topics/${councilTopicId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils', councilId] });
      queryClient.invalidateQueries({ queryKey: ['councils', 'eligible-groups'] });
    },
  });
}

export function useEvaluateCouncilTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      councilTopicId,
      data,
    }: {
      councilTopicId: number;
      data: SubmitCouncilEvaluationInput;
    }) =>
      api<{ message: string; evaluationSummary: any }>(
        `/councils/topics/${councilTopicId}/evaluate`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}

export function useFinalizeCouncilTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      councilTopicId,
      data,
    }: {
      councilTopicId: number;
      data: FinalizeCouncilTopicInput;
    }) =>
      api<{ message: string }>(
        `/councils/topics/${councilTopicId}/finalize`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['councils'] });
    },
  });
}
