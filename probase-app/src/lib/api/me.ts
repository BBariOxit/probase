'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupKeys } from '@/lib/api/registration';
import type { MyProfile, UpdateMyProfileInput } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { profileService } from '@/services/profile.service';

export const meKeys = {
  profile: ['me', 'profile'] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: meKeys.profile,
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMyProfileInput) =>
      profileService.updateProfile(input),
    onSuccess: (profile) => queryClient.setQueryData(meKeys.profile, profile),
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
        queryClient.invalidateQueries({ queryKey: meKeys.profile }),
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
