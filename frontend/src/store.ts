import { create } from 'zustand';
import type { Me } from './types';

// L-9: 클라이언트 상태만. accessToken은 메모리에만 둔다(PRD 6.1)
type State = {
  accessToken: string | null;
  me: Me | null;
  isForcedOut: boolean; // WF-01: 강제 로그아웃으로 들어오면 로그인 카드에 안내
  toast: { id: number; message: string } | null;
  setAccessToken: (accessToken: string) => void;
  setMe: (me: Me) => void;
  clearAuth: (isForcedOut?: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
};

export const useStore = create<State>((set) => ({
  accessToken: null,
  me: null,
  isForcedOut: false,
  toast: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setMe: (me) => set({ me, isForcedOut: false }),
  clearAuth: (isForcedOut = false) => set({ accessToken: null, me: null, isForcedOut }),
  showToast: (message) => set({ toast: { id: Date.now(), message } }),
  hideToast: () => set({ toast: null }),
}));
