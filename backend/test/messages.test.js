import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMember, json, pool, resetDb, startServer } from './helpers.js';

// 그룹 채팅: 참석자만 읽고 쓴다
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

test('채팅: 참석자만 읽고 쓰기, 오래된 순, 빈 메시지 400, 없는 그룹 404', async () => {
  const minsu = await createMember(url, { name: '김민수' });
  const jieun = await createMember(url, { name: '이지은' });
  const outsider = await createMember(url, { name: '외부인' });
  const { body: group } = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '토요복식', capacity: 4 }),
  );
  await jieun.call('POST', `/groups/${group.id}/attendance`);

  assert.equal(
    (await minsu.call('POST', `/groups/${group.id}/messages`, { body: ' 안녕 ' })).status,
    201,
  );
  await jieun.call('POST', `/groups/${group.id}/messages`, { body: '반가워요' });
  const { status, body } = await json(await jieun.call('GET', `/groups/${group.id}/messages`));
  assert.equal(status, 200);
  assert.deepEqual(
    body.map((m) => [m.author.name, m.body]),
    [
      ['김민수', '안녕'],
      ['이지은', '반가워요'],
    ],
  );

  const forbidden = await json(await outsider.call('GET', `/groups/${group.id}/messages`));
  assert.deepEqual([forbidden.status, forbidden.body.error.code], [403, 'FORBIDDEN']);
  const empty = await json(
    await minsu.call('POST', `/groups/${group.id}/messages`, { body: '  ' }),
  );
  assert.deepEqual([empty.status, empty.body.error.field], [400, 'body']);
  const long = await minsu.call('POST', `/groups/${group.id}/messages`, { body: 'a'.repeat(501) });
  assert.equal(long.status, 400);
  assert.equal((await minsu.call('GET', '/groups/999999/messages')).status, 404);

  // 참석을 취소하면 더 읽지 못한다
  await jieun.call('DELETE', `/groups/${group.id}/attendance`);
  assert.equal((await jieun.call('GET', `/groups/${group.id}/messages`)).status, 403);
});

test('채팅: 탈퇴 회원 이름은 비관리자에게 가린다, 그룹 삭제 시 채팅은 보관함으로', async () => {
  const minsu = await createMember(url, { name: '김민수' });
  const choi = await createMember(url, { name: '최민호' });
  const admin = await createMember(url, { role: 'ADMIN' });
  const { body: group } = await json(
    await minsu.call('POST', `/dates/2026-09-20/groups`, { name: '지난모임', capacity: 4 }),
  );
  await choi.call('POST', `/groups/${group.id}/attendance`);
  await choi.call('POST', `/groups/${group.id}/messages`, { body: '저 나가요' });
  await pool.query('UPDATE members SET deleted_at = now() WHERE id = $1', [choi.id]);

  const { body } = await json(await minsu.call('GET', `/groups/${group.id}/messages`));
  assert.deepEqual(body[0].author, { memberId: choi.id, name: '탈퇴 회원' });

  await minsu.call('POST', `/groups/${group.id}/messages`, { body: '수고했어요' });
  assert.equal((await admin.call('DELETE', `/admin/groups/${group.id}`)).status, 204);
  assert.equal((await pool.query('SELECT 1 FROM group_messages')).rowCount, 0);

  // 관리자만 보관함을 본다. 탈퇴 회원도 실명 + isDeleted
  const archives = await json(await admin.call('GET', '/admin/chats'));
  assert.equal(archives.status, 200);
  assert.deepEqual(
    archives.body.map((a) => [a.groupId, a.date, a.name, a.messageCount]),
    [[group.id, '2026-09-20', '지난모임', 2]],
  );
  const archiveUrl = `/admin/chats/${archives.body[0].id}/messages`;
  const archived = await json(await admin.call('GET', archiveUrl));
  assert.deepEqual(
    archived.body.map((m) => [m.author, m.body]),
    [
      [{ memberId: choi.id, name: '최민호', isDeleted: true }, '저 나가요'],
      [{ memberId: minsu.id, name: '김민수' }, '수고했어요'],
    ],
  );
  assert.equal((await minsu.call('GET', '/admin/chats')).status, 403);
  assert.equal((await minsu.call('GET', archiveUrl)).status, 403);
  assert.equal((await admin.call('GET', '/admin/chats/999999/messages')).status, 404);
});

test('채팅 보관: 메시지가 없던 그룹은 보관하지 않는다, 없는 그룹 삭제는 404', async () => {
  const minsu = await createMember(url);
  const admin = await createMember(url, { role: 'ADMIN' });
  const { body: group } = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '조용한모임', capacity: 2 }),
  );
  await admin.call('DELETE', `/admin/groups/${group.id}`);
  assert.deepEqual((await json(await admin.call('GET', '/admin/chats'))).body, []);
  assert.equal((await admin.call('DELETE', `/admin/groups/${group.id}`)).status, 404);
});

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const upload = (member, groupId, body, type = 'image/png') =>
  fetch(`${url}/groups/${groupId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${member.accessToken}`, 'Content-Type': type },
    body,
  });

test('채팅 이미지: 참석자만 올리고 받기, 형식·크기 400, 보관함에도 남는다', async () => {
  const minsu = await createMember(url);
  const outsider = await createMember(url);
  const admin = await createMember(url, { role: 'ADMIN' });
  const { body: group } = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '사진방', capacity: 4 }),
  );

  const created = await json(await upload(minsu, group.id, PNG));
  assert.equal(created.status, 201);
  const { body: list } = await json(await minsu.call('GET', `/groups/${group.id}/messages`));
  assert.deepEqual([list[0].hasImage, list[0].body], [true, '']);

  const image = await minsu.call('GET', `/groups/${group.id}/messages/${created.body.id}/image`);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), PNG);

  assert.equal((await upload(outsider, group.id, PNG)).status, 403);
  const imageUrl = `/groups/${group.id}/messages/${created.body.id}/image`;
  assert.equal((await outsider.call('GET', imageUrl)).status, 403);
  const svg = await json(await upload(minsu, group.id, '<svg/>', 'image/svg+xml'));
  assert.deepEqual([svg.status, svg.body.error.field], [400, 'image']);
  const big = await json(await upload(minsu, group.id, Buffer.alloc(2 * 1024 * 1024 + 1)));
  assert.deepEqual([big.status, big.body.error.field], [400, 'image']);

  await admin.call('DELETE', `/admin/groups/${group.id}`);
  const [archive] = (await json(await admin.call('GET', '/admin/chats'))).body;
  const archived = (await json(await admin.call('GET', `/admin/chats/${archive.id}/messages`)))
    .body;
  assert.equal(archived[0].hasImage, true);
  const archivedImage = await admin.call(
    'GET',
    `/admin/chats/${archive.id}/messages/${archived[0].id}/image`,
  );
  assert.deepEqual(Buffer.from(await archivedImage.arrayBuffer()), PNG);
});

test('채팅 보관함 삭제: 관리자만, 메시지도 함께, 없으면 404', async () => {
  const minsu = await createMember(url);
  const admin = await createMember(url, { role: 'ADMIN' });
  const { body: group } = await json(
    await minsu.call('POST', `/dates/${DATE}/groups`, { name: '지울방', capacity: 4 }),
  );
  await minsu.call('POST', `/groups/${group.id}/messages`, { body: '안녕' });
  await admin.call('DELETE', `/admin/groups/${group.id}`);
  const [archive] = (await json(await admin.call('GET', '/admin/chats'))).body;

  assert.equal((await minsu.call('DELETE', `/admin/chats/${archive.id}`)).status, 403);
  assert.equal((await admin.call('DELETE', `/admin/chats/${archive.id}`)).status, 204);
  assert.deepEqual((await json(await admin.call('GET', '/admin/chats'))).body, []);
  assert.equal((await pool.query('SELECT 1 FROM archived_messages')).rowCount, 0);
  assert.equal((await admin.call('DELETE', `/admin/chats/${archive.id}`)).status, 404);
});
