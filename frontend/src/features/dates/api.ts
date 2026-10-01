import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/client';
import type { DateGroup } from '../../types';

export function useDateGroups(date: string) {
  return useQuery({
    queryKey: ['dateGroups', date],
    queryFn: () => api<DateGroup[]>(`/dates/${date}/groups`),
  });
}

// L-10: 참석·그룹 쓰기 뒤 접두 키로 넓게 무효화한다. 낙관적 업데이트는 쓰지 않는다
function useWrite<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      Promise.all(
        ['calendar', 'dateGroups', 'attendance', 'adminGroups', 'chatArchives'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });
}

export function useAttend() {
  return useWrite((groupId: number) => api(`/groups/${groupId}/attendance`, { method: 'POST' }));
}

// 기본 그룹 참석. 없으면 capacity로 만들고 참석(PRD 9장, NFR-5)
export function useAttendDefault(date: string) {
  return useWrite((capacity?: number) =>
    api(`/dates/${date}/attendance`, {
      method: 'POST',
      body: capacity === undefined ? {} : { capacity },
    }),
  );
}

export function useCancelAttendance() {
  return useWrite((groupId: number) => api(`/groups/${groupId}/attendance`, { method: 'DELETE' }));
}

export function useCreateGroup(date: string) {
  return useWrite((input: { name: string; capacity: number; attend: boolean }) =>
    api(`/dates/${date}/groups`, { method: 'POST', body: input }),
  );
}

export function useUpdateGroup() {
  return useWrite(({ id, ...body }: { id: number; name?: string; capacity?: number }) =>
    api(`/admin/groups/${id}`, { method: 'PATCH', body }),
  );
}

export function useRemoveAttendee() {
  return useWrite(({ groupId, memberId }: { groupId: number; memberId: number }) =>
    api(`/admin/groups/${groupId}/attendance/${memberId}`, { method: 'DELETE' }),
  );
}

export function useDeleteGroup() {
  return useWrite((groupId: number) => api(`/admin/groups/${groupId}`, { method: 'DELETE' }));
}
