import { AppError } from './errors.js';

// 형식 검증(C-9, NFR-10). DB가 필요한 규칙(생년월일 미래 여부 등)은 service에서 본다
const invalid = (field, message) => new AppError(400, 'VALIDATION_ERROR', message, field);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/; // 정의서 4.1
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function email(value) {
  if (typeof value !== 'string' || !EMAIL_RE.test(value.trim())) {
    throw invalid('email', '올바른 이메일 형식이 아닙니다');
  }
  return value.trim();
}

export function phone(value) {
  if (typeof value !== 'string' || !PHONE_RE.test(value)) {
    throw invalid('phone', '올바른 전화번호 형식이 아닙니다');
  }
  return value;
}

export function name(value) {
  if (typeof value !== 'string' || !value.trim()) throw invalid('name', '이름을 입력해 주세요');
  return value.trim();
}

export function password(value, field = 'password') {
  if (typeof value !== 'string' || value.length < 8) {
    throw invalid(field, '비밀번호는 8자 이상이어야 합니다');
  }
  if (Buffer.byteLength(value) > 72) throw invalid(field, '비밀번호가 너무 깁니다'); // bcrypt 한계
  return value;
}

export function capacity(value) {
  if (value !== 2 && value !== 4) throw invalid('capacity', '정원은 2명 또는 4명입니다');
  return value;
}

// 형식과 실제 달력 날짜인지(2026-02-30 거부)만 본다
export function date(value, field = 'date') {
  const ok =
    typeof value === 'string' &&
    DATE_RE.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
  if (!ok) throw invalid(field, '올바른 날짜가 아닙니다');
  return value;
}

export function birthDate(value) {
  if (!value) throw invalid('birthDate', '생년월일을 선택해 주세요');
  return date(value, 'birthDate');
}

// 경로 id: 정수로 해석되지 않으면 없는 대상과 같게 404(PRD 9장)
export function id(value) {
  if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', '요청한 대상을 찾을 수 없습니다');
  }
  return Number(value);
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function month(value) {
  if (typeof value !== 'string' || !MONTH_RE.test(value)) {
    throw invalid('month', '올바른 월이 아닙니다');
  }
  return value;
}

export function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw invalid(field, '올바른 값이 아닙니다');
  return value;
}

export function boolean(value, field) {
  if (typeof value !== 'boolean') throw invalid(field, '올바른 값이 아닙니다');
  return value;
}

// 부분 갱신·선택 필드: 보내지 않은 필드는 undefined로 둔다(PRD 9장)
export const optional = (check, value, ...args) =>
  value === undefined ? undefined : check(value, ...args);
