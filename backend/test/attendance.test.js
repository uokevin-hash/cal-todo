import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { backdate, createMember, FUTURE, json, pool, resetDb, startServer } from './helpers.js';

// T-5 원자성·동시성, R-2 ~ R-6
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
const count = async (sql, params) => (await pool.query(sql, params)).rows.length;

// M-4 검증 쿼리: 정원 초과 그룹, 같은 날짜 중복 참석이 0행이어야 한다
async function assertM4() {
  assert.equal(
    await count(`SELECT g.id FROM groups g JOIN attendances a ON a.group_id = g.id
                 GROUP BY g.id, g.capacity HAVING count(*) > g.capacity`),
    0,
  );
  assert.equal(
    await count('SELECT member_id, date FROM attendances GROUP BY 1, 2 HAVING count(*) > 1'),
    0,
  );
}

test('그룹 생성: attend 기본 true, 날짜 상세에 상태·인원·참석자', async () => {
  const minsu = await createMember(url);
  const created = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '토요복식', capacity: 4 }),
  );
  assert.equal(created.status, 201);
  assert.deepEqual(Object.keys(created.body), ['id']);

  const { body } = await json(await minsu.call('GET', `/dates/${DATE}/groups`));
  assert.deepEqual(body, [
    {
      id: created.body.id,
      name: '토요복식',
      capacity: 4,
      count: 1,
      status: 'AVAILABLE',
      createdBy: { memberId: minsu.id, name: '민수' },
      attendees: [{ memberId: minsu.id, name: '민수' }],
      mine: true,
    },
  ]);
});

test('그룹 생성: attend=false는 0명, 중복 이름 409, 정원 3은 400, 지난 날짜는 attend와 상관없이 409', async () => {
  const minsu = await createMember(url);
  const g = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, {
      name: '단식',
      capacity: 2,
      attend: false,
    }),
  );
  assert.equal(g.status, 201);
  const [detail] = (await json(await minsu.call('GET', `/dates/${DATE}/groups`))).body;
  assert.deepEqual([detail.count, detail.mine, detail.attendees], [0, false, []]);

  const dup = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '단식', capacity: 2 }),
  );
  assert.deepEqual([dup.status, dup.body.error.code], [409, 'DUPLICATE_GROUP_NAME']);

  const bad = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '셋', capacity: 3 }),
  );
  assert.deepEqual([bad.status, bad.body.error.field], [400, 'capacity']);

  const past = await json(
    await minsu.call('POST', '/dates/2026-09-01/groups', { name: '지난', capacity: 4 }),
  );
  assert.deepEqual([past.status, past.body.error.code], [409, 'PAST_DATE']); // R-6
  const pastNoAttend = await json(
    await minsu.call('POST', '/dates/2026-09-01/groups', { name: '지난', capacity: 4, attend: false }),
  );
  assert.deepEqual([pastNoAttend.status, pastNoAttend.body.error.code], [409, 'PAST_DATE']);
  assert.equal(await count("SELECT 1 FROM groups WHERE date = '2026-09-01'"), 0);
});

test('원자성: attend=true인데 그날 참석 중이면 409, 그룹도 생기지 않음', async () => {
  const minsu = await createMember(url);
  await minsu.call('POST', `/dates/${DATE}/groups`, { name: 'A', capacity: 4 });
  const res = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: 'B', capacity: 4 }),
  );
  assert.deepEqual([res.status, res.body.error.code], [409, 'ALREADY_ATTENDING']);
  assert.equal(await count('SELECT 1 FROM groups WHERE date = $1 AND name = $2', [DATE, 'B']), 0);
});

test('R-2: 이름 `기본`으로 그룹 생성 → 400 field name, 그룹 없음', async () => {
  const minsu = await createMember(url);
  const res = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '기본', capacity: 4 }),
  );
  assert.deepEqual(
    [res.status, res.body.error.code, res.body.error.field],
    [400, 'VALIDATION_ERROR', 'name'],
  );
  assert.equal(await count("SELECT 1 FROM groups WHERE date = '2026-09-01'"), 0);
});

test('캘린더: 그룹 수·그룹명(인원)과 내 참석, month 없으면 이번 달, 형식 오류 400', async () => {
  const minsu = await createMember(url);
  const created = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: 'A', capacity: 4 }),
  );
  const { body } = await json(await minsu.call('GET', '/calendar?month=2026-10'));
  assert.deepEqual(body, {
    month: '2026-10',
    days: [
      {
        date: DATE,
        groupCount: 1,
        groups: [{ id: created.body.id, name: 'A', count: 1, mine: true }],
        attending: true,
      },
    ],
  });

  const { rows } = await pool.query(
    "SELECT to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') AS month",
  );
  assert.equal((await json(await minsu.call('GET', '/calendar'))).body.month, rows[0].month);

  const bad = await json(await minsu.call('GET', '/calendar?month=2026-13'));
  assert.deepEqual([bad.status, bad.body.error.field], [400, 'month']);
});

test('그룹 없이 참석: 기본 그룹 없고 capacity 없으면 400, 있으면 생성 후 참석, 정원 차면 409', async () => {
  const [a, b, c] = await Promise.all([createMember(url), createMember(url), createMember(url)]);
  const date = '2026-10-05';
  const noCap = await json(await a.call('POST', `/dates/${date}/attendance`, {}));
  assert.deepEqual([noCap.status, noCap.body.error.field], [400, 'capacity']);

  const first = await json(await a.call('POST', `/dates/${date}/attendance`, { capacity: 2 }));
  assert.equal(first.status, 201);
  // 기본 그룹이 있으면 capacity 없이도 들어간다
  const second = await json(await b.call('POST', `/dates/${date}/attendance`, {}));
  assert.deepEqual(second, { status: 201, body: { groupId: first.body.groupId } });
  const full = await json(await c.call('POST', `/dates/${date}/attendance`, {}));
  assert.deepEqual([full.status, full.body.error.code], [409, 'CAPACITY_FULL']);
});

test('참석 취소: 204, 반복해도 204, 지난 날짜도 204, 없는 그룹·숫자 아닌 id는 404', async () => {
  const minsu = await createMember(url);
  const { body } = await json(
    await minsu.call('POST', `/dates/${FUTURE}/groups`, { name: 'A', capacity: 4 }),
  );
  await backdate(body.id, '2026-09-01');
  assert.equal((await minsu.call('DELETE', `/groups/${body.id}/attendance`)).status, 204);
  assert.equal(await count('SELECT 1 FROM attendances'), 0);
  assert.equal((await minsu.call('DELETE', `/groups/${body.id}/attendance`)).status, 204);
  const again = await json(await minsu.call('POST', `/groups/${body.id}/attendance`));
  assert.deepEqual([again.status, again.body.error.code], [409, 'PAST_DATE']); // R-6
  // 지난 날짜 그룹은 자리가 남아도 참석가능 필터에 나오지 않는다
  const past = async (query) =>
    (await json(await minsu.call('GET', `/attendance?from=2026-09-01&to=2026-09-01${query}`))).body;
  assert.equal((await past('')).length, 1);
  assert.deepEqual(await past('&status=AVAILABLE'), []);
  assert.equal((await minsu.call('DELETE', '/groups/9999/attendance')).status, 404);
  assert.equal((await minsu.call('DELETE', '/groups/abc/attendance')).status, 404);
  assert.equal((await minsu.call('POST', '/groups/9999/attendance')).status, 404);
});

test('동시성: 정원 4 그룹에 10명 동시 참석 → 성공 4, CAPACITY_FULL 6', async () => {
  const owner = await createMember(url);
  const { body } = await json(
    await owner.call('POST', `/dates/${DATE}/groups`, { name: 'A', capacity: 4, attend: false }),
  );
  const members = await Promise.all(Array.from({ length: 10 }, () => createMember(url)));
  const results = await Promise.all(
    members.map(async (m) => json(await m.call('POST', `/groups/${body.id}/attendance`))),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 4);
  assert.equal(results.filter((r) => r.body.error?.code === 'CAPACITY_FULL').length, 6);
  assert.equal(await count('SELECT 1 FROM attendances WHERE group_id = $1', [body.id]), 4);
  await assertM4();
});

test('동시성: 같은 회원이 같은 날짜 두 그룹에 동시 참석 → 1건만 성공', async () => {
  const owner = await createMember(url);
  const ids = [];
  for (const name of ['A', 'B']) {
    const { body } = await json(
      await owner.call('POST', `/dates/${DATE}/groups`, { name, capacity: 4, attend: false }),
    );
    ids.push(body.id);
  }
  const minsu = await createMember(url);
  const results = await Promise.all(
    ids.map(async (id) => json(await minsu.call('POST', `/groups/${id}/attendance`))),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.ok(results.some((r) => r.body.error?.code === 'ALREADY_ATTENDING'));
  await assertM4();
});

test('동시성: 같은 날짜 그룹 없이 참석 동시 요청 → 기본 그룹 1개', async () => {
  const members = await Promise.all(Array.from({ length: 6 }, () => createMember(url)));
  const results = await Promise.all(
    members.map(async (m) =>
      json(await m.call('POST', `/dates/${DATE}/attendance`, { capacity: 4 })),
    ),
  );
  assert.equal(await count("SELECT 1 FROM groups WHERE date = $1 AND name = '기본'", [DATE]), 1);
  assert.equal(results.filter((r) => r.status === 201).length, 4);
  assert.equal(results.filter((r) => r.body.error?.code === 'CAPACITY_FULL').length, 2);
  await assertM4();
});
