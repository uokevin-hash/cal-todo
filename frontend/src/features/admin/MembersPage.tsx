import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { AdminMember } from '../../types';
import { useDeleteMember, useMembers } from './api';
import { MemberEditModal } from './MemberEditModal';
import { useT, type Key } from '../../lib/i18n';

function roleLabel(member: AdminMember, t: (key: Key) => string) {
  if (member.isPermanent) return t('rolePermanentShort');
  return t(member.role === 'ADMIN' ? 'roleAdmin' : 'roleMember');
}

// SCR-08, WF-08
export function MembersPage() {
  const t = useT();
  const meId = useStore((s) => s.me?.id);
  const showToast = useStore((s) => s.showToast);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const { data, isPending, error } = useMembers({ includeDeleted, q });
  const deleteMember = useDeleteMember();
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [deleting, setDeleting] = useState<AdminMember | null>(null);
  // 삭제된 회원은 목록 맨 아래(WF-08)
  const members = data && [...data].sort((a, b) => Number(a.isDeleted) - Number(b.isDeleted));

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setQ(search.trim()); // FR-19: 비우면 전체
  };

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title desktop-only">{t('menuMembers')}</h1>
        <label className="check">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          {t('showDeleted')}
        </label>
        <form className="search" onSubmit={submitSearch}>
          <input
            className="input"
            aria-label={t('search')}
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn">{t('search')}</button>
        </form>
      </div>

      {isPending && <Loading />}
      {error && <p className="empty">{errorMessage(error)}</p>}
      {members?.length === 0 && <p className="empty">{t('noMembers')}</p>}
      {!!members?.length && (
        <div className="table members-table">
          <div className="tr th">
            <span>{t('name')}</span>
            <span>{t('email')}</span>
            <span>{t('phone')}</span>
            <span>{t('role')}</span>
            <span />
          </div>
          {members.map((member) => (
            <div key={member.id} className={`tr${member.isDeleted ? ' deleted' : ''}`}>
              <strong className="c-title">
                {member.name}
                {member.isDeleted && <span className="muted">{t('deletedSuffix')}</span>}
              </strong>
              <span className="c-sub">{member.email}</span>
              <span className="c-sub">{member.phone}</span>
              <span className="c-badge">{roleLabel(member, t)}</span>
              <span className="c-actions">
                {member.isDeleted ? (
                  <button className="btn small" onClick={() => setEditing(member)}>
                    {t('view')}
                  </button>
                ) : (
                  <>
                    <button className="btn small" onClick={() => setEditing(member)}>
                      {t('edit')}
                    </button>
                    {/* R-9, R-11: 영구 관리자·본인 행에는 삭제가 없다 */}
                    {!member.isPermanent && member.id !== meId && (
                      <button className="btn small danger" onClick={() => setDeleting(member)}>
                        {t('delete')}
                      </button>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && <MemberEditModal member={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={t('deleteMemberTitle')}
          message={t('deleteMemberMessage')}
          isPending={deleteMember.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleteMember.mutate(deleting.id, {
              onSettled: () => setDeleting(null),
              onError: (e) => showToast(errorMessage(e)),
            })
          }
        />
      )}
    </>
  );
}
