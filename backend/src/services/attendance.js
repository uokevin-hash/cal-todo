import { pool, withTx } from '../db.js';
import { AppError } from '../errors.js';
import * as attendances from '../repositories/attendances.js';
import * as groups from '../repositories/groups.js';
import { displayMember } from './display.js';

const notFound = () => new AppError(404, 'NOT_FOUND', '요청한 대상을 찾을 수 없습니다');

// R-4: 같은 날짜 중복은 DB 제약 위반으로 알린다(NFR-4). R-6: 지난 날짜는 참석 불가
export async function insertAttendance(client, { memberId, groupId, date }) {
  let inserted;
  try {
    inserted = await attendances.insertAttendance(client, { memberId, groupId, date });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'attendances_member_id_date_key') {
      throw new AppError(409, 'ALREADY_ATTENDING', '이미 같은 날짜에 참석 중입니다');
    }
    throw err;
  }
  if (!inserted) throw new AppError(409, 'PAST_DATE', '지난 날짜에는 참석할 수 없습니다');
}

// AD-6: 그룹 행을 잠근 뒤 인원과 정원을 비교한다
async function attendLocked(client, memberId, groupId) {
  const group = await groups.lockById(client, groupId);
  if (!group) throw notFound();
  // R-3: 정원 초과 거부 (NFR-3, 그룹 행 FOR UPDATE)
  if ((await attendances.countByGroup(client, groupId)) >= group.capacity) {
    throw new AppError(409, 'CAPACITY_FULL', '정원이 가득 찼습니다');
  }
  await insertAttendance(client, { memberId, groupId, date: group.date });
  return { groupId };
}

// R-6: 오늘 포함 이후 날짜만
export const attendGroup = (memberId, groupId) =>
  withTx((client) => attendLocked(client, memberId, groupId));

// R-2: 그룹 없이 참석하면 그날의 기본 그룹. 없으면 요청한 정원으로 만든다(NFR-5)
export function attendDefault(memberId, date, capacity) {
  return withTx(async (client) => {
    if (!(await groups.findDefaultGroupId(client, date))) {
      if (capacity === undefined) {
        throw new AppError(400, 'VALIDATION_ERROR', '정원을 선택해 주세요', 'capacity');
      }
      await groups.insertDefaultGroup(client, { date, capacity, createdBy: memberId });
    }
    return attendLocked(client, memberId, await groups.findDefaultGroupId(client, date));
  });
}

// R-6: 멱등. 참석하지 않은 그룹이어도 성공, 그룹이 없으면 404
export async function cancel(memberId, groupId) {
  if (!(await groups.exists(pool, groupId))) throw notFound();
  await attendances.deleteAttendance(pool, { groupId, memberId });
}

// R-8: 관리자의 참석자 빼기
export async function removeAttendee(groupId, memberId) {
  if (!(await attendances.deleteAttendance(pool, { groupId, memberId }))) throw notFound();
}

const MAX_RANGE_DAYS = 93;
const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

// GET /attendance·GET /admin/groups 공통: 없으면 이번 달 1일~말일, 최대 93일(PRD 9장)
export async function resolveRange(filters) {
  const month = await groups.findMonthRange(pool);
  const from = filters.from ?? month.from;
  const to = filters.to ?? month.to;
  const days = dayNumber(to) - dayNumber(from) + 1;
  if (days < 1) throw new AppError(400, 'VALIDATION_ERROR', '올바른 날짜가 아닙니다', 'to');
  if (days > MAX_RANGE_DAYS) {
    throw new AppError(400, 'VALIDATION_ERROR', '조회 기간은 최대 93일입니다', 'to');
  }
  return { from, to };
}

// FR-14
export async function search(filters, isAdmin) {
  const range = await resolveRange(filters);
  const rows = await groups.search(pool, { ...filters, ...range, isAdmin });
  return rows.map((row) => ({
    ...row,
    attendees: row.attendees.map((m) => displayMember(m, isAdmin)),
  }));
}
