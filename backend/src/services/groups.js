import { pool, withTx } from '../db.js';
import { AppError } from '../errors.js';
import * as attendances from '../repositories/attendances.js';
import * as groups from '../repositories/groups.js';
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

// R-13
export async function deleteGroup(id) {
  if (!(await groups.deleteGroup(pool, id))) throw notFound();
}
