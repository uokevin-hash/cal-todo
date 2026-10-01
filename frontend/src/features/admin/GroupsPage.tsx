import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { MemberName } from '../../components/MemberName';
import { currentMonthRange, formatShort } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { AdminGroup } from '../../types';
import { useDeleteGroup } from '../dates/api';
import { GroupEditModal } from '../dates/GroupEditModal';
import { useAdminGroups } from './api';

// SCR-09, WF-09 (P1, FR-17). 기간은 URL에 담는다(ST-4)
export function GroupsPage() {
  const [params] = useSearchParams();
  return <Groups key={params.toString()} />;
}

function Groups() {
  const [params, setParams] = useSearchParams();
  const showToast = useStore((s) => s.showToast);
  const range = currentMonthRange();
  const applied = { from: params.get('from') ?? range.from, to: params.get('to') ?? range.to };
  const [form, setForm] = useState(applied);
  const { data: groups, isPending, error } = useAdminGroups(applied);
  const deleteGroup = useDeleteGroup();
  const [editing, setEditing] = useState<AdminGroup | null>(null);
  const [deleting, setDeleting] = useState<AdminGroup | null>(null);
  const isRangeError = errorField(error) === 'to';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(form);
  };

  return (
    <>
      <form className="toolbar" onSubmit={submit} noValidate>
        <h1 className="page-title desktop-only">그룹 관리</h1>
        <span className="range">
          <input
            className="input date"
            type="date"
            aria-label="시작일"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
          <span>~</span>
          <input
            className="input date"
            type="date"
            aria-label="종료일"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </span>
        <button className="btn primary">조회</button>
        {isRangeError && <span className="field-error">! {errorMessage(error)}</span>}
      </form>

      {isPending && <Loading />}
      {error && !isRangeError && <p className="empty">{errorMessage(error)}</p>}
      {groups?.length === 0 && <p className="empty">이 기간에 그룹이 없습니다</p>}
      {!!groups?.length && (
        <div className="table groups-table">
          <div className="tr th">
            <span>날짜</span>
            <span>그룹명</span>
            <span>정원</span>
            <span>인원</span>
            <span>만든 사람</span>
            <span />
          </div>
          {groups.map((group) => (
            <div key={group.id} className="tr">
              <span className="c-date">{formatShort(group.date)}</span>
              <strong className="c-title">{group.name}</strong>
              <span className="c-meta">
                <span className="mobile-only">정원 </span>
                {group.capacity}
              </span>
              <span className="c-meta">
                <span className="mobile-only">인원 </span>
                {group.count}
              </span>
              <span className="c-meta">
                <MemberName member={group.createdBy} />
              </span>
              <span className="c-actions">
                <button className="btn small" onClick={() => setEditing(group)}>
                  편집
                </button>
                <button className="btn small danger" onClick={() => setDeleting(group)}>
                  삭제
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <GroupEditModal date={editing.date} groupId={editing.id} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="그룹 삭제"
          message={`그룹을 삭제하면 참석자 ${deleting.count}명의 참석 기록이 모두 삭제됩니다. 채팅 내용은 채팅 보관함에 남습니다`}
          isPending={deleteGroup.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleteGroup.mutate(deleting.id, {
              onSettled: () => setDeleting(null),
              onError: (e) => showToast(errorMessage(e)),
            })
          }
        />
      )}
    </>
  );
}
