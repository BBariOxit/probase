'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OutlineQuery, outlineService } from '@/services/outline.service';

export const outlineKeys = {
  all: ['outlines'] as const,
  my: () => [...outlineKeys.all, 'my'] as const,
  lecturer: (query: OutlineQuery) =>
    [...outlineKeys.all, 'lecturer', query] as const,
  faculty: (query: OutlineQuery) =>
    [...outlineKeys.all, 'faculty', query] as const,
};

export function useMyGroupOutline() {
  return useQuery({
    queryKey: outlineKeys.my(),
    queryFn: () => outlineService.getMyGroupOutline(),
  });
}

export function useSubmitOutline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => outlineService.submitOutline(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outlineKeys.all });
    },
  });
}

export function useLecturerOutlines(query: OutlineQuery = {}) {
  return useQuery({
    queryKey: outlineKeys.lecturer(query),
    queryFn: () => outlineService.getLecturerOutlines(query),
    placeholderData: (previous) => previous,
  });
}

export function useReviewOutline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      feedback,
    }: {
      id: number;
      action: 'APPROVE' | 'REQUEST_REVISION';
      feedback?: string;
    }) => outlineService.reviewOutline(id, { action, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outlineKeys.all });
    },
  });
}

export function useFacultyOutlines(query: OutlineQuery = {}) {
  return useQuery({
    queryKey: outlineKeys.faculty(query),
    queryFn: () => outlineService.getFacultyOutlines(query),
    placeholderData: (previous) => previous,
  });
}
