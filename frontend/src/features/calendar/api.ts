import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/client';
import type { Calendar } from '../../types';

// 단순화: 채팅과 같은 3초 폴링으로 다른 회원의 그룹·참석 변화를 반영한다.
// 접속자가 많아지면 WebSocket·SSE로 바꾼다
const POLL_MS = 3000;

export function useCalendar(month: string) {
  return useQuery({
    queryKey: ['calendar', month],
    queryFn: () => api<Calendar>(`/calendar?month=${month}`),
    refetchInterval: POLL_MS,
  });
}
