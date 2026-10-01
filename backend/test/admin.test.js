import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMember,
  createPermanentAdmin,
  json,
  login,
  pool,
  post,
  resetDb,
  startServer,
} from './helpers.js';

// T-5 권한·회원 삭제·정원·그룹 삭제·탈퇴 회원
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
beforeEach(resetDb);

const DATE = '2026-10-03';
const codeOf = async (res) => [res.status, (await res.json()).error?.code];

async function createGroup(member, { name = 'A', capacity = 4, date = DATE, attend = true } = {}) {
  const res = await member.call('POST', `/dates/${date}/groups`, { name, capacity, attend });
  return (await res.json()).id;
}

async function seoulDays() {
  const { rows } = await pool.query(
    `SELECT (now() AT TIME ZONE 'Asia/Seoul')::date AS today,
            ((now() AT TIME ZONE 'Asia/Seoul')::date - 1) AS yesterday`,
  );
  return rows[0];
}

test('권한: 회원이 /admin/* → 403 FORBIDDEN', async () => {
  const minsu = await createMember(url);
  assert.deepEqual(await codeOf(await minsu.call('GET', '/admin/members')), [403, 'FORBIDDEN']);
  assert.deepEqual(await codeOf(await minsu.call('DELETE', '/admin/groups/1')), [403, 'FORBIDDEN']);
});

test('영구 관리자: 삭제·역할 해제·이메일·비밀번호 변경 → 409 PERMANENT_ADMIN_LOCKED, 이름은 200', async () => {
  const root = await createPermanentAdmin(url);
  const admin = await createMember(url, { role: 'ADMIN' });
  const path = `/admin/members/${root.id}`;
  for (const body of [
    { role: 'MEMBER' },
    { email: 'x@example.com' },
    { newPassword: 'newpass123' },
  ]) {
    assert.deepEqual(await codeOf(await admin.call('PATCH', path, body)), [
      409,
      'PERMANENT_ADMIN_LOCKED',
    ]);
  }
  assert.deepEqual(await codeOf(await admin.call('DELETE', path)), [409, 'PERMANENT_ADMIN_LOCKED']);
  assert.equal((await admin.call('PATCH', path, { name: '대표' })).status, 200);
});

test('관리자 자기 삭제 403, 자기 newPassword 403(비밀번호 그대로), 이름만 200 = 목록 한 행, {} 200', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const path = `/admin/members/${admin.id}`;
  assert.deepEqual(await codeOf(await admin.call('DELETE', path)), [403, 'FORBIDDEN']);

  const before = (await pool.query('SELECT password_hash, password_changed_at FROM members')).rows;
  assert.deepEqual(await codeOf(await admin.call('PATCH', path, { newPassword: 'newpass123' })), [
    403,
    'FORBIDDEN',
  ]);
  assert.deepEqual(
    (await pool.query('SELECT password_hash, password_changed_at FROM members')).rows,
    before,
  );

  const patched = await json(await admin.call('PATCH', path, { name: '새이름' }));
  assert.equal(patched.status, 200);
  const list = await json(await admin.call('GET', '/admin/members'));
  assert.deepEqual(patched.body, list.body[0]);
  assert.deepEqual(Object.keys(patched.body).sort(), [
    'age',
    'birthDate',
    'email',
    'id',
    'isDeleted',
    'isPermanent',
    'name',
    'phone',
    'role',
  ]);
  assert.equal(patched.body.name, '새이름');
  assert.deepEqual(await json(await admin.call('PATCH', path, {})), patched);
});

test('회원 삭제: 오늘 이후 참석 삭제, 어제 참석·만든 그룹 유지, Access 401·로그인 실패, 재가입 201', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const minsu = await createMember(url);
  const { today, yesterday } = await seoulDays();
  await createGroup(minsu, { date: today });
  await createGroup(minsu, { date: yesterday });

  assert.equal((await admin.call('DELETE', `/admin/members/${minsu.id}`)).status, 204);
  const dates = (await pool.query('SELECT date FROM attendances WHERE member_id = $1', [minsu.id]))
    .rows;
  assert.deepEqual(dates, [{ date: yesterday }]);
  assert.equal(
    (await pool.query('SELECT 1 FROM groups WHERE created_by = $1', [minsu.id])).rowCount,
    2,
  );

  assert.deepEqual(await codeOf(await minsu.call('GET', '/me')), [401, 'UNAUTHENTICATED']);
  assert.deepEqual(await codeOf(await post(`${url}/auth/login`, minsu)), [
    400,
    'INVALID_CREDENTIALS',
  ]);
  const path = `/admin/members/${minsu.id}`;
  assert.deepEqual(await codeOf(await admin.call('PATCH', path, { name: 'x' })), [
    409,
    'MEMBER_DELETED',
  ]);
  assert.deepEqual(await codeOf(await admin.call('DELETE', path)), [409, 'MEMBER_DELETED']);
  assert.equal((await post(`${url}/auth/signup`, minsu)).status, 201);
});

test('관리자 목록: 기본 활성만, includeDeleted, q 이름·이메일 부분 일치(FR-19)', async () => {
  const admin = await createMember(url, { role: 'ADMIN', name: '관리자' });
  const minji = await createMember(url, { name: '이민지', email: 'minji@example.com' });
  await createMember(url, { name: '박서준', email: 'sj@example.com' });
  await admin.call('DELETE', `/admin/members/${minji.id}`);

  const names = async (query) =>
    (await json(await admin.call('GET', `/admin/members${query}`))).body.map((m) => m.name);
  assert.deepEqual(await names(''), ['관리자', '박서준']);
  assert.deepEqual(await names('?includeDeleted=true'), ['관리자', '이민지', '박서준']);
  assert.deepEqual(await names('?q=MIN&includeDeleted=true'), ['이민지']);
  assert.deepEqual(await names('?q=MIN'), []);
  assert.deepEqual(await names('?q=서준'), ['박서준']);
  assert.deepEqual(await names(`?q=${encodeURIComponent("' OR 1=1")}`), []);
});

test('역할 변경은 즉시 반영, Refresh는 유지. 관리자 비밀번호 지정은 기존 토큰 전부 무효', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const minsu = await createMember(url);
  const path = `/admin/members/${minsu.id}`;

  await admin.call('PATCH', path, { role: 'ADMIN' });
  assert.equal((await minsu.call('GET', '/admin/members')).status, 200);
  await admin.call('PATCH', path, { role: 'MEMBER' });
  assert.equal((await minsu.call('GET', '/admin/members')).status, 403);
  assert.equal((await post(`${url}/auth/refresh`, {}, { Cookie: minsu.cookie })).status, 200);

  const again = await login(url, minsu);
  await new Promise((r) => setTimeout(r, 1000)); // iat와 password_changed_at이 다른 초가 되도록
  assert.equal((await admin.call('PATCH', path, { newPassword: 'newpass123' })).status, 200);
  assert.deepEqual(
    await codeOf(
      await fetch(`${url}/me`, {
        headers: { Authorization: `Bearer ${again.accessToken}` },
      }),
    ),
    [401, 'UNAUTHENTICATED'],
  );
  assert.deepEqual(await codeOf(await post(`${url}/auth/refresh`, {}, { Cookie: again.cookie })), [
    401,
    'UNAUTHENTICATED',
  ]);
  assert.equal((await post(`${url}/auth/login`, { ...minsu, password: 'newpass123' })).status, 200);
});

test('정원 변경: 인원 3인 그룹을 2로 → 409 CAPACITY_BELOW_COUNT, 1명 빼고 다시 → 200', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const [a, b, c] = await Promise.all([createMember(url), createMember(url), createMember(url)]);
  const id = await createGroup(a);
  await b.call('POST', `/groups/${id}/attendance`);
  await c.call('POST', `/groups/${id}/attendance`);

  assert.deepEqual(
    await codeOf(await admin.call('PATCH', `/admin/groups/${id}`, { capacity: 2 })),
    [409, 'CAPACITY_BELOW_COUNT'],
  );
  assert.equal((await admin.call('DELETE', `/admin/groups/${id}/attendance/${c.id}`)).status, 204);
  assert.equal((await admin.call('DELETE', `/admin/groups/${id}/attendance/${c.id}`)).status, 404);
  const res = await json(await admin.call('PATCH', `/admin/groups/${id}`, { capacity: 2 }));
  assert.deepEqual(res, {
    status: 200,
    body: {
      id,
      date: DATE,
      name: 'A',
      capacity: 2,
      count: 2,
      status: 'FULL',
      createdBy: { memberId: a.id, name: '민수' },
    },
  });
});

test('R-2: 다른 그룹을 `기본`으로, `기본` 그룹 이름 변경 → 400 field name, `기본` 정원 변경 200', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const id = await createGroup(admin, { name: 'A', attend: false });
  const { groupId } = await (
    await admin.call('POST', `/dates/${DATE}/attendance`, { capacity: 2 })
  ).json();

  for (const [gid, name] of [
    [id, '기본'],
    [groupId, '새이름'],
  ]) {
    const res = await json(await admin.call('PATCH', `/admin/groups/${gid}`, { name }));
    assert.deepEqual([res.status, res.body.error.field], [400, 'name']);
  }
  assert.equal(
    (await admin.call('PATCH', `/admin/groups/${groupId}`, { capacity: 4 })).status,
    200,
  );
  assert.deepEqual(
    await codeOf(await admin.call('PATCH', `/admin/groups/${id}`, { name: '기본' })),
    [400, 'VALIDATION_ERROR'],
  );
});

test('그룹 삭제: 참석자가 같은 날짜 다른 그룹에 참석 201, 기본 그룹 삭제 후 다시 생성', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const minsu = await createMember(url);
  const first = await createGroup(minsu, { name: 'A' });
  const other = await createGroup(admin, { name: 'B', attend: false });

  assert.equal((await admin.call('DELETE', `/admin/groups/${first}`)).status, 204);
  assert.equal((await admin.call('DELETE', `/admin/groups/${first}`)).status, 404);
  assert.equal((await minsu.call('POST', `/groups/${other}/attendance`)).status, 201); // R-13

  const d = '2026-10-10';
  const { groupId } = await (
    await minsu.call('POST', `/dates/${d}/attendance`, { capacity: 2 })
  ).json();
  await admin.call('DELETE', `/admin/groups/${groupId}`);
  const again = await json(await minsu.call('POST', `/dates/${d}/attendance`, { capacity: 4 }));
  assert.equal(again.status, 201);
  assert.notEqual(again.body.groupId, groupId);
});

test('탈퇴 회원: 비관리자에게 "탈퇴 회원"(memberId 유지), 관리자에게 실명 + isDeleted, 비관리자 이름 검색 0건', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const viewer = await createMember(url, { name: '구경꾼' });
  const jieun = await createMember(url, { name: '이지은' });
  const groupId = await createGroup(jieun, { date: '2026-09-15' }); // 지난 참석은 남는다
  await admin.call('DELETE', `/admin/members/${jieun.id}`);

  const hidden = { memberId: jieun.id, name: '탈퇴 회원' };
  const shown = { memberId: jieun.id, name: '이지은', isDeleted: true };

  const [g] = (await json(await viewer.call('GET', '/dates/2026-09-15/groups'))).body;
  assert.deepEqual([g.createdBy, g.attendees], [hidden, [hidden]]);
  const [ga] = (await json(await admin.call('GET', '/dates/2026-09-15/groups'))).body;
  assert.deepEqual([ga.createdBy, ga.attendees], [shown, [shown]]);

  const range = 'from=2026-09-01&to=2026-09-30';
  const rows = (await json(await viewer.call('GET', `/attendance?${range}`))).body;
  assert.deepEqual(rows[0].attendees, [hidden]);
  assert.ok(!JSON.stringify(rows).includes('이지은'));
  const byName = `/attendance?${range}&name=${encodeURIComponent('이지')}`;
  assert.deepEqual((await json(await viewer.call('GET', byName))).body, []);
  const adminRows = (await json(await admin.call('GET', byName))).body;
  assert.deepEqual([adminRows[0].groupId, adminRows[0].attendees], [groupId, [shown]]);
});

test('참석 현황: 이름·상태·정원·그룹명 필터, 기간 기본값·93일, SQL 주입 문자열', async () => {
  const [a, b, c] = await Promise.all([
    createMember(url, { name: '이지은' }),
    createMember(url, { name: '박서준' }),
    createMember(url, { name: '김민수' }),
  ]);
  const full = await createGroup(a, { name: '토요단식', capacity: 2, date: '2026-10-03' });
  await b.call('POST', `/groups/${full}/attendance`);
  const open = await createGroup(c, { name: '일요복식', capacity: 4, date: '2026-10-04' });

  const ids = async (query) =>
    (await json(await a.call('GET', `/attendance?from=2026-10-01&to=2026-10-07${query}`))).body.map(
      (r) => r.groupId,
    );
  assert.deepEqual(await ids(`&name=${encodeURIComponent('이지')}`), [full]);
  assert.deepEqual(await ids('&status=AVAILABLE&capacity=4'), [open]);
  assert.deepEqual(await ids('&status=FULL'), [full]);
  assert.deepEqual(await ids(`&group=${encodeURIComponent('복식')}`), [open]);
  assert.deepEqual(await ids(`&name=${encodeURIComponent("' OR 1=1 --")}`), []);
  assert.deepEqual(await ids('&name=%25'), []); // %는 글자 그대로

  const [row] = (await json(await a.call('GET', '/attendance?from=2026-10-03&to=2026-10-03'))).body;
  assert.deepEqual(row, {
    date: '2026-10-03',
    groupId: full,
    groupName: '토요단식',
    capacity: 2,
    count: 2,
    status: 'FULL',
    attendees: [
      { memberId: a.id, name: '이지은' },
      { memberId: b.id, name: '박서준' },
    ],
  });

  // 기본값: 이번 달 1일~말일
  await createGroup(a, { name: '지난달', date: '2000-01-01', attend: false });
  const thisMonth = (await json(await a.call('GET', '/attendance'))).body;
  assert.ok(thisMonth.every((r) => r.date !== '2000-01-01'));

  const tooLong = await json(await a.call('GET', '/attendance?from=2026-10-01&to=2027-01-02'));
  assert.deepEqual([tooLong.status, tooLong.body.error.field], [400, 'to']);
  assert.equal((await a.call('GET', '/attendance?from=2026-10-01&to=2027-01-01')).status, 200);
  assert.equal((await a.call('GET', '/attendance?from=2000-01-01&to=2000-01-31')).status, 200);
  assert.equal((await a.call('GET', '/attendance?status=NOPE')).status, 400);
});

test('관리자 그룹 목록: 기간 안만, 탈퇴 회원이 만든 그룹은 실명 + isDeleted, 회원 403, 94일 400', async () => {
  const admin = await createMember(url, { role: 'ADMIN' });
  const jieun = await createMember(url, { name: '이지은' });
  // 지난 날짜라 탈퇴 뒤에도 참석이 남는다(R-9)
  const inRange = await createGroup(jieun, { name: '안', date: '2026-01-15' });
  await createGroup(jieun, { name: '밖', date: '2026-02-01', attend: false });
  await admin.call('DELETE', `/admin/members/${jieun.id}`);

  const list = await json(await admin.call('GET', '/admin/groups?from=2026-01-01&to=2026-01-31'));
  assert.deepEqual(list, {
    status: 200,
    body: [
      {
        id: inRange,
        date: '2026-01-15',
        name: '안',
        capacity: 4,
        count: 1,
        status: 'AVAILABLE',
        createdBy: { memberId: jieun.id, name: '이지은', isDeleted: true },
      },
    ],
  });

  const minsu = await createMember(url);
  assert.deepEqual(await codeOf(await minsu.call('GET', '/admin/groups')), [403, 'FORBIDDEN']);
  const tooLong = await json(
    await admin.call('GET', '/admin/groups?from=2026-10-01&to=2027-01-02'),
  );
  assert.deepEqual([tooLong.status, tooLong.body.error.field], [400, 'to']);
  assert.equal((await admin.call('GET', '/admin/groups')).status, 200);
});
