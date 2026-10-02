import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../components/Field';
import { LangSelect } from '../../components/LangSelect';
import { ageOf, todaySeoul } from '../../lib/date';
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
import { useSignup, type SignupInput } from './api';
import { useT } from '../../lib/i18n';

const EMPTY: SignupInput = { name: '', email: '', password: '', phone: '', birthDate: '' };

// SCR-02, WF-02. 성공하면 SCR-01로
export function SignupPage() {
  const t = useT();
  const navigate = useNavigate();
  const signup = useSignup();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const set = (key: keyof SignupInput) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = collect({
      name: checkName(form.name),
      email: checkEmail(form.email),
      password: checkPassword(form.password),
      phone: checkPhone(form.phone),
      birthDate: checkBirthDate(form.birthDate),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    signup.mutate(form, {
      onSuccess: () => navigate('/login'),
      onError: (error) => {
        const field = errorField(error);
        if (field) setErrors({ [field]: errorMessage(error) });
        else useStore.getState().showToast(errorMessage(error));
      },
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-lang">
        <LangSelect />
      </div>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="page-title">{t('signupTitle')}</h1>
        <Field label={t('name')} error={errors.name}>
          <input
            className="input"
            aria-label={t('name')}
            value={form.name}
            onChange={set('name')}
          />
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
        <Field label={t('password')} error={errors.password}>
          <input
            className="input"
            type="password"
            aria-label={t('password')}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        <Field label={t('phone')} error={errors.phone}>
          <input
            className="input"
            type="tel"
            aria-label={t('phone')}
            placeholder="010-1234-5678"
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>
        <Field
          label={t('birthDate')}
          error={errors.birthDate}
          aside={form.birthDate && t('ageSuffix', { age: ageOf(form.birthDate) })}
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
        <div className="form-foot">
          <button className="btn primary" disabled={signup.isPending}>
            {signup.isPending ? t('signingUp') : t('signup')}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/login')}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
