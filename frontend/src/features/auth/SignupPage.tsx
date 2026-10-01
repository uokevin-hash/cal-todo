import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../components/Field';
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

const EMPTY: SignupInput = { name: '', email: '', password: '', phone: '', birthDate: '' };

// SCR-02, WF-02. 성공하면 SCR-01로
export function SignupPage() {
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
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="page-title">회원가입</h1>
        <Field label="이름" error={errors.name}>
          <input className="input" aria-label="이름" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="이메일" error={errors.email}>
          <input
            className="input"
            type="email"
            aria-label="이메일"
            value={form.email}
            onChange={set('email')}
          />
        </Field>
        <Field label="비밀번호" error={errors.password}>
          <input
            className="input"
            type="password"
            aria-label="비밀번호"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        <Field label="전화번호" error={errors.phone}>
          <input
            className="input"
            type="tel"
            aria-label="전화번호"
            placeholder="010-1234-5678"
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>
        <Field
          label="생년월일"
          error={errors.birthDate}
          aside={form.birthDate && `${ageOf(form.birthDate)}세`}
        >
          <input
            className="input date"
            type="date"
            aria-label="생년월일"
            max={todaySeoul()}
            value={form.birthDate}
            onChange={set('birthDate')}
          />
        </Field>
        <div className="form-foot">
          <button className="btn primary" disabled={signup.isPending}>
            {signup.isPending ? '가입 중…' : '가입'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/login')}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
