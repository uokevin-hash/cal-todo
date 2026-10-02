import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { MemberNames } from '../../components/MemberName';
import { StatusBadge } from '../../components/StatusBadge';
import { formatLong, todaySeoul } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { DateGroup } from '../../types';
import {
  useAttend,
  useAttendDefault,
  useCancelAttendance,
  useDateGroups,
  useDeleteGroup,
  useLeaveAndDeleteIfEmpty,
} from './api';
import { GroupCreateModal } from './GroupCreateModal';
import { GroupEditModal } from './GroupEditModal';
import { groupLabel, useT } from '../../lib/i18n';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// SCR-04, WF-04. 참석 판단은 서버 응답의 mine·status를 따른다(P-5)
export function DateDetailPage() {
  const { date = '' } = useParams();
  if (!DATE_RE.test(date)) return <Navigate to="/" replace />;
  return <DateDetail key={date} date={date} />;
}

function DateDetail({ date }: { date: string }) {
  const t = useT();
  const isAdmin = useStore((s) => s.me?.role === 'ADMIN');
  const showToast = useStore((s) => s.showToast);
  const { data: groups, isPending, isError, error } = useDateGroups(date);
  const attend = useAttend();
  const attendDefault = useAttendDefault(date);
  const cancel = useCancelAttendance();
  const deleteGroup = useDeleteGroup();
  const leave = useLeaveAndDeleteIfEmpty();
  const [createMode, setCreateMode] = useState<'normal' | 'default' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<DateGroup | null>(null);
  // 마지막 참석자가 취소하려는 그룹(삭제할지 남길지 묻는다)
  const [emptied, setEmptied] = useState<DateGroup | null>(null);

  const isAttending = !!groups?.some((g) => g.mine);
  const defaultGroup = groups?.find((g) => g.name === '기본');
  const isPast = date < todaySeoul(); // R-6: 지난 날짜는 참석 불가
  const isDefaultDim = isPast || isAttending || defaultGroup?.status === 'FULL';
  const toastError = (e: unknown) => showToast(errorMessage(e));

  const attendWithoutGroup = () => {
    // R-6, R-4, R-3: 흐린 버튼은 눌러도 이유만 알린다
    if (isPast) return showToast(t('errPastDate'));
    if (isAttending) return showToast(t('errAlreadyAttending'));
    if (defaultGroup?.status === 'FULL') return showToast(t('errCapacityFull'));
    if (!defaultGroup) return setCreateMode('default');
    attendDefault.mutate(undefined, {
      onError: (e) => {
        // 연 사이 기본 그룹이 삭제되었으면 정원을 고르게 한다(SCR-04)
        if (errorField(e) === 'capacity') setCreateMode('default');
        else toastError(e);
      },
    });
  };

  const action = (group: DateGroup) => {
    if (group.mine) {
      return (
        <button
          className="btn"
          disabled={cancel.isPending}
          onClick={() =>
            // 내가 마지막 참석자면 취소 전에 그룹을 지울지 남길지 묻는다
            group.count === 1 ? setEmptied(group) : cancel.mutate(group.id, { onError: toastError })
          }
        >
          {t('cancelAttendance')}
        </button>
      );
    }
    if (group.status === 'FULL') return <span className="muted">{t('closed')}</span>;
    return (
      <button
        className={`btn primary${isPast || isAttending ? ' dim' : ''}`}
        disabled={attend.isPending}
        onClick={() =>
          isPast
            ? showToast(t('errPastDate'))
            : isAttending
              ? showToast(t('errAlreadyAttending'))
              : attend.mutate(group.id, { onError: toastError })
        }
      >
        {t('attend')}
      </button>
    );
  };

  return (
    <>
      <div className="date-head">
        <h1 className="page-title">{formatLong(date)}</h1>
        <div className="date-actions">
          <button
            className={`btn primary${isPast ? ' dim' : ''}`}
            onClick={() => (isPast ? showToast(t('errPastCreate')) : setCreateMode('normal'))}
          >
            {t('createGroup')}
          </button>
          <button
            className={`btn${isDefaultDim ? ' dim' : ''}`}
            disabled={attendDefault.isPending}
            onClick={attendWithoutGroup}
          >
            {t('attendWithoutGroup')}
          </button>
        </div>
      </div>

      {isPending && <Loading />}
      {isError && <p className="empty">{errorMessage(error)}</p>}
      {groups?.length === 0 && <p className="empty">{t('noGroupsOnDate')}</p>}
      <ul className="cards">
        {groups?.map((group) => (
          <li key={group.id} className={`card group-card${group.mine ? ' mine' : ''}`}>
            <div className="card-top">
              <strong className="card-title">
                {groupLabel(group.name)}
                {group.mine && <span className="check-mark"> ✔</span>}
              </strong>
              <StatusBadge
                status={group.status}
                count={group.count}
                capacity={group.capacity}
                date={date}
              />
            </div>
            <p className="sub">
              <MemberNames members={group.attendees} />
            </p>
            <div className="card-actions">
              {/* D-7: 관리자 버튼. 회원에게는 자리째 없다 */}
              {isAdmin && (
                <span className="admin-actions">
                  <button className="btn small" onClick={() => setEditingId(group.id)}>
                    {t('edit')}
                  </button>
                  <button className="btn small danger" onClick={() => setDeleting(group)}>
                    {t('delete')}
                  </button>
                </span>
              )}
              <span className="push-right">{action(group)}</span>
            </div>
          </li>
        ))}
      </ul>

      {createMode && (
        <GroupCreateModal
          date={date}
          isDefaultMode={createMode === 'default'}
          isAttending={isAttending}
          onClose={() => setCreateMode(null)}
        />
      )}
      {editingId !== null && (
        <GroupEditModal date={date} groupId={editingId} onClose={() => setEditingId(null)} />
      )}
      {emptied && (
        <ConfirmDialog
          title={t('leaveTitle')}
          message={t('leaveMessage', { name: groupLabel(emptied.name) })}
          confirmLabel={t('delete')}
          cancelLabel={t('keep')}
          isPending={leave.isPending || cancel.isPending}
          onConfirm={() =>
            // 서버가 참석 취소와 그룹 삭제를 한 번에. 그 사이 누가 참석했으면 그룹은 남는다
            leave.mutate(emptied.id, {
              onSuccess: ({ groupDeleted }) =>
                showToast(groupDeleted ? t('groupDeleted') : t('groupKeptOthers')),
              onSettled: () => setEmptied(null),
              onError: toastError,
            })
          }
          onCancel={() =>
            cancel.mutate(emptied.id, {
              onSuccess: () => showToast(isAdmin ? t('groupKeptAdmin') : t('groupKeptMember')),
              onSettled: () => setEmptied(null),
              onError: toastError,
            })
          }
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('deleteGroupTitle')}
          message={t('deleteGroupMessage', { n: deleting.count })}
          isPending={deleteGroup.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            deleteGroup.mutate(deleting.id, {
              onSuccess: () => setDeleting(null),
              onError: (e) => {
                setDeleting(null);
                toastError(e);
              },
            })
          }
        />
      )}
    </>
  );
}
