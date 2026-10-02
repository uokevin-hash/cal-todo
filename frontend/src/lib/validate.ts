import { todaySeoul } from './date';
import { t } from './i18n';

// 형식 검증(보조, L-15). backend/src/validate.js와 같은 규칙이다. 바꿀 때는 두 곳을 같이 고친다
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/; // 정의서 4.1

export type Errors = Record<string, string>;

export function checkEmail(value: string): string | undefined {
  if (!EMAIL_RE.test(value.trim())) return t('errEmail');
}

export function checkPhone(value: string): string | undefined {
  if (!PHONE_RE.test(value)) return t('errPhone');
}

export function checkName(value: string): string | undefined {
  if (!value.trim()) return t('errName');
}

export function checkPassword(value: string): string | undefined {
  if (value.length < 8) return t('errPasswordShort');
  if (new TextEncoder().encode(value).length > 72) return t('errPasswordLong'); // bcrypt 한계
}

// 미래 날짜의 최종 판단은 서버(C-9). 여기서는 미리 알려 주기만 한다
export function checkBirthDate(value: string): string | undefined {
  if (!value) return t('errBirthRequired');
  if (value > todaySeoul()) return t('errDate');
}

// 값이 있는 오류만 남긴다
export function collect(errors: Record<string, string | undefined>): Errors {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Errors;
}
