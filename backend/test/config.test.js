import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, resetDb } from './helpers.js';
import { loadConfig } from '../src/config.js';
import { ensurePermanentAdmin } from '../src/services/members.js';

// T-5 기동 실패
const base = {
  DATABASE_URL: 'postgresql://x/cal_todo_test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

after(() => pool.end());

test('JWT 비밀키가 없으면 기동 실패', () => {
  assert.throws(() => loadConfig({ ...base, JWT_ACCESS_SECRET: undefined }), /JWT_ACCESS_SECRET/);
});

test('31바이트 비밀키는 기동 실패', () => {
  assert.throws(() => loadConfig({ ...base, JWT_REFRESH_SECRET: 'b'.repeat(31) }), /32바이트/);
});

test('영구 관리자가 없는데 ADMIN_EMAIL이 없으면 기동 실패', async () => {
  await resetDb();
  await assert.rejects(ensurePermanentAdmin({ adminPassword: 'password1' }), /ADMIN_EMAIL/);
});

test('영구 관리자 확인을 두 번 해도 1명', async () => {
  await resetDb();
  const env = {
    adminEmail: 'admin@cal-todo.local',
    adminPassword: 'password1',
  };
  await ensurePermanentAdmin(env);
  await ensurePermanentAdmin(env);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM members WHERE is_permanent');
  assert.equal(rows[0].n, 1);
});

test('COOKIE_SAME_SITE: 기본 strict, none·lax 허용, 그 밖의 값은 기동 실패', () => {
  assert.equal(loadConfig(base).cookieSameSite, 'strict');
  assert.equal(loadConfig({ ...base, COOKIE_SAME_SITE: 'None' }).cookieSameSite, 'none');
  assert.equal(loadConfig({ ...base, COOKIE_SAME_SITE: 'lax' }).cookieSameSite, 'lax');
  assert.throws(() => loadConfig({ ...base, COOKIE_SAME_SITE: 'off' }), /COOKIE_SAME_SITE/);
});
