import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool, withTx } from '../db.js';
import { AppError } from '../errors.js';
import * as members from '../repositories/members.js';
import * as refreshTokens from '../repositories/refreshTokens.js';

export const REFRESH_TOKEN_TTL = '14d';

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', '로그인이 필요합니다');
const refreshRace = () => new AppError(401, 'REFRESH_RACE', '토큰 재발급을 다시 시도해 주세요');
const hashJti = (jti) => createHash('sha256').update(jti).digest('hex');

// type까지 맞아야 통과(C-7, NFR-9). 실패하면 jsonwebtoken 오류를 그대로 던진다
export function verifyToken(token, type) {
  const secret = type === 'access' ? config.accessSecret : config.refreshSecret;
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (payload.type !== type) throw new jwt.JsonWebTokenError('type 불일치');
  return payload;
}

// 6.1 흐름 2·4: 비밀번호 변경 전에 발급된 토큰 거부
export const isIssuedBeforePasswordChange = (payload, member) =>
  member.passwordChangedAt !== null && payload.iat < member.passwordChangedAt;

export async function issueTokens(db, memberId) {
  const jti = randomUUID();
  await refreshTokens.insertToken(db, { memberId, tokenHash: hashJti(jti) });
  return {
    accessToken: jwt.sign({ sub: memberId, type: 'access' }, config.accessSecret, {
      algorithm: 'HS256',
      expiresIn: config.accessTokenTtl,
    }),
    refreshToken: jwt.sign({ sub: memberId, jti, type: 'refresh' }, config.refreshSecret, {
      algorithm: 'HS256',
      expiresIn: REFRESH_TOKEN_TTL,
    }),
  };
}

// FR-18: 같은 이메일(소문자) 15분 안에 5회 실패 → 15분 거부
// 단순화: 서버 메모리라 재시작하면 초기화되고 서버 1대에서만 맞다. 여러 대가 되면 DB로 옮긴다
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const loginAttempts = new Map(); // email → { failures: [시각], lockedUntil }

function assertNotLocked(key) {
  if (loginAttempts.get(key)?.lockedUntil > Date.now()) {
    throw new AppError(
      429,
      'TOO_MANY_ATTEMPTS',
      '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요',
    );
  }
}

function recordFailure(key) {
  const now = Date.now();
  const failures = (loginAttempts.get(key)?.failures ?? []).filter((t) => now - t < LOGIN_LOCK_MS);
  failures.push(now);
  loginAttempts.set(
    key,
    failures.length >= MAX_LOGIN_FAILURES
      ? { failures: [], lockedUntil: now + LOGIN_LOCK_MS }
      : { failures, lockedUntil: 0 },
  );
}

// 6.1 흐름 1·9
export async function login({ email, password }) {
  const key = email.toLowerCase();
  assertNotLocked(key); // 비밀번호 확인 전에 거부
  const member = await members.findLoginByEmail(pool, email);
  // R-1, D-4: 없는 이메일·틀린 비밀번호·삭제된 회원 모두 같은 응답
  if (!member || !(await bcrypt.compare(password, member.passwordHash))) {
    recordFailure(key);
    throw new AppError(400, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }
  loginAttempts.delete(key);
  await refreshTokens.deleteExpired(pool, member.id);
  return issueTokens(pool, member.id);
}

// AD-5 판정 순서 그대로. 강제 폐기는 커밋한 뒤 401을 던진다
export async function refresh(token) {
  let payload;
  try {
    payload = verifyToken(token ?? '', 'refresh');
  } catch {
    throw unauthenticated();
  }
  const row = await refreshTokens.findByHash(pool, hashJti(payload.jti));
  if (!row) throw unauthenticated();

  // 6.1 흐름 5: 30초 유예는 ROTATED에만
  if (row.revokedReason === 'ROTATED' && row.isRecentlyRevoked) throw refreshRace();
  if (row.revokedReason === 'ROTATED') {
    await refreshTokens.revokeAllForMember(pool, row.memberId, 'FORCED'); // 탈취로 판단
    throw unauthenticated();
  }
  if (row.revokedReason) throw unauthenticated(); // LOGOUT·FORCED

  const member = await members.findAuthById(pool, row.memberId);
  if (member.isDeleted) {
    // R-9: 탈퇴 회원 토큰 전부 폐기(6.1 흐름 4)
    await refreshTokens.revokeAllForMember(pool, member.id, 'FORCED');
    throw unauthenticated();
  }
  if (isIssuedBeforePasswordChange(payload, member)) throw unauthenticated();

  return withTx(async (client) => {
    // 같은 토큰으로 동시에 들어온 요청 중 하나만 교체한다
    if (!(await refreshTokens.revokeById(client, row.id, 'ROTATED'))) throw refreshRace();
    return issueTokens(client, member.id);
  });
}

// 6.1 흐름 7: 쿠키가 없거나 무효여도 조용히 끝난다(멱등)
export async function logout(token) {
  let payload;
  try {
    payload = verifyToken(token ?? '', 'refresh');
  } catch {
    return;
  }
  await refreshTokens.revokeByHash(pool, hashJti(payload.jti), 'LOGOUT');
}
