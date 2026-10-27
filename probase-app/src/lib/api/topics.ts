'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  topicService,
  type TopicInput,
  type TopicLecturer,
  type TopicPatch,
  type TopicQuery,
  type TopicTransition,
} from '@/services/topic.service';

export type {
  TopicInput,
  TopicLecturer,
  TopicPatch,
  TopicQuery,
  TopicTransition,
};

export const topicKeys = {
  all: ['topics'] as const,
  lists: () => [...topicKeys.all, 'list'] as const,
  list: (query: TopicQuery) => [...topicKeys.lists(), query] as const,
  detail: (id: number) => [...topicKeys.all, 'detail', id] as const,
};

export function useTopics(query: TopicQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: topicKeys.list(query),
    queryFn: () => topicService.getAll(query),
    enabled: options?.enabled ?? true,
    // Keep the previous page on screen while the next one loads. Without this
    // the table empties and the page jumps every time someone types a letter
    // into the search box.
    placeholderData: (previous) => previous,
  });
}

export function useTopicLecturers(semesterId: number | undefined) {
  return useQuery({
    queryKey: [...topicKeys.all, 'lecturers', semesterId],
    queryFn: () => topicService.getLecturers(semesterId),
    enabled: semesterId !== undefined,
    staleTime: 60_000,
  });
}

export function useTopic(id: number) {
  return useQuery({
    queryKey: topicKeys.detail(id),
    queryFn: () => topicService.getById(id),
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TopicInput) => topicService.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: topicKeys.lists() }),
  });
}

export function useUpdateTopic(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: TopicPatch) => topicService.update(id, patch),
    onSuccess: (topic) => {
      queryClient.setQueryData(topicKeys.detail(id), topic);
      return queryClient.invalidateQueries({ queryKey: topicKeys.lists() });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => topicService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}

export function useTopicTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: TopicTransition }) =>
      topicService.transition(id, to),
    onSuccess: (topic) => {
      queryClient.setQueryData(topicKeys.detail(topic.id), topic);
      return queryClient.invalidateQueries({ queryKey: topicKeys.lists() });
    },
  });
}

export function useSubmitDraftTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicIds?: number[]) => topicService.submitDrafts(topicIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: topicKeys.all }),
  });
}

export function useBulkOpenTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (semesterId: number) => topicService.bulkOpen(semesterId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: topicKeys.lists() }),
  });
}

export function useDepartmentReviewTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: import('@/lib/api/types').DepartmentReviewInput;
    }) => topicService.reviewDepartment(id, data),
    onSuccess: (topic) => {
      queryClient.setQueryData(topicKeys.detail(topic.id), topic);
      return queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
  });
}

export function useFacultyReviewTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: import('@/lib/api/types').FacultyReviewInput;
    }) => topicService.reviewFaculty(id, data),
    onSuccess: (topic) => {
      queryClient.setQueryData(topicKeys.detail(topic.id), topic);
      return queryClient.invalidateQueries({ queryKey: topicKeys.all });
    },
  });
}

export function useTopicSimilarity(
  id: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...topicKeys.all, 'similarity', id],
    queryFn: () => topicService.getSimilarity(id),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}
