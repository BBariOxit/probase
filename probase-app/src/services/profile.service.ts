import { api } from '@/lib/api/client';
import type { MyProfile, UpdateMyProfileInput } from '@/lib/api/types';

export const profileService = {
  getProfile() {
    return api<MyProfile>('/me/profile');
  },

  updateProfile(input: UpdateMyProfileInput) {
    return api<MyProfile>('/me/profile', {
      method: 'PATCH',
      body: input,
    });
  },

  uploadAvatar(file: File) {
    const form = new FormData();
    form.append('file', file);
    return api<{ avatarUrl: string }>('/me/avatar', {
      method: 'POST',
      body: form,
    });
  },

  deleteAvatar() {
    return api<{ avatarUrl: null }>('/me/avatar', {
      method: 'DELETE',
    });
  },
};
