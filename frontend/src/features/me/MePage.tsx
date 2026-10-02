import { useState, type FormEvent } from 'react';
import { Field } from '../../components/Field';
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
import type { Me } from '../../types';
import { useUpdateMe, type MeInput } from './api';
import { useT } from '../../lib/i18n';

const ROLE_LABELS = { MEMBER: 'roleMember', ADMIN: 'roleAdmin' } as const;

// SCR-07, WF-07
export function MePage() {
  const me = useStore((s) => s.me);
  if (!me) return null;
  return <MeForm me={me} />;
}

function MeForm({ me }: { me: Me }) {
  const t = useT();
  const updateMe = useUpdateMe();
  const showToast = useStore((s) => s.showToast);
  const [form, setForm] = useState({
    name: me.name,
    email: me.email,
    phone: me.phone,
    birthDate: me.birthDate,
    currentPassword: '',
    newPassword: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const isChangingPassword = !!form.newPassword;
    const found = collect({
      name: checkName(form.name),
      email: checkEmail(form.email),
      phone: checkPhone(form.phone),
      birthDate: checkBirthDate(form.birthDate),
      newPassword: isChangingPassword ? checkPassword(form.newPassword) : undefined,
      currentPassword:
        isChangingPassword && !form.currentPassword ? t('errPasswordRequired') : undefined,
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    // 부분 갱신: 바뀐 칸만 보낸다(PRD 9장)
    const input: MeInput = {};
    for (const key of ['name', 'email', 'phone', 'birthDate'] as const) {
      const value = form[key].trim();
      if (value !== me[key]) input[key] = value;
    }
    if (isChangingPassword) {
      input.currentPassword = form.currentPassword;
      input.newPassword = form.newPassword;
    }
    updateMe.mutate(input, {
      onSuccess: () => {
        setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
        showToast(isChangingPassword ? t('otherDevicesLoggedOut') : t('saved'));
      },
      onError: (error) => {
        const field = errorField(error);
        if (field) setErrors({ [field]: errorMessage(error) });
        else showToast(errorMessage(error));
      },
    });
  };

  return (
    <form className="form-page" onSubmit={submit} noValidate>
      <div className="form-head">
        <h1 className="page-title">{t('menuMe')}</h1>
        {/* R-10: 역할은 글자로만 */}
        <span>
          {t('roleLabel', { role: t(me.isPermanent ? 'rolePermanent' : ROLE_LABELS[me.role]) })}
        </span>
      </div>
      <Field label={t('name')} error={errors.name}>
        <input className="input" aria-label={t('name')} value={form.name} onChange={set('name')} />
      </Field>
      <Field label={t('email')} error={errors.email}>
        <input
          className="input"
          type="email"
          aria-label={t('email')}
          value={form.email}
          onChange={set('email')}
        />
      </Field>
      <Field label={t('phone')} error={errors.phone}>
        <input
          className="input"
          type="tel"
          aria-label={t('phone')}
          value={form.phone}
          onChange={set('phone')}
        />
      </Field>
      <Field
        label={t('birthDate')}
        error={errors.birthDate}
        aside={form.birthDate && formatBirth(form.birthDate)}
      >
        <input
          className="input date"
          type="date"
          aria-label={t('birthDate')}
          max={todaySeoul()}
          value={form.birthDate}
          onChange={set('birthDate')}
        />
      </Field>
      <h2 className="section-title">{t('passwordSection')}</h2>
      <Field label={t('currentPassword')} error={errors.currentPassword}>
        <input
          className="input"
          type="password"
          aria-label={t('currentPassword')}
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
      </Field>
      <Field label={t('newPassword')} error={errors.newPassword}>
        <input
          className="input"
          type="password"
          aria-label={t('newPassword')}
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
        />
      </Field>
      <div className="form-foot">
        <button className="btn primary" disabled={updateMe.isPending}>
          {updateMe.isPending ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
