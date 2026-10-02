import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
import { MemberName } from '../../components/MemberName';
import { Modal } from '../../components/Modal';
import { Segment } from '../../components/Segment';
import { formatMonthDay } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { checkName } from '../../lib/validate';
import { useStore } from '../../store';
import type { DateGroup } from '../../types';
import { useDateGroups, useRemoveAttendee, useUpdateGroup } from './api';
import { CAPACITY_OPTIONS } from './GroupCreateModal';
import { groupLabel, useT } from '../../lib/i18n';

type Props = { date: string; groupId: number; onClose: () => void };

const DEFAULT_NAME = '기본';

// WF-10. SCR-04 [편집]과 SCR-09 [편집]이 같이 쓴다(ST-5). 참석자는 날짜 상세 응답에서 읽는다
export function GroupEditModal({ date, groupId, onClose }: Props) {
  const { data } = useDateGroups(date);
  const group = data?.find((g) => g.id === groupId);
  if (!group) return null;
  return <EditForm key={group.id} date={date} group={group} onClose={onClose} />;
}

type FormProps = {
  date: string;
  group: DateGroup;
  onClose: () => void;
};

function EditForm({ date, group, onClose }: FormProps) {
  const t = useT();
  const updateGroup = useUpdateGroup();
  const removeAttendee = useRemoveAttendee();
  const [name, setName] = useState(group.name);
  const [capacity, setCapacity] = useState(group.capacity);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isDefault = group.name === DEFAULT_NAME;

  const showError = (e: unknown) => {
    const field = errorField(e);
    if (field === 'name' || field === 'capacity') setErrors({ [field]: errorMessage(e) });
    else useStore.getState().showToast(errorMessage(e));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const message =
      checkName(name) ??
      (!isDefault && name.trim() === DEFAULT_NAME ? t('errReservedName') : undefined); // R-2
    if (message) return setErrors({ name: message });
    setErrors({});
    const body: { id: number; name?: string; capacity?: number } = { id: group.id };
    if (!isDefault && name.trim() !== group.name) body.name = name.trim();
    if (capacity !== group.capacity) body.capacity = capacity;
    updateGroup.mutate(body, { onSuccess: onClose, onError: showError });
  };

  return (
    <Modal
      title={t('editGroupTitle', { date: formatMonthDay(date) })}
      onClose={onClose}
      footer={
        <>
          <button className="btn primary" form="group-edit" disabled={updateGroup.isPending}>
            {updateGroup.isPending ? t('saving') : t('save')}
          </button>
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
        </>
      }
    >
      <form id="group-edit" className="stack" onSubmit={submit} noValidate>
        <Field label={t('groupName')} error={errors.name} isLocked={isDefault}>
          <input
            className="input"
            aria-label={t('groupName')}
            value={isDefault ? groupLabel(name) : name}
            readOnly={isDefault}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t('capacity')} error={errors.capacity}>
          <Segment
            name="edit-capacity"
            value={capacity}
            options={CAPACITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            onChange={(value) => {
              setCapacity(value);
              setErrors({});
            }}
          />
        </Field>
        <div className="field">
          <span className="field-label">{t('attendeesCount', { n: group.attendees.length })}</span>
          <ul className="attendee-list">
            {group.attendees.map((member) => (
              <li key={member.memberId}>
                <MemberName member={member} />
                {/* SCR-09: 확인 창 없이 즉시 반영 */}
                <button
                  type="button"
                  className="btn text"
                  disabled={removeAttendee.isPending}
                  onClick={() =>
                    removeAttendee.mutate(
                      { groupId: group.id, memberId: member.memberId },
                      // 인원이 줄면 정원 오류는 더 이상 맞지 않는다
                      { onSuccess: () => setErrors({}), onError: showError },
                    )
                  }
                >
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </Modal>
  );
}
