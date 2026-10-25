'use client';

import { create } from 'zustand';
import type { Role, SessionUser } from '@/lib/api/types';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  user: SessionUser | null;
  signIn: (tokens: { accessToken: string }, user: SessionUser) => void;
  setAccessToken: (accessToken: string) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,

  signIn: (tokens, user) => {
    set({ status: 'authenticated', accessToken: tokens.accessToken, user });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  patchUser: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
    })),

  signOut: () => {
    set({ status: 'unauthenticated', accessToken: null, user: null });
  },
}));

export function homePathFor(role: Role): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'LECTURER') return '/lecturer';
  return '/student';
}
