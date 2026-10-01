import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Loading } from '../../components/Loading';
import { MemberNames } from '../../components/MemberName';
import { StatusBadge } from '../../components/StatusBadge';
import { formatLong } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { useStore } from '../../store';
import type { DateGroup } from '../../types';
import {
  useAttend,
  useAttendDefault,
  useCancelAttendance,
  useDateGroups,
  useDeleteGroup,
} from './api';
import { GroupCreateModal } from './GroupCreateModal';
import { GroupEditModal } from './GroupEditModal';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALREADY_ATTENDING = '해당 날짜에 이미 참석한 그룹이 있습니다';
const CAPACITY_FULL = '정원이 가득 찼습니다';

// SCR-04, WF-04. 참석 판단은 서버 응답의 mine·status를 따른다(P-5)
export function DateDetailPage() {
  const { date = '' } = useParams();
  if (!DATE_RE.test(date)) return <Navigate to="/" replace />;
  return <DateDetail key={date} date={date} />;
}

function DateDetail({ date }: { date: string }) {
  const isAdmin = useStore((s) => s.me?.role === 'ADMIN');
  const showToast = useStore((s) => s.showToast);
  const { data: groups, isPending, isError, error } = useDateGroups(date);
  const attend = useAttend();
  const attendDefault = useAttendDefault(date);
  const cancel = useCancelAttendance();
  const deleteGroup = useDeleteGroup();
  const [createMode, setCreateMode] = useState<'normal' | 'default' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<DateGroup | null>(null);

  const isAttending = !!groups?.some((g) => g.mine);
  const defaultGroup = groups?.find((g) => g.name === '기본');
  const isDefaultDim = isAttending || defaultGroup?.status === 'FULL';
  const toastError = (e: unknown) => showToast(errorMessage(e));

  const attendWithoutGroup = () => {
    // R-4, R-3: 흐린 버튼은 눌러도 이유만 알린다
    if (isAttending) return showToast(ALREADY_ATTENDING);
    if (defaultGroup?.status === 'FULL') return showToast(CAPACITY_FULL);
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
          onClick={() => cancel.mutate(group.id, { onError: toastError })}
        >
          참석 취소
        </button>
      );
    }
    if (group.status === 'FULL') return <span className="muted">(마감)</span>;
    return (
      <button
        className={`btn primary${isAttending ? ' dim' : ''}`}
        disabled={attend.isPending}
        onClick={() =>
          isAttending
            ? showToast(ALREADY_ATTENDING)
            : attend.mutate(group.id, { onError: toastError })
        }
      >
        참석
      </button>
    );
  };

  return (
    <>
      <div className="date-head">
        <h1 className="page-title">{formatLong(date)}</h1>
        <div className="date-actions">
          <button className="btn primary" onClick={() => setCreateMode('normal')}>
            + 그룹 만들기
          </button>
          <button
            className={`btn${isDefaultDim ? ' dim' : ''}`}
            disabled={attendDefault.isPending}
            onClick={attendWithoutGroup}
          >
            그룹 없이 참석
          </button>
        </div>
      </div>

      {isPending && <Loading />}
      {isError && <p className="empty">{errorMessage(error)}</p>}
      {groups?.length === 0 && <p className="empty">이 날짜에는 아직 그룹이 없습니다</p>}
      <ul className="cards">
        {groups?.map((group) => (
          <li key={group.id} className={`card group-card${group.mine ? ' mine' : ''}`}>
            <div className="card-top">
              <strong className="card-title">
                {group.name}
                {group.mine && <span className="check-mark"> ✔</span>}
              </strong>
              <StatusBadge status={group.status} count={group.count} capacity={group.capacity} />
            </div>
            <p className="sub">
              <MemberNames members={group.attendees} />
            </p>
            <div className="card-actions">
              {/* D-7: 관리자 버튼. 회원에게는 자리째 없다 */}
              {isAdmin && (
                <span className="admin-actions">
                  <button className="btn small" onClick={() => setEditingId(group.id)}>
                    편집
                  </button>
                  <button className="btn small danger" onClick={() => setDeleting(group)}>
                    삭제
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
      {deleting && (
        <ConfirmDialog
          title="그룹 삭제"
          message={`그룹을 삭제하면 참석자 ${deleting.count}명의 참석 기록이 모두 삭제됩니다. 채팅 내용은 채팅 보관함에 남습니다`}
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
