import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/client';
import { useStore } from '../../store';
import type { AdminGroup, AdminMember, ChatArchive, ChatMessage, Me, Role } from '../../types';

export function useMembers(filters: { includeDeleted: boolean; q: string }) {
  const query = new URLSearchParams();
  if (filters.includeDeleted) query.set('includeDeleted', 'true');
  if (filters.q) query.set('q', filters.q);
  return useQuery({
    queryKey: ['adminMembers', filters],
    queryFn: () => api<AdminMember[]>(`/admin/members?${query}`),
  });
}

export type MemberInput = Partial<Pick<Me, 'name' | 'email' | 'phone' | 'birthDate'>> & {
  newPassword?: string;
  role?: Role;
};

// 회원 이름이 바뀌면 참석자 표시도 바뀌므로 넓게 무효화한다(L-10)
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useUpdateMember() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, ...body }: MemberInput & { id: number }) => {
      await api(`/admin/members/${id}`, { method: 'PATCH', body });
      // R-10: 자기 역할을 내렸으면 메뉴가 바로 바뀌도록 내 정보를 다시 읽는다
      if (id === useStore.getState().me?.id) useStore.getState().setMe(await api<Me>('/me'));
    },
    onSettled: invalidateAll,
  });
}

export function useDeleteMember() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api(`/admin/members/${id}`, { method: 'DELETE' }),
    onSettled: invalidateAll,
  });
}

// 삭제된 그룹의 채팅 보관함(관리자만)
export function useChatArchives() {
  return useQuery({
    queryKey: ['chatArchives'],
    queryFn: () => api<ChatArchive[]>('/admin/chats'),
  });
}

export function useArchivedMessages(archiveId: number) {
  return useQuery({
    queryKey: ['chatArchives', archiveId],
    queryFn: () => api<ChatMessage[]>(`/admin/chats/${archiveId}/messages`),
  });
}

export function useDeleteChatArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archiveId: number) => api(`/admin/chats/${archiveId}`, { method: 'DELETE' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['chatArchives'] }),
  });
}

export function useAdminGroups(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['adminGroups', range],
    queryFn: () => api<AdminGroup[]>(`/admin/groups?from=${range.from}&to=${range.to}`),
  });
}
