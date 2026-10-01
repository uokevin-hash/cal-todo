import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/client';
import { useStore } from '../../store';
import type { Me, TokenResponse } from '../../types';

export type MeInput = Partial<Pick<Me, 'name' | 'email' | 'phone' | 'birthDate'>> & {
  currentPassword?: string;
  newPassword?: string;
};

// 내 정보는 스토어의 me(L-9)라 조회 훅 없이 저장 결과로 갱신한다
export function useUpdateMe() {
  return useMutation({
    mutationFn: async (input: MeInput) => {
      const result = await api<Me | TokenResponse>('/me', { method: 'PATCH', body: input });
      const { setAccessToken, setMe } = useStore.getState();
      // 6.1 흐름 8: 비밀번호를 바꾸면 새 토큰으로 이 기기 로그인을 유지하고 다시 읽는다
      if ('accessToken' in result) {
        setAccessToken(result.accessToken);
        setMe(await api<Me>('/me'));
      } else {
        setMe(result);
      }
    },
  });
}
