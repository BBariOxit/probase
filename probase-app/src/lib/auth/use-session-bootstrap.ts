'use client';

import { useEffect } from 'react';
import { ApiError } from '@/lib/api/client';
import type { MeResponse, TokenPair } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session';
import { authService } from '@/services/auth.service';

export function useSessionBootstrap() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const tokens = await authService.refresh();
        if (cancelled) return;

        useSession.setState({ accessToken: tokens.accessToken });

        const me = await authService.getMe();
        if (cancelled) return;

        useSession.setState({
          status: 'authenticated',
          user: {
            id: me.id,
            email: me.email,
            role: me.role,
            mustChangePassword: me.mustChangePassword,
            fullName:
              me.studentProfile?.fullName ??
              me.lecturerProfile?.fullName ??
              null,
            avatarUrl: me.avatarUrl,
          },
        });
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError) {
          useSession.getState().signOut();
          return;
        }

        console.warn('Không kết nối được máy chủ khi khôi phục phiên:', err);
        useSession.setState({
          status: 'unauthenticated',
          accessToken: null,
          user: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
