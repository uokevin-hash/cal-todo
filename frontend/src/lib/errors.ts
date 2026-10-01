import { ApiError } from './client';

// N-15: 화면 문구는 오류 코드로 찾는다(SCR-n 문구). 서버 message는 화면에 쓰지 않는다
const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  WRONG_PASSWORD: '현재 비밀번호가 올바르지 않습니다',
  EMAIL_TAKEN: '이미 사용 중인 이메일입니다',
  CAPACITY_FULL: '정원이 가득 찼습니다',
  ALREADY_ATTENDING: '해당 날짜에 이미 참석한 그룹이 있습니다',
  DUPLICATE_GROUP_NAME: '같은 날짜에 같은 이름의 그룹이 있습니다',
  CAPACITY_BELOW_COUNT: '현재 참석 인원보다 정원을 작게 할 수 없습니다',
  TOO_MANY_ATTEMPTS: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요',
  UNAUTHENTICATED: '다시 로그인해 주세요',
  // 아래는 SCR에 문구가 없어 새로 정함
  PERMANENT_ADMIN_LOCKED: '영구 관리자는 바꿀 수 없습니다',
  MEMBER_DELETED: '삭제된 회원입니다',
  FORBIDDEN: '권한이 없습니다',
  NOT_FOUND: '대상을 찾을 수 없습니다',
};

// VALIDATION_ERROR는 field별 문구. 같은 칸의 다른 경우(72바이트 초과 등)는 화면이 lib/validate.ts로 먼저 거른다
const FIELD_MESSAGES: Record<string, string> = {
  email: '올바른 이메일 형식이 아닙니다',
  phone: '올바른 전화번호 형식이 아닙니다',
  password: '비밀번호는 8자 이상이어야 합니다',
  newPassword: '비밀번호는 8자 이상이어야 합니다',
  currentPassword: '비밀번호를 입력해 주세요',
  name: '이름을 입력해 주세요',
  birthDate: '올바른 날짜가 아닙니다',
  date: '올바른 날짜가 아닙니다',
  to: '조회 기간은 최대 93일입니다',
  image: '이미지가 너무 크거나 올릴 수 없는 형식입니다',
};

const FALLBACK = '잠시 후 다시 시도해 주세요';

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
  if (!(error instanceof ApiError)) return FALLBACK;
  if (error.code === 'VALIDATION_ERROR') return FIELD_MESSAGES[error.field ?? ''] ?? FALLBACK;
  return CODE_MESSAGES[error.code] ?? FALLBACK;
}
