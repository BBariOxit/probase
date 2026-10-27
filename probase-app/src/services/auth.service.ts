import { api } from '@/lib/api/client';
import type { LoginResponse, MeResponse } from '@/lib/api/types';
import type {
  ChangePasswordValues,
  ForgotPasswordValues,
  LoginValues,
} from '@/validations/auth.validation';

export const authService = {
  login(values: LoginValues) {
    return api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: values,
      anonymous: true,
    });
  },

  googleLogin(payload: { credential?: string; accessToken?: string }) {
    return api<LoginResponse>('/auth/google', {
      method: 'POST',
      body: payload,
      anonymous: true,
    });
  },

  forgotPassword(values: ForgotPasswordValues) {
    return api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: values,
      anonymous: true,
    });
  },

  validateResetToken(token: string) {
    return api<{ valid: boolean }>(
      `/auth/reset-password/${encodeURIComponent(token)}`,
      { anonymous: true },
    );
  },

  resetPassword(payload: { token: string; newPassword: string }) {
    return api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: payload,
      anonymous: true,
    });
  },

  changePassword(payload: Pick<ChangePasswordValues, 'newPassword'>) {
    return api<{ accessToken: string }>('/auth/change-password', {
      method: 'PATCH',
      body: payload,
    });
  },

  refresh() {
    return api<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      anonymous: true,
    });
  },

  getMe() {
    return api<MeResponse>('/auth/me');
  },

  logout() {
    return api<{ message: string }>('/auth/logout', {
      method: 'POST',
    }).catch(() => undefined);
  },
};
