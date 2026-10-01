import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { MemberName } from '../../components/MemberName';
import { formatShort } from '../../lib/date';
import { errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { ChatArchive } from '../../types';
import { ChatImage } from '../chat/ChatImage';
import { CHAT_TIME } from '../chat/GroupChat';
import { useArchivedMessages, useChatArchives, useDeleteChatArchive } from './api';

// 삭제된 그룹의 채팅 보관함. 관리자만, 읽기와 삭제
export function ChatArchivesPage() {
  const showToast = useStore((s) => s.showToast);
  const { data: archives, isPending, error } = useChatArchives();
  const deleteArchive = useDeleteChatArchive();
  const [selected, setSelected] = useState<ChatArchive | null>(null);
  const [deleting, setDeleting] = useState<ChatArchive | null>(null);

  return (
    <>
      <h1 className="page-title">채팅 보관함</h1>
      <p className="muted">삭제된 그룹의 채팅 내용입니다. 관리자만 볼 수 있습니다</p>
      {isPending && <Loading />}
      {error && <p className="empty">{errorMessage(error)}</p>}
      {archives?.length === 0 && <p className="empty">보관된 채팅이 없습니다</p>}
      {!!archives?.length && (
        <div className="table archives-table">
          <div className="tr th">
            <span>날짜</span>
            <span>그룹명</span>
            <span>메시지</span>
            <span>삭제 시각</span>
            <span />
          </div>
          {archives.map((a) => (
            <div
              key={a.id}
              className={`tr clickable${selected?.id === a.id ? ' selected' : ''}`}
              role="link"
              tabIndex={0}
              onClick={() => setSelected(a)}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(a)}
            >
              <span className="c-date">{formatShort(a.date)}</span>
              <strong className="c-title">{a.name}</strong>
              <span className="c-meta">메시지 {a.messageCount}개</span>
              <span className="c-meta">삭제 {CHAT_TIME.format(new Date(a.deletedAt))}</span>
              <span className="c-actions">
                <button
                  className="btn small danger"
                  onClick={(e) => {
                    e.stopPropagation(); // 행 선택과 구분
                    setDeleting(a);
                  }}
                >
                  삭제
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {selected && <ArchivedMessages key={selected.id} archive={selected} />}
      {deleting && (
        <ConfirmDialog
          title="보관된 채팅 삭제"
          message={`${formatShort(deleting.date)} ${deleting.name}의 메시지 ${deleting.messageCount}개를 삭제합니다. 되돌릴 수 없습니다`}
          isPending={deleteArchive.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleteArchive.mutate(deleting.id, {
              onSuccess: () => {
                if (selected?.id === deleting.id) setSelected(null);
              },
              onSettled: () => setDeleting(null),
              onError: (e) => showToast(errorMessage(e)),
            })
          }
        />
      )}
    </>
  );
}

function ArchivedMessages({ archive }: { archive: ChatArchive }) {
  const { data: messages, error } = useArchivedMessages(archive.id);
  return (
    <section className="chat">
      <h2 className="section-title">
        {formatShort(archive.date)} {archive.name}
      </h2>
      <div className="chat-room">
        <ol className="chat-list" aria-label="보관된 메시지">
          {error && <li className="empty">{errorMessage(error)}</li>}
          {messages?.map((m) => (
            <li key={m.id} className="chat-message">
              <span className="chat-meta">
                <MemberName member={m.author} /> · {CHAT_TIME.format(new Date(m.createdAt))}
              </span>
              <span className="chat-bubble">
                {m.hasImage ? (
                  <ChatImage path={`/admin/chats/${archive.id}/messages/${m.id}/image`} />
                ) : (
                  m.body
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
