import { ApiError } from './client';
import { t, type Key } from './i18n';

// N-15: 화면 문구는 오류 코드로 찾는다(SCR-n 문구, lib/i18n.ts 키). 서버 message는 화면에 쓰지 않는다
const CODE_MESSAGES: Record<string, Key> = {
  INVALID_CREDENTIALS: 'errInvalidCredentials',
  WRONG_PASSWORD: 'errWrongPassword',
  EMAIL_TAKEN: 'errEmailTaken',
  CAPACITY_FULL: 'errCapacityFull',
  ALREADY_ATTENDING: 'errAlreadyAttending',
  PAST_DATE: 'errPastDate',
  DUPLICATE_GROUP_NAME: 'errDuplicateGroup',
  CAPACITY_BELOW_COUNT: 'errCapacityBelow',
  TOO_MANY_ATTEMPTS: 'errTooManyAttempts',
  UNAUTHENTICATED: 'pleaseLoginAgain',
  // 아래는 SCR에 문구가 없어 새로 정함
  PERMANENT_ADMIN_LOCKED: 'errPermanentLocked',
  MEMBER_DELETED: 'errMemberDeleted',
  FORBIDDEN: 'errForbidden',
  NOT_FOUND: 'errNotFound',
};

// VALIDATION_ERROR는 field별 문구. 같은 칸의 다른 경우(72바이트 초과 등)는 화면이 lib/validate.ts로 먼저 거른다
const FIELD_MESSAGES: Record<string, Key> = {
  email: 'errEmail',
  phone: 'errPhone',
  password: 'errPasswordShort',
  newPassword: 'errPasswordShort',
  currentPassword: 'errPasswordRequired',
  name: 'errName',
  birthDate: 'errDate',
  date: 'errDate',
  to: 'errRange',
  image: 'errImage',
};

// 칸 아래에 보일 오류의 칸 이름. 없으면 토스트로 보인다(WF 2.4)
const CODE_FIELDS: Record<string, string> = {
  EMAIL_TAKEN: 'email',
  WRONG_PASSWORD: 'currentPassword',
  DUPLICATE_GROUP_NAME: 'name',
  CAPACITY_BELOW_COUNT: 'capacity',
};

export function errorField(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.field ?? CODE_FIELDS[error.code];
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return t('errFallback');
  const key =
    error.code === 'VALIDATION_ERROR'
      ? FIELD_MESSAGES[error.field ?? '']
      : CODE_MESSAGES[error.code];
  return t(key ?? 'errFallback');
}
