import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import { loginAttempts } from '../src/services/auth.js';
import {
  caller,
  login,
  pool,
  post,
  refreshCookie,
  resetDb,
  signup,
  startServer,
} from './helpers.js';

// T-5 인증·응답
let server;
let url;
before(async () => {
  server = await startServer();
  url = server.url;
});
after(async () => {
  await server.close();
  await pool.end();
});
beforeEach(async () => {
  await resetDb();
  loginAttempts.clear();
});

const errorOf = async (res) => (await res.json()).error;
const refresh = (cookie) => post(`${url}/auth/refresh`, {}, cookie ? { Cookie: cookie } : {});
const getMe = (token) =>
  fetch(`${url}/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
const revokedReasons = async () =>
  (await pool.query('SELECT revoked_reason FROM refresh_tokens ORDER BY id')).rows.map(
    (r) => r.revoked_reason,
  );

test('가입: 201 본문 없음, 활성 이메일 중복 409, 삭제된 회원 이메일은 재사용', async () => {
  const user = await signup(url);
  const dup = await post(`${url}/auth/signup`, {
    ...user,
    email: user.email.toUpperCase(),
  });
  assert.equal(dup.status, 409);
  assert.equal((await errorOf(dup)).code, 'EMAIL_TAKEN');

  await pool.query('UPDATE members SET deleted_at = now() WHERE email = $1', [user.email]);
  const res = await post(`${url}/auth/signup`, user);
  assert.equal(res.status, 201);
  assert.equal(await res.text(), '');
});

test('가입: 잘못된 전화번호·미래 생년월일은 400 VALIDATION_ERROR', async () => {
  const base = {
    name: '민수',
    email: 'a@example.com',
    password: 'password123',
  };
  const phone = await post(`${url}/auth/signup`, {
    ...base,
    phone: '02-123-4567',
    birthDate: '1990-01-01',
  });
  assert.equal(phone.status, 400);
  assert.deepEqual(await errorOf(phone), {
    code: 'VALIDATION_ERROR',
    message: '올바른 전화번호 형식이 아닙니다',
    field: 'phone',
  });
  const future = await post(`${url}/auth/signup`, {
    ...base,
    phone: '01012345678',
    birthDate: '2999-01-01',
  });
  assert.equal((await errorOf(future)).field, 'birthDate');
});

test('로그인 실패: 틀린 비밀번호·없는 이메일·삭제된 회원은 INVALID_CREDENTIALS, 누락은 VALIDATION_ERROR', async () => {
  const user = await signup(url);
  for (const body of [
    { email: user.email, password: 'wrongpass1' },
    { email: 'nobody@example.com', password: 'password123' },
  ]) {
    const res = await post(`${url}/auth/login`, body);
    assert.equal(res.status, 400);
    assert.equal((await errorOf(res)).code, 'INVALID_CREDENTIALS');
  }

  const missing = await post(`${url}/auth/login`, { email: user.email });
  assert.equal(missing.status, 400);
  assert.deepEqual(await errorOf(missing), {
    code: 'VALIDATION_ERROR',
    message: '비밀번호는 8자 이상이어야 합니다',
    field: 'password',
  });

  await pool.query('UPDATE members SET deleted_at = now()');
  const deleted = await post(`${url}/auth/login`, user);
  assert.equal((await errorOf(deleted)).code, 'INVALID_CREDENTIALS');
});

test('로그인 성공: accessToken 본문 + HttpOnly·SameSite=Strict·Path=/api/auth 쿠키', async () => {
  const user = await signup(url);
  const res = await post(`${url}/auth/login`, user);
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(await res.json()), ['accessToken']);
  const cookie = res.headers.getSetCookie()[0];
  assert.match(cookie, /^refresh_token=/);
  assert.match(cookie, /Path=\/api\/auth/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
});

test('GET /me: 정해진 키만, 해시 없음, 나이 계산. 토큰 없으면 401', async () => {
  const user = await signup(url, { birthDate: '1990-12-31' });
  const { accessToken } = await login(url, user);
  const res = await getMe(accessToken);
  assert.equal(res.status, 200);
  const me = await res.json();
  assert.deepEqual(Object.keys(me).sort(), [
    'age',
    'birthDate',
    'email',
    'id',
    'isPermanent',
    'name',
    'phone',
    'role',
  ]);
  const { rows } = await pool.query(
    "SELECT EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Seoul')::int - 1990 AS age",
  );
  assert.equal(me.age, rows[0].age);
  assert.equal(me.birthDate, '1990-12-31');
  assert.equal(me.role, 'MEMBER');
  assert.equal(me.isPermanent, false);

  const none = await getMe();
  assert.equal(none.status, 401);
  assert.equal((await errorOf(none)).code, 'UNAUTHENTICATED');
});

test('Access Token: 만료 → TOKEN_EXPIRED, alg none·다른 비밀키·type 불일치 → UNAUTHENTICATED', async () => {
  await signup(url);
  const exp = Math.floor(Date.now() / 1000) - 10;
  const expired = jwt.sign({ sub: 1, type: 'access', exp }, config.accessSecret);
  assert.equal((await errorOf(await getMe(expired))).code, 'TOKEN_EXPIRED');

  const tokens = [
    jwt.sign({ sub: 1, type: 'access' }, null, { algorithm: 'none' }),
    jwt.sign({ sub: 1, type: 'access' }, 'x'.repeat(32)),
    jwt.sign({ sub: 1, type: 'refresh' }, config.accessSecret),
  ];
  for (const token of tokens) {
    const res = await getMe(token);
    assert.equal(res.status, 401);
    assert.equal((await errorOf(res)).code, 'UNAUTHENTICATED');
  }
});

test('Access Token: 비밀번호 변경 전 발급·탈퇴 회원 → UNAUTHENTICATED', async () => {
  const user = await signup(url);
  const { accessToken } = await login(url, user);
  await pool.query("UPDATE members SET password_changed_at = now() + interval '2 seconds'");
  assert.equal((await errorOf(await getMe(accessToken))).code, 'UNAUTHENTICATED');

  await pool.query('UPDATE members SET password_changed_at = NULL, deleted_at = now()');
  assert.equal((await errorOf(await getMe(accessToken))).code, 'UNAUTHENTICATED');
});

test('재발급: 교체(ROTATED), 30초 이내 재사용 REFRESH_RACE, 30초 경과 전부 FORCED', async () => {
  const user = await signup(url);
  const { cookie: oldCookie } = await login(url, user);

  const res = await refresh(oldCookie);
  assert.equal(res.status, 200);
  assert.ok((await res.json()).accessToken);
  const newCookie = refreshCookie(res);
  assert.notEqual(newCookie, oldCookie);
  assert.deepEqual(await revokedReasons(), ['ROTATED', null]);

  // 30초 이내: 다른 토큰은 유지
  const race = await refresh(oldCookie);
  assert.equal(race.status, 401);
  assert.equal((await errorOf(race)).code, 'REFRESH_RACE');
  assert.deepEqual(await revokedReasons(), ['ROTATED', null]);

  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = now() - interval '31 seconds' WHERE revoked_at IS NOT NULL",
  );
  assert.equal((await errorOf(await refresh(oldCookie))).code, 'UNAUTHENTICATED');
  assert.deepEqual(await revokedReasons(), ['ROTATED', 'FORCED']);
  assert.equal((await errorOf(await refresh(newCookie))).code, 'UNAUTHENTICATED');
});

test('재발급: LOGOUT·FORCED로 폐기된 토큰은 30초 이내라도 UNAUTHENTICATED', async () => {
  const user = await signup(url);
  const a = await login(url, user);
  const b = await login(url, user);

  const out = await post(`${url}/auth/logout`, {}, { Cookie: a.cookie });
  assert.equal(out.status, 204);
  assert.match(out.headers.getSetCookie()[0], /^refresh_token=;/);
  assert.equal((await errorOf(await refresh(a.cookie))).code, 'UNAUTHENTICATED');

  // 탈퇴 회원 재발급 → 전부 FORCED, 그 토큰 재사용도 UNAUTHENTICATED
  await pool.query('UPDATE members SET deleted_at = now()');
  assert.equal((await errorOf(await refresh(b.cookie))).code, 'UNAUTHENTICATED');
  assert.deepEqual(await revokedReasons(), ['LOGOUT', 'FORCED']);
  assert.equal((await errorOf(await refresh(b.cookie))).code, 'UNAUTHENTICATED');
});

test('재발급: 쿠키 없음·위조 → UNAUTHENTICATED, 로그아웃은 쿠키 없이도 204', async () => {
  assert.equal((await errorOf(await refresh())).code, 'UNAUTHENTICATED');
  assert.equal((await errorOf(await refresh('refresh_token=garbage'))).code, 'UNAUTHENTICATED');
  assert.equal((await post(`${url}/auth/logout`, {})).status, 204);
});

test('PATCH /me 비밀번호 변경: 현재 세션은 새 토큰으로 유지, 다른 기기 Access·Refresh는 401', async () => {
  const user = await signup(url);
  const a = await login(url, user);
  const b = await login(url, user);

  const res = await caller(url, a.accessToken)('PATCH', '/me', {
    currentPassword: user.password,
    newPassword: 'newpass123',
  });
  assert.equal(res.status, 200);
  const { accessToken } = await res.json();
  assert.ok(refreshCookie(res));
  assert.equal((await getMe(accessToken)).status, 200);
  assert.equal((await errorOf(await getMe(a.accessToken))).code, 'UNAUTHENTICATED');
  assert.equal((await errorOf(await getMe(b.accessToken))).code, 'UNAUTHENTICATED');
  assert.equal((await errorOf(await refresh(b.cookie))).code, 'UNAUTHENTICATED');
  assert.equal((await post(`${url}/auth/refresh`, {}, { Cookie: refreshCookie(res) })).status, 200);
});

test('PATCH /me: 틀린 현재 비밀번호 400 WRONG_PASSWORD(다른 기기 유지), role 무시, {} 200, 이메일 중복 409', async () => {
  const other = await signup(url);
  const user = await signup(url);
  const a = await login(url, user);
  const b = await login(url, user);
  const call = caller(url, a.accessToken);

  const wrong = await call('PATCH', '/me', {
    currentPassword: 'wrongpass1',
    newPassword: 'newpass123',
  });
  assert.equal(wrong.status, 400);
  assert.deepEqual(await errorOf(wrong), {
    code: 'WRONG_PASSWORD',
    message: '현재 비밀번호가 올바르지 않습니다',
    field: 'currentPassword',
  });
  assert.equal((await getMe(b.accessToken)).status, 200);

  const renamed = await call('PATCH', '/me', { name: '새이름', role: 'ADMIN', isPermanent: true });
  const me = await renamed.json();
  assert.deepEqual(
    [renamed.status, me.name, me.role, me.isPermanent],
    [200, '새이름', 'MEMBER', false],
  );
  assert.deepEqual(await (await call('PATCH', '/me', {})).json(), me);

  const dup = await call('PATCH', '/me', { email: other.email });
  assert.deepEqual([dup.status, (await errorOf(dup)).code], [409, 'EMAIL_TAKEN']);
  const noCurrent = await call('PATCH', '/me', { newPassword: 'newpass123' });
  assert.equal((await errorOf(noCurrent)).field, 'currentPassword');
});

test('로그인 시도 제한: 5회 실패 뒤 맞는 비밀번호도 429, 다른 이메일은 영향 없음, 15분 지나면 200', async () => {
  const user = await signup(url);
  const other = await signup(url);
  for (let i = 0; i < 5; i++) {
    const res = await post(`${url}/auth/login`, {
      email: user.email.toUpperCase(),
      password: 'wrongpass1',
    });
    assert.equal((await errorOf(res)).code, 'INVALID_CREDENTIALS');
  }
  const locked = await post(`${url}/auth/login`, user);
  assert.equal(locked.status, 429);
  assert.equal((await errorOf(locked)).code, 'TOO_MANY_ATTEMPTS');
  assert.equal((await post(`${url}/auth/login`, other)).status, 200);

  loginAttempts.get(user.email).lockedUntil = Date.now() - 1; // 15분 경과 흉내
  assert.equal((await post(`${url}/auth/login`, user)).status, 200);
});

test('재발급·로그아웃: 허용하지 않은 출처에서 쿠키로 부르면 403(CSRF), 허용 목록 밖이라 CORS 헤더도 없음', async () => {
  const user = await signup(url);
  const cookie = refreshCookie(await post(`${url}/auth/login`, user));
  for (const path of ['/auth/refresh', '/auth/logout']) {
    const res = await post(
      `${url}${path}`,
      {},
      { Cookie: cookie, Origin: 'https://evil.example.com' },
    );
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
  // 막힌 요청은 토큰을 바꾸지 않았으므로 원래 쿠키로 재발급된다
  assert.equal((await post(`${url}/auth/refresh`, {}, { Cookie: cookie })).status, 200);
});
