import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { Segment } from '../../components/Segment';
import { formatMonthDay } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { checkName } from '../../lib/validate';
import { useStore } from '../../store';
import { useAttendDefault, useCreateGroup } from './api';
import { groupLabel, useT, type Key } from '../../lib/i18n';

export const CAPACITY_OPTIONS: { value: number; label: Key }[] = [
  { value: 2, label: 'capacity2Long' },
  { value: 4, label: 'capacity4Long' },
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
  const t = useT();
  const createGroup = useCreateGroup(date);
  const attendDefault = useAttendDefault(date);
  const [name, setName] = useState(isDefaultMode ? DEFAULT_NAME : '');
  const [capacity, setCapacity] = useState(4);
  const [attend, setAttend] = useState(!isAttending);
  // 창을 연 사이 다른 탭에서 참석했으면 참석 없이 그룹만 만든다(R-2, S-4)
  const willAttend = attend && !isAttending;
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
      (name.trim() === DEFAULT_NAME ? t('errReservedName') : undefined);
    if (message) return setError({ field: 'name', message });
    setError(null);
    createGroup.mutate({ name: name.trim(), capacity, attend: willAttend }, { onSuccess: onClose, onError });
  };

  return (
    <Modal
      title={t('createGroupTitle', { date: formatMonthDay(date) })}
      onClose={onClose}
      footer={
        <>
          <button className="btn primary" form="group-create" disabled={isPending}>
            {isPending ? t('creating') : t('create')}
          </button>
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
        </>
      }
    >
      <form id="group-create" className="stack" onSubmit={submit} noValidate>
        <Field label={t('groupName')} error={error?.message} isLocked={isDefaultMode}>
          <input
            className="input"
            aria-label={t('groupName')}
            value={isDefaultMode ? groupLabel(name) : name}
            readOnly={isDefaultMode}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t('capacity')}>
          <Segment
            name="capacity"
            value={capacity}
            options={CAPACITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            onChange={setCapacity}
          />
        </Field>
        <label className="check">
          <input
            type="checkbox"
            checked={isDefaultMode || willAttend}
            disabled={isDefaultMode || isAttending}
            onChange={(e) => setAttend(e.target.checked)}
          />
          {t('attendAfterCreate')}
          {(isDefaultMode || isAttending) && <span className="muted">{t('locked')}</span>}
        </label>
      </form>
    </Modal>
  );
}
