import { once } from 'node:events';

// 운영 DB를 지우지 않도록, DB에 닿기 전에 멈춘다(T-2)
if (!process.env.DATABASE_URL?.includes('_test')) {
  throw new Error('DATABASE_URL에 _test가 없습니다. 테스트를 중단합니다(T-2)');
}

const { pool } = await import('../src/db.js');
const { migrate } = await import('../src/migrate.js');
const { app } = await import('../src/app.js');

export { pool };

export async function resetDb() {
  await migrate();
  await pool.query(
    'TRUNCATE members, groups, attendances, refresh_tokens RESTART IDENTITY CASCADE',
  );
}

export async function startServer() {
  const server = app.listen(0);
  await once(server, 'listening');
  return {
    url: `http://localhost:${server.address().port}/api`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export const post = (url, body, headers = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

// Set-Cookie에서 "refresh_token=…" 부분만 꺼낸다
export const refreshCookie = (res) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith('refresh_token='))
    ?.split(';')[0];

let seq = 0;
export async function signup(url, overrides = {}) {
  const body = {
    name: '민수',
    email: `user${++seq}@example.com`,
    password: 'password123',
    phone: '010-1234-5678',
    birthDate: '1990-05-01',
    ...overrides,
  };
  const res = await post(`${url}/auth/signup`, body);
  if (res.status !== 201) throw new Error(`가입 실패 ${res.status}`);
  return body;
}

export async function login(url, { email, password }) {
  const res = await post(`${url}/auth/login`, { email, password });
  const { accessToken } = await res.json();
  return { accessToken, cookie: refreshCookie(res) };
}

// 토큰을 붙여 보내는 요청 함수. call('POST', '/groups/1/attendance', body)
export const caller = (url, accessToken) => (method, path, body) =>
  fetch(`${url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// 가입 + 로그인한 회원. role: 'ADMIN'이면 DB에서 관리자로 바꾼다
export async function createMember(url, { role, ...overrides } = {}) {
  const user = await signup(url, overrides);
  const { rows } = await pool.query(
    'UPDATE members SET role = coalesce($2, role) WHERE email = $1 AND deleted_at IS NULL RETURNING id',
    [user.email, role ?? null],
  );
  const tokens = await login(url, user);
  return { ...user, id: rows[0].id, ...tokens, call: caller(url, tokens.accessToken) };
}

export async function createPermanentAdmin(url) {
  const { ensurePermanentAdmin } = await import('../src/services/members.js');
  const user = { email: 'admin@example.com', password: 'adminpass1' };
  await ensurePermanentAdmin({ adminEmail: user.email, adminPassword: user.password });
  const { rows } = await pool.query('SELECT id FROM members WHERE is_permanent');
  const tokens = await login(url, user);
  return { ...user, id: rows[0].id, ...tokens, call: caller(url, tokens.accessToken) };
}

export const json = async (res) => ({ status: res.status, body: await res.json() });
