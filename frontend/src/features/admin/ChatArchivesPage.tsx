import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { MemberName } from '../../components/MemberName';
import { formatDateTime, formatShort } from '../../lib/date';
import { errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { ChatArchive } from '../../types';
import { ChatImage } from '../chat/ChatImage';
import { useArchivedMessages, useChatArchives, useDeleteChatArchive } from './api';
import { groupLabel, useT } from '../../lib/i18n';

// 삭제된 그룹의 채팅 보관함. 관리자만, 읽기와 삭제
export function ChatArchivesPage() {
  const t = useT();
  const showToast = useStore((s) => s.showToast);
  const { data: archives, isPending, error } = useChatArchives();
  const deleteArchive = useDeleteChatArchive();
  const [selected, setSelected] = useState<ChatArchive | null>(null);
  const [deleting, setDeleting] = useState<ChatArchive | null>(null);

  return (
    <>
      <h1 className="page-title">{t('menuChats')}</h1>
      <p className="muted">{t('archivesIntro')}</p>
      {isPending && <Loading />}
      {error && <p className="empty">{errorMessage(error)}</p>}
      {archives?.length === 0 && <p className="empty">{t('noArchives')}</p>}
      {!!archives?.length && (
        <div className="table archives-table">
          <div className="tr th">
            <span>{t('date')}</span>
            <span>{t('groupName')}</span>
            <span>{t('messages')}</span>
            <span>{t('deletedAt')}</span>
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
              <strong className="c-title">{groupLabel(a.name)}</strong>
              <span className="c-meta">{t('messageCount', { n: a.messageCount })}</span>
              <span className="c-meta">
                {t('deletedAtValue', { time: formatDateTime(a.deletedAt) })}
              </span>
              <span className="c-actions">
                <button
                  className="btn small danger"
                  onClick={(e) => {
                    e.stopPropagation(); // 행 선택과 구분
                    setDeleting(a);
                  }}
                >
                  {t('delete')}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {selected && <ArchivedMessages key={selected.id} archive={selected} />}
      {deleting && (
        <ConfirmDialog
          title={t('deleteArchiveTitle')}
          message={t('deleteArchiveMessage', {
            group: `${formatShort(deleting.date)} ${groupLabel(deleting.name)}`,
            n: deleting.messageCount,
          })}
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
  const t = useT();
  const { data: messages, error } = useArchivedMessages(archive.id);
  return (
    <section className="chat">
      <h2 className="section-title">
        {formatShort(archive.date)} {groupLabel(archive.name)}
      </h2>
      <div className="chat-room">
        <ol className="chat-list" aria-label={t('archivedMessages')}>
          {error && <li className="empty">{errorMessage(error)}</li>}
          {messages?.map((m) => (
            <li key={m.id} className="chat-message">
              <span className="chat-meta">
                <MemberName member={m.author} /> · {formatDateTime(m.createdAt)}
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
