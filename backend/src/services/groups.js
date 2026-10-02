import { pool, withTx } from '../db.js';
import { AppError } from '../errors.js';
import * as attendances from '../repositories/attendances.js';
import * as groups from '../repositories/groups.js';
import * as messages from '../repositories/messages.js';
import { insertAttendance, resolveRange } from './attendance.js';
import { displayMember } from './display.js';

const notFound = () => new AppError(404, 'NOT_FOUND', '요청한 대상을 찾을 수 없습니다');
const reservedName = () =>
  new AppError(400, 'VALIDATION_ERROR', '`기본`은 그룹 이름으로 쓸 수 없습니다', 'name');

// 같은 날짜 그룹명 중복은 DB 제약 위반으로 알린다(groups_date_name_key)
const duplicateNameOr = (err) =>
  err.code === '23505' && err.constraint === 'groups_date_name_key'
    ? new AppError(409, 'DUPLICATE_GROUP_NAME', '같은 날짜에 같은 이름의 그룹이 있습니다')
    : err;

export async function getCalendar(memberId, month) {
  const range = await groups.findMonthRange(pool, month);
  return { month: range.month, days: await groups.findCalendarDays(pool, { ...range, memberId }) };
}

export async function getDateGroups(date, member) {
  const isAdmin = member.role === 'ADMIN';
  const rows = await groups.findByDate(pool, { date, memberId: member.id });
  return rows.map((row) => ({
    ...row,
    createdBy: displayMember(row.createdBy, isAdmin),
    attendees: row.attendees.map((m) => displayMember(m, isAdmin)),
  }));
}

// UC-6, AD-6 E3: 그룹 생성과 참석을 한 트랜잭션으로. 참석이 409면 그룹도 남지 않는다
export async function createGroup(memberId, { date, name, capacity, attend }) {
  if (name === groups.DEFAULT_GROUP_NAME) throw reservedName(); // R-2: 기본 그룹 전용 이름
  return withTx(async (client) => {
    const id = await groups
      .insertGroup(client, { date, name, capacity, createdBy: memberId })
      .catch((err) => {
        throw duplicateNameOr(err);
      });
    if (!id) throw new AppError(409, 'PAST_DATE', '지난 날짜에는 그룹을 만들 수 없습니다'); // R-6
    if (attend) await insertAttendance(client, { memberId, groupId: id, date }); // R-2, R-4
    return { id };
  });
}

// 관리자 응답: 탈퇴 회원도 실명 + isDeleted(R-9)
const toAdminRow = (row) => ({ ...row, createdBy: displayMember(row.createdBy, true) });

// FR-17, UC-9
export async function listGroupsForAdmin(filters) {
  const rows = await groups.findAdminRows(pool, await resolveRange(filters));
  return rows.map(toAdminRow);
}

// FR-12. 날짜는 바꾸지 않는다
export function updateGroup(id, { name, capacity }) {
  return withTx(async (client) => {
    const group = await groups.lockById(client, id);
    if (!group) throw notFound();
    // R-2: 기본으로 바꾸거나 기본 그룹의 이름을 바꿀 수 없다
    const isDefault = group.name === groups.DEFAULT_GROUP_NAME;
    if (name !== undefined && (name === groups.DEFAULT_GROUP_NAME) !== isDefault) {
      throw reservedName();
    }
    // R-3: 정원을 현재 인원보다 작게 바꿀 수 없다(그룹 행 FOR UPDATE)
    if (capacity !== undefined && capacity < (await attendances.countByGroup(client, id))) {
      throw new AppError(409, 'CAPACITY_BELOW_COUNT', '현재 참석 인원보다 작게 바꿀 수 없습니다');
    }
    await groups.updateGroup(client, id, { name, capacity }).catch((err) => {
      throw duplicateNameOr(err);
    });
    const [row] = await groups.findAdminRows(client, { id });
    return toAdminRow(row);
  });
}

// R-13. 채팅은 보관함으로 옮긴 뒤 그룹과 함께 지운다(관리자만 열람)
// 그룹 행을 먼저 잠가 보관과 삭제 사이에 새 메시지가 끼지 않게 한다(메시지 INSERT의 FK 확인이 기다린다)
export function deleteGroup(id) {
  return withTx(async (client) => {
    if (!(await groups.lockById(client, id))) throw notFound();
    await removeGroup(client, id);
  });
}

async function removeGroup(client, id) {
  await messages.archiveGroupChat(client, id);
  await groups.deleteGroup(client, id);
}

// 참석 취소 + 마지막 참석자였으면 그룹 삭제. 참석 중인 회원만 그룹을 지울 수 있다
// 그룹 행 잠금으로 참석 등록(같은 행 FOR UPDATE)과 겹치지 않게 한다
export function leaveAndDeleteIfEmpty(groupId, memberId) {
  return withTx(async (client) => {
    if (!(await groups.lockById(client, groupId))) throw notFound();
    const wasAttending = await attendances.deleteAttendance(client, { groupId, memberId });
    const isEmpty = (await attendances.countByGroup(client, groupId)) === 0;
    if (wasAttending && isEmpty) await removeGroup(client, groupId);
    return { groupDeleted: wasAttending && isEmpty };
  });
}

export function listChatArchives() {
  return messages.findArchives(pool);
}

export async function getArchivedImage(archiveId, messageId) {
  const row = await messages.findArchivedImage(pool, { archiveId, messageId });
  if (!row) throw notFound();
  return row;
}

export async function deleteChatArchive(id) {
  if (!(await messages.deleteArchive(pool, id))) throw notFound();
}

export async function getArchivedMessages(archiveId) {
  if (!(await messages.archiveExists(pool, archiveId))) throw notFound();
  const rows = await messages.findArchivedMessages(pool, archiveId);
  return rows.map((row) => ({ ...row, author: displayMember(row.author, true) }));
}

// 그룹 채팅: 그 그룹에 참석 중인 회원만 읽고 쓴다
const MESSAGE_LIMIT = 100;

async function assertAttendee(groupId, memberId) {
  if (!(await groups.exists(pool, groupId))) throw notFound();
  if (!(await attendances.isAttending(pool, { groupId, memberId }))) {
    throw new AppError(403, 'FORBIDDEN', '그룹 참석자만 채팅할 수 있습니다');
  }
}

export async function listMessages(groupId, member) {
  await assertAttendee(groupId, member.id);
  const rows = await messages.findByGroup(pool, groupId, MESSAGE_LIMIT);
  // R-9: 탈퇴 회원이 남긴 메시지도 이름을 가린다(C-10)
  return rows.map((row) => ({
    ...row,
    author: displayMember(row.author, member.role === 'ADMIN'),
  }));
}

export async function postMessage(groupId, memberId, body) {
  await assertAttendee(groupId, memberId);
  return messages.insertMessage(pool, { groupId, memberId, body });
}

export async function postImage(groupId, memberId, { image, imageType }) {
  await assertAttendee(groupId, memberId);
  return messages.insertImage(pool, { groupId, memberId, image, imageType });
}

export async function getImage(groupId, messageId, memberId) {
  await assertAttendee(groupId, memberId);
  const row = await messages.findImage(pool, { groupId, messageId });
  if (!row) throw notFound();
  return row;
}
