import { create } from "zustand";

export interface AuthUser {
  id: string;
  role: "MEMBER" | "ADMIN";
  // Only populated by a real login response. A session restored from a
  // silent refresh on app startup (see hooks/useSessionRestore.ts) only
  // has id/role available -- the refresh endpoint's documented response
  // is { accessToken } only, per Implementation Design v1.1, and no page
  // in this app reads these fields, so they are left undefined rather
  // than faked.
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isRestoring: boolean;
  login: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setRestoring: (isRestoring: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isRestoring: true,
  login: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setRestoring: (isRestoring) => set({ isRestoring }),
  logout: () => set({ user: null, accessToken: null }),
}));
