import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { Segment } from '../../components/Segment';
import { formatBirth, todaySeoul } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import {
  checkBirthDate,
  checkEmail,
  checkName,
  checkPassword,
  checkPhone,
  collect,
  type Errors,
} from '../../lib/validate';
import { useStore } from '../../store';
import type { AdminMember, Role } from '../../types';
import { useUpdateMember, type MemberInput } from './api';
import { useT, type Key } from '../../lib/i18n';

const ROLE_OPTIONS: { value: Role; label: Key }[] = [
  { value: 'MEMBER', label: 'roleMember' },
  { value: 'ADMIN', label: 'roleAdmin' },
];

type Props = { member: AdminMember; onClose: () => void };

// SCR-08 [편집]·[보기], WF-08. 잠금은 화면 편의이고 판단은 서버가 한다(P-5)
export function MemberEditModal({ member, onClose }: Props) {
  const t = useT();
  const meId = useStore((s) => s.me?.id);
  const showToast = useStore((s) => s.showToast);
  const updateMember = useUpdateMember();
  const isReadOnly = member.isDeleted; // FR-16: 삭제된 회원은 보기만
  const isEmailLocked = isReadOnly || member.isPermanent; // R-11
  const isPasswordLocked = isEmailLocked || member.id === meId; // 본인 비밀번호는 SCR-07에서
  const isRoleLocked = isReadOnly || member.isPermanent;
  const [form, setForm] = useState({
    name: member.name,
    email: member.email,
    phone: member.phone,
    birthDate: member.birthDate,
    newPassword: '',
    role: member.role,
  });
  const [errors, setErrors] = useState<Errors>({});
  const set =
    (key: 'name' | 'email' | 'phone' | 'birthDate' | 'newPassword') =>
    (e: { target: { value: string } }) =>
      setForm({ ...form, [key]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = collect({
      name: checkName(form.name),
      email: checkEmail(form.email),
      phone: checkPhone(form.phone),
      birthDate: checkBirthDate(form.birthDate),
      newPassword: form.newPassword ? checkPassword(form.newPassword) : undefined,
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: MemberInput & { id: number } = { id: member.id };
    for (const key of ['name', 'email', 'phone', 'birthDate'] as const) {
      const value = form[key].trim();
      if (value !== member[key]) input[key] = value;
    }
    if (form.newPassword) input.newPassword = form.newPassword; // 비워 두면 바꾸지 않음
    if (form.role !== member.role) input.role = form.role;
    updateMember.mutate(input, {
      onSuccess: onClose,
      onError: (error) => {
        const field = errorField(error);
        if (field) setErrors({ [field]: errorMessage(error) });
        else showToast(errorMessage(error));
      },
    });
  };

  const name = `${member.name}${member.isDeleted ? t('deletedSuffix') : ''}`;
  return (
    <Modal
      title={t(isReadOnly ? 'viewMemberTitle' : 'editMemberTitle', { name })}
      onClose={onClose}
      isFullOnMobile
      footer={
        isReadOnly ? (
          <button className="btn" onClick={onClose}>
            {t('close')}
          </button>
        ) : (
          <>
            <button className="btn primary" form="member-edit" disabled={updateMember.isPending}>
              {updateMember.isPending ? t('saving') : t('save')}
            </button>
            <button className="btn" onClick={onClose}>
              {t('cancel')}
            </button>
          </>
        )
      }
    >
      <form id="member-edit" className="stack" onSubmit={submit} noValidate>
        <Field label={t('name')} error={errors.name} isLocked={isReadOnly}>
          <input
            className="input"
            aria-label={t('name')}
            readOnly={isReadOnly}
            value={form.name}
            onChange={set('name')}
          />
        </Field>
        <Field label={t('email')} error={errors.email} isLocked={isEmailLocked}>
          <input
            className="input"
            type="email"
            aria-label={t('email')}
            readOnly={isEmailLocked}
            value={form.email}
            onChange={set('email')}
          />
        </Field>
        <Field label={t('phone')} error={errors.phone} isLocked={isReadOnly}>
          <input
            className="input"
            type="tel"
            aria-label={t('phone')}
            readOnly={isReadOnly}
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>
        <Field
          label={t('birthDate')}
          error={errors.birthDate}
          isLocked={isReadOnly}
          aside={form.birthDate && formatBirth(form.birthDate)}
        >
          <input
            className="input date"
            type="date"
            aria-label={t('birthDate')}
            max={todaySeoul()}
            readOnly={isReadOnly}
            value={form.birthDate}
            onChange={set('birthDate')}
          />
        </Field>
        <Field
          label={t('newPassword')}
          error={errors.newPassword}
          isLocked={isPasswordLocked}
          aside={isPasswordLocked ? undefined : t('keepPasswordHint')}
        >
          <input
            className="input"
            type="password"
            aria-label={t('newPassword')}
            autoComplete="new-password"
            readOnly={isPasswordLocked}
            value={form.newPassword}
            onChange={set('newPassword')}
          />
        </Field>
        <Field label={t('role')} isLocked={isRoleLocked}>
          {isRoleLocked ? (
            <span>
              {member.isPermanent
                ? t('rolePermanent')
                : t(member.role === 'ADMIN' ? 'roleAdmin' : 'roleMember')}
            </span>
          ) : (
            <Segment
              name="role"
              value={form.role}
              options={ROLE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              onChange={(role) => setForm({ ...form, role })}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
