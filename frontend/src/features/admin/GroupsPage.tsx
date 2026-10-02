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
import { groupLabel, useT } from '../../lib/i18n';

// SCR-09, WF-09 (P1, FR-17). 기간은 URL에 담는다(ST-4)
export function GroupsPage() {
  const [params] = useSearchParams();
  return <Groups key={params.toString()} />;
}

function Groups() {
  const t = useT();
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
        <h1 className="page-title desktop-only">{t('menuGroups')}</h1>
        <span className="range">
          <input
            className="input date"
            type="date"
            aria-label={t('startDate')}
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
          <span>~</span>
          <input
            className="input date"
            type="date"
            aria-label={t('endDate')}
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </span>
        <button className="btn primary">{t('query')}</button>
        {isRangeError && <span className="field-error">! {errorMessage(error)}</span>}
      </form>

      {isPending && <Loading />}
      {error && !isRangeError && <p className="empty">{errorMessage(error)}</p>}
      {groups?.length === 0 && <p className="empty">{t('noGroupsInRange')}</p>}
      {!!groups?.length && (
        <div className="table groups-table">
          <div className="tr th">
            <span>{t('date')}</span>
            <span>{t('groupName')}</span>
            <span>{t('capacity')}</span>
            <span>{t('attendeeCount')}</span>
            <span>{t('createdBy')}</span>
            <span />
          </div>
          {groups.map((group) => (
            <div key={group.id} className="tr">
              <span className="c-date">{formatShort(group.date)}</span>
              <strong className="c-title">{groupLabel(group.name)}</strong>
              <span className="c-meta">
                <span className="mobile-only">{t('capacity')} </span>
                {group.capacity}
              </span>
              <span className="c-meta">
                <span className="mobile-only">{t('attendeeCount')} </span>
                {group.count}
              </span>
              <span className="c-meta">
                <MemberName member={group.createdBy} />
              </span>
              <span className="c-actions">
                <button className="btn small" onClick={() => setEditing(group)}>
                  {t('edit')}
                </button>
                <button className="btn small danger" onClick={() => setDeleting(group)}>
                  {t('delete')}
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
          title={t('deleteGroupTitle')}
          message={t('deleteGroupMessage', { n: deleting.count })}
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
