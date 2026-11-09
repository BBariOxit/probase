'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupKeys } from '@/lib/api/registration';
import type { UpdateMyProfileInput } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { profileService } from '@/services/profile.service';

export const meKeys = {
  all: ['me'] as const,
  profile: (userId?: number | null) => ['me', 'profile', userId ?? 'anonymous'] as const,
};

export function useMyProfile(options?: { enabled?: boolean }) {
  const user = useSession((state) => state.user);

  return useQuery({
    queryKey: meKeys.profile(user?.id),
    queryFn: () => profileService.getProfile(),
    enabled: !!user?.id && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const user = useSession((state) => state.user);

  return useMutation({
    mutationFn: (input: UpdateMyProfileInput) =>
      profileService.updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(meKeys.profile(user?.id), profile);
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

function useAvatarMutation<TVariables>(
  send: (variables: TVariables) => Promise<{ avatarUrl: string | null }>,
) {
  const queryClient = useQueryClient();
  const patchUser = useSession((state) => state.patchUser);

  return useMutation({
    mutationFn: send,
    onSuccess: async ({ avatarUrl }) => {
      patchUser({ avatarUrl });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meKeys.all }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      ]);
    },
  });
}

export function useUploadAvatar() {
  return useAvatarMutation((file: File) => profileService.uploadAvatar(file));
}

export function useRemoveAvatar() {
  return useAvatarMutation(() => profileService.deleteAvatar());
}
