import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { MemberName } from '../../components/MemberName';
import { formatShort } from '../../lib/date';
import { errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import { useMessages, useSendImage, useSendMessage } from './api';
import { ChatImage } from './ChatImage';

export type ChatGroup = { id: number; name: string; date: string };

const MAX_LENGTH = 500;
// 서버가 받는 형식(backend validate.js CHAT_IMAGE_TYPES와 같게)
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const CHAT_TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// 캘린더 아래 채팅창: 이 달에 내가 참석한 그룹마다 대화방 하나
export function GroupChat({ groups }: { groups: ChatGroup[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = groups.find((g) => g.id === selectedId) ?? groups[0];

  return (
    <section className="chat">
      <h2 className="section-title">그룹 채팅</h2>
      {!selected ? (
        <p className="empty">이 달에 참석한 그룹이 없습니다. 날짜를 눌러 그룹에 참석해 보세요</p>
      ) : (
        <>
          <div className="chat-tabs" role="tablist">
            {groups.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={g.id === selected.id}
                className={`btn small${g.id === selected.id ? ' primary' : ''}`}
                onClick={() => setSelectedId(g.id)}
              >
                {formatShort(g.date)} {g.name}
              </button>
            ))}
          </div>
          <ChatRoom key={selected.id} groupId={selected.id} />
        </>
      )}
    </section>
  );
}

function ChatRoom({ groupId }: { groupId: number }) {
  const meId = useStore((s) => s.me?.id);
  const showToast = useStore((s) => s.showToast);
  const { data: messages, error } = useMessages(groupId);
  const send = useSendMessage(groupId);
  const sendImage = useSendImage(groupId);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  // 미리보기 URL은 이미지를 바꾸거나 뺄 때 해제한다
  const choose = (file: File | null) => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(file && { file, url: URL.createObjectURL(file) });
  };
  const listRef = useRef<HTMLOListElement>(null);
  const lastId = messages?.at(-1)?.id;
  const isSending = send.isPending || sendImage.isPending;
  const toastError = (err: unknown) => showToast(errorMessage(err));

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lastId]);

  const sendText = (body: string) =>
    send.mutate(body, { onSuccess: () => setText(''), onError: toastError });

  // 이미지가 있으면 이미지를 먼저 보내고, 입력한 글이 있으면 이어서 보낸다
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (pending) {
      sendImage.mutate(pending.file, {
        onSuccess: () => {
          choose(null);
          if (body) sendText(body);
        },
        onError: toastError,
      });
      return;
    }
    if (body) sendText(body);
  };

  // 클립보드의 이미지를 붙여넣으면 미리보기로 올려 둔다. 글자 붙여넣기는 그대로 둔다
  const paste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    if (!IMAGE_TYPES.includes(file.type))
      return showToast('PNG·JPEG·GIF·WEBP 이미지만 올릴 수 있습니다');
    choose(file);
  };

  // 브라우저 기본 클립보드 API. https·localhost가 아니면 navigator.clipboard가 없다
  const copy = async (body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      showToast('복사했습니다');
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      showToast('복사하지 못했습니다');
    }
  };

  return (
    <div className="chat-room">
      <ol className="chat-list" ref={listRef} aria-label="메시지">
        {error && <li className="empty">{errorMessage(error)}</li>}
        {messages?.length === 0 && <li className="empty">첫 메시지를 남겨 보세요</li>}
        {messages?.map((m) => (
          <li key={m.id} className={`chat-message${m.author.memberId === meId ? ' own' : ''}`}>
            <span className="chat-meta">
              <MemberName member={m.author} /> · {CHAT_TIME.format(new Date(m.createdAt))}
            </span>
            {m.hasImage ? (
              // 이미지: 더블클릭 크게 보기, 오른쪽 클릭 내려받기(ChatImage)
              <span className="chat-bubble">
                <ChatImage path={`/groups/${groupId}/messages/${m.id}/image`} />
              </span>
            ) : (
              // 오른쪽 클릭(모바일은 길게 누르기)으로 복사. 브라우저 기본 메뉴는 띄우지 않는다
              <span
                className="chat-bubble"
                title="마우스 오른쪽 버튼을 누르면 복사됩니다"
                onContextMenu={(e) => {
                  e.preventDefault();
                  copy(m.body);
                }}
              >
                {m.body}
              </span>
            )}
          </li>
        ))}
      </ol>
      {pending && (
        <div className="chat-preview">
          <img src={pending.url} alt="보낼 이미지" />
          <button
            type="button"
            className="btn icon"
            aria-label="이미지 빼기"
            onClick={() => choose(null)}
          >
            ✕
          </button>
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <input
          className="input"
          aria-label="메시지 입력"
          placeholder="메시지를 입력하거나 이미지를 붙여넣으세요"
          maxLength={MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={paste}
        />
        <button className="btn primary" disabled={isSending || (!text.trim() && !pending)}>
          전송
        </button>
      </form>
    </div>
  );
}
