'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api/client';
import type { LoginResponse, Role } from '@/lib/api/types';
import { homePathFor, useSession } from '@/lib/auth/session';
import { safeNextPath } from '@/lib/auth/next-path';

interface UseGoogleSsoOptions {
  nextParam?: string | null;
  onError?: (errorMessage: string) => void;
  onSuccess?: (user: LoginResponse['user']) => void;
}

export function useGoogleSso(options?: UseGoogleSsoOptions) {
  const router = useRouter();
  const { signIn } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = safeNextPath(options?.nextParam ?? null);

  function destinationFor(signedIn: {
    role: Role;
  }) {
    return next ?? homePathFor(signedIn.role);
  }

  async function handleGoogleCredential(token: string) {
    if (!token) {
      const msg = 'Không nhận được mã xác thực từ Google. Vui lòng thử lại.';
      setError(msg);
      options?.onError?.(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isAccessToken = token.startsWith('ya29.');
      const result = await api<LoginResponse>('/auth/google', {
        method: 'POST',
        body: isAccessToken ? { accessToken: token } : { credential: token },
        anonymous: true,
      });

      signIn(result, result.user);
      options?.onSuccess?.(result.user);
      router.replace(destinationFor(result.user));
    } catch (err) {
      let friendlyMessage = 'Đăng nhập Google không thành công. Vui lòng thử lại.';

      if (err instanceof ApiError) {
        if (err.status === 403) {
          friendlyMessage =
            err.message ||
            'Tài khoản chưa có trong danh sách được cấp phép thực hiện đồ án của Khoa. Vui lòng liên hệ Giáo vụ Khoa để được hỗ trợ.';
        } else if (err.status === 400) {
          friendlyMessage =
            err.message ||
            'Hệ thống ProBase chỉ chấp nhận email trường Đại học Đà Lạt (@dlu.edu.vn).';
        } else if (err.status === 401) {
          friendlyMessage =
            err.message || 'Xác thực tài khoản thất bại hoặc tài khoản đã bị vô hiệu hoá.';
        } else {
          friendlyMessage = err.message || friendlyMessage;
        }
      } else if (err instanceof Error) {
        friendlyMessage = err.message;
      }

      setError(friendlyMessage);
      options?.onError?.(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    handleGoogleCredential,
    isLoading,
    error,
    setError,
  };
}
