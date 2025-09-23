import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSession } from '../types';
import { refreshSession, logout } from '../services/auth';
import { setAuthHeader } from '../services/api';

interface AuthState {
  user: UserSession | null;
  loading: boolean;
  setUser: (user: UserSession | null) => void;
  restoreSession: () => Promise<UserSession | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      setUser: (user) => {
        set({ user });
      },
      restoreSession: async () => {
        try {
          set({ loading: true });
          const user = await refreshSession();
          set({ user, loading: false });
          return user;
        } catch (error) {
          set({ user: null, loading: false });
          return null;
        }
      },
      signOut: async () => {
        await logout();
        set({ user: null });
      },
    }),
    {
      name: 'lockbox-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
