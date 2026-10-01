import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiBlob } from '../../lib/client';
import type { ChatMessage } from '../../types';

// 단순화: 3초 폴링. 동시 접속이 많아지면 WebSocket·SSE로 바꾼다
const POLL_MS = 3000;

export function useMessages(groupId: number) {
  return useQuery({
    queryKey: ['messages', groupId],
    queryFn: () => api<ChatMessage[]>(`/groups/${groupId}/messages`),
    refetchInterval: POLL_MS,
  });
}

export function useSendMessage(groupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api(`/groups/${groupId}/messages`, { method: 'POST', body: { body } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', groupId] }),
  });
}

export function useSendImage(groupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: Blob) => api(`/groups/${groupId}/images`, { method: 'POST', file }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', groupId] }),
  });
}

// 메시지 이미지는 바뀌지 않으므로 한 번 받은 것을 계속 쓴다
// 단순화: object URL을 해제하지 않아 본 이미지는 페이지를 닫을 때까지 메모리에 남는다.
// 이미지가 많아지면 gcTime에 맞춰 revokeObjectURL을 부른다
export function useChatImage(path: string) {
  return useQuery({
    queryKey: ['chatImage', path],
    queryFn: async () => {
      const blob = await apiBlob(path);
      return { url: URL.createObjectURL(blob), type: blob.type };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
