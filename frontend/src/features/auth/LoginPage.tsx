import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field } from '../../components/Field';
import { LangSelect } from '../../components/LangSelect';
import { errorField, errorMessage } from '../../lib/errors';
import { checkEmail, collect, type Errors } from '../../lib/validate';
import { useStore } from '../../store';
import { useLogin } from './api';
import { useT } from '../../lib/i18n';

// SCR-01, WF-01. 성공하면 가드가 캘린더로 보낸다
export function LoginPage() {
  const t = useT();
  const isForcedOut = useStore((s) => s.isForcedOut);
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = collect({
      email: checkEmail(email),
      password: password ? undefined : t('errPasswordRequired'),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    login.mutate(
      { email: email.trim(), password },
      {
        onError: (error) => {
          const field = errorField(error);
          if (field) setErrors({ [field]: errorMessage(error) });
          else setFormError(errorMessage(error));
        },
      },
    );
  };

  return (
    <div className="auth-page">
      <div className="auth-lang">
        <LangSelect />
      </div>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="auth-logo">Badminatics</h1>
        {isForcedOut && <p className="notice">! {t('pleaseLoginAgain')}</p>}
        <Field label={t('email')} error={errors.email}>
          <input
            className="input"
            type="email"
            aria-label={t('email')}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t('password')} error={errors.password}>
          <input
            className="input"
            type="password"
            aria-label={t('password')}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {formError && <p className="field-error">! {formError}</p>}
        <button className="btn primary wide" disabled={login.isPending}>
          {login.isPending ? t('loggingIn') : t('login')}
        </button>
        <p className="auth-link">
          {t('noAccount')} <Link to="/signup">{t('goSignup')}</Link>
        </p>
      </form>
    </div>
  );
}
