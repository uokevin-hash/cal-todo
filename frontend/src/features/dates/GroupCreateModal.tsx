import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { Segment } from '../../components/Segment';
import { formatMonthDay } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { checkName } from '../../lib/validate';
import { useStore } from '../../store';
import { useAttendDefault, useCreateGroup } from './api';

export const CAPACITY_OPTIONS = [
  { value: 2, label: '2명 단식' },
  { value: 4, label: '4명 복식/혼복' },
];
const DEFAULT_NAME = '기본';

type Props = {
  date: string;
  isDefaultMode: boolean; // 기본 그룹이 없어 [그룹 없이 참석]으로 열림(R-2, S-5)
  isAttending: boolean; // 그날 이미 참석 중(R-4)
  onClose: () => void;
};

// SCR-05, WF-05
export function GroupCreateModal({ date, isDefaultMode, isAttending, onClose }: Props) {
  const createGroup = useCreateGroup(date);
  const attendDefault = useAttendDefault(date);
  const [name, setName] = useState(isDefaultMode ? DEFAULT_NAME : '');
  const [capacity, setCapacity] = useState(4);
  const [attend, setAttend] = useState(!isAttending);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const isPending = createGroup.isPending || attendDefault.isPending;

  const onError = (e: unknown) => {
    const field = errorField(e);
    // 409 ALREADY_ATTENDING 등 칸이 없는 거부는 토스트(WF-05)
    if (field === 'name') setError({ field, message: errorMessage(e) });
    else useStore.getState().showToast(errorMessage(e));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isDefaultMode) {
      // 그 사이 다른 회원이 기본 그룹을 만들었으면 그 그룹에 들어간다(PRD 9장)
      attendDefault.mutate(capacity, { onSuccess: onClose, onError });
      return;
    }
    const message =
      checkName(name) ??
      // R-2: 기본은 참석 API로만 만든다
      (name.trim() === DEFAULT_NAME ? "'기본'은 그룹 이름으로 쓸 수 없습니다" : undefined);
    if (message) return setError({ field: 'name', message });
    setError(null);
    createGroup.mutate({ name: name.trim(), capacity, attend }, { onSuccess: onClose, onError });
  };

  return (
    <Modal
      title={`그룹 만들기 · ${formatMonthDay(date)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn primary" form="group-create" disabled={isPending}>
            {isPending ? '만드는 중…' : '만들기'}
          </button>
          <button className="btn" onClick={onClose}>
            취소
          </button>
        </>
      }
    >
      <form id="group-create" className="stack" onSubmit={submit} noValidate>
        <Field label="그룹명" error={error?.message} isLocked={isDefaultMode}>
          <input
            className="input"
            aria-label="그룹명"
            value={name}
            readOnly={isDefaultMode}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="정원">
          <Segment
            name="capacity"
            value={capacity}
            options={CAPACITY_OPTIONS}
            onChange={setCapacity}
          />
        </Field>
        <label className="check">
          <input
            type="checkbox"
            checked={isDefaultMode || attend}
            disabled={isDefaultMode || isAttending}
            onChange={(e) => setAttend(e.target.checked)}
          />
          만든 뒤 바로 참석
          {(isDefaultMode || isAttending) && <span className="muted">(잠김)</span>}
        </label>
      </form>
    </Modal>
  );
}
