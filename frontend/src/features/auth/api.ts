import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/client';
import { useStore } from '../../store';
import type { Me, TokenResponse } from '../../types';

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  birthDate: string;
};

// 6.1 흐름 1: Access Token은 메모리에, 역할은 GET /me 응답으로 안다
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { accessToken } = await api<TokenResponse>('/auth/login', {
        method: 'POST',
        body: input,
      });
      queryClient.clear(); // 강제 로그아웃된 이전 사용자의 캐시를 남기지 않는다
      useStore.getState().setAccessToken(accessToken);
      useStore.getState().setMe(await api<Me>('/me'));
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (input: SignupInput) => api<void>('/auth/signup', { method: 'POST', body: input }),
  });
}

// 6.1 흐름 7: 서버가 쿠키를 지우고, 화면은 메모리의 토큰과 서버 데이터 캐시를 버린다
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      useStore.getState().clearAuth();
      queryClient.clear();
    },
  });
}
