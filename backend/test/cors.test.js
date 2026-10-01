import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { cors } from '../src/cors.js';
import { loadConfig } from '../src/config.js';

// C-18: 허용 목록의 출처에만 CORS 헤더
const ALLOWED = 'http://localhost:5173';
let server;
let url;
before(async () => {
  const app = express();
  app.use(cors([ALLOWED]));
  app.get('/x', (req, res) => res.json({ ok: true }));
  server = app.listen(0);
  await once(server, 'listening');
  url = `http://localhost:${server.address().port}/x`;
});
after(() => new Promise((resolve) => server.close(resolve)));

test('허용한 출처: Allow-Origin·Allow-Credentials, preflight 204', async () => {
  const res = await fetch(url, { headers: { Origin: ALLOWED } });
  assert.equal(res.headers.get('access-control-allow-origin'), ALLOWED);
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');

  const pre = await fetch(url, { method: 'OPTIONS', headers: { Origin: ALLOWED } });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-headers'), /Authorization/);
  assert.match(pre.headers.get('access-control-allow-methods'), /PATCH/);
});

test('허용하지 않은 출처·Origin 없음: CORS 헤더 없음', async () => {
  for (const headers of [{ Origin: 'https://evil.example.com' }, {}]) {
    const res = await fetch(url, { headers });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
});

test('CORS_ORIGINS 파싱: 쉼표 구분·공백 제거, 없으면 빈 목록', () => {
  const base = {
    DATABASE_URL: 'postgresql://x/cal_todo_test',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };
  assert.deepEqual(loadConfig(base).corsOrigins, []);
  assert.deepEqual(
    loadConfig({ ...base, CORS_ORIGINS: ' http://a.com , https://b.com,' }).corsOrigins,
    ['http://a.com', 'https://b.com'],
  );
});
