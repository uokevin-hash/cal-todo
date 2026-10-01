import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { AdminMember } from '../../types';
import { useDeleteMember, useMembers } from './api';
import { MemberEditModal } from './MemberEditModal';

function roleLabel(member: AdminMember) {
  if (member.isPermanent) return '영구';
  return member.role === 'ADMIN' ? '관리자' : '회원';
}

// SCR-08, WF-08
export function MembersPage() {
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
        <h1 className="page-title desktop-only">회원 관리</h1>
        <label className="check">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          삭제된 회원 보기
        </label>
        <form className="search" onSubmit={submitSearch}>
          <input
            className="input"
            aria-label="검색"
            placeholder="이름·이메일"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn">검색</button>
        </form>
      </div>

      {isPending && <Loading />}
      {error && <p className="empty">{errorMessage(error)}</p>}
      {members?.length === 0 && <p className="empty">조건에 맞는 회원이 없습니다</p>}
      {!!members?.length && (
        <div className="table members-table">
          <div className="tr th">
            <span>이름</span>
            <span>이메일</span>
            <span>전화번호</span>
            <span>역할</span>
            <span />
          </div>
          {members.map((member) => (
            <div key={member.id} className={`tr${member.isDeleted ? ' deleted' : ''}`}>
              <strong className="c-title">
                {member.name}
                {member.isDeleted && <span className="muted">(탈퇴)</span>}
              </strong>
              <span className="c-sub">{member.email}</span>
              <span className="c-sub">{member.phone}</span>
              <span className="c-badge">{roleLabel(member)}</span>
              <span className="c-actions">
                {member.isDeleted ? (
                  <button className="btn small" onClick={() => setEditing(member)}>
                    보기
                  </button>
                ) : (
                  <>
                    <button className="btn small" onClick={() => setEditing(member)}>
                      편집
                    </button>
                    {/* R-9, R-11: 영구 관리자·본인 행에는 삭제가 없다 */}
                    {!member.isPermanent && member.id !== meId && (
                      <button className="btn small danger" onClick={() => setDeleting(member)}>
                        삭제
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
          title="회원 삭제"
          message="오늘을 포함한 이후의 참석 기록은 삭제되고, 회원 정보와 지난 기록은 남습니다"
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
