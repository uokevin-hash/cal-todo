import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field } from '../../components/Field';
import { errorField, errorMessage } from '../../lib/errors';
import { checkEmail, collect, type Errors } from '../../lib/validate';
import { useStore } from '../../store';
import { useLogin } from './api';

// SCR-01, WF-01. 성공하면 가드가 캘린더로 보낸다
export function LoginPage() {
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
      password: password ? undefined : '비밀번호를 입력해 주세요',
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
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="auth-logo">cal-todo</h1>
        {isForcedOut && <p className="notice">! 다시 로그인해 주세요</p>}
        <Field label="이메일" error={errors.email}>
          <input
            className="input"
            type="email"
            aria-label="이메일"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="비밀번호" error={errors.password}>
          <input
            className="input"
            type="password"
            aria-label="비밀번호"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {formError && <p className="field-error">! {formError}</p>}
        <button className="btn primary wide" disabled={login.isPending}>
          {login.isPending ? '로그인 중…' : '로그인'}
        </button>
        <p className="auth-link">
          계정이 없나요? <Link to="/signup">가입하기</Link>
        </p>
      </form>
    </div>
  );
}
