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

const ROLE_LABELS = { MEMBER: '회원', ADMIN: '관리자' };

// SCR-07, WF-07
export function MePage() {
  const me = useStore((s) => s.me);
  if (!me) return null;
  return <MeForm me={me} />;
}

function MeForm({ me }: { me: Me }) {
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
        isChangingPassword && !form.currentPassword ? '비밀번호를 입력해 주세요' : undefined,
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
        showToast(isChangingPassword ? '다른 기기에서는 로그아웃됩니다' : '저장했습니다');
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
        <h1 className="page-title">내 정보</h1>
        {/* R-10: 역할은 글자로만 */}
        <span>역할: {me.isPermanent ? '영구 관리자' : ROLE_LABELS[me.role]}</span>
      </div>
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
      <Field label="전화번호" error={errors.phone}>
        <input
          className="input"
          type="tel"
          aria-label="전화번호"
          value={form.phone}
          onChange={set('phone')}
        />
      </Field>
      <Field
        label="생년월일"
        error={errors.birthDate}
        aside={form.birthDate && formatBirth(form.birthDate)}
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
      <h2 className="section-title">비밀번호 변경 (바꿀 때만 입력)</h2>
      <Field label="현재 비밀번호" error={errors.currentPassword}>
        <input
          className="input"
          type="password"
          aria-label="현재 비밀번호"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
      </Field>
      <Field label="새 비밀번호" error={errors.newPassword}>
        <input
          className="input"
          type="password"
          aria-label="새 비밀번호"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
        />
      </Field>
      <div className="form-foot">
        <button className="btn primary" disabled={updateMe.isPending}>
          {updateMe.isPending ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  );
}
