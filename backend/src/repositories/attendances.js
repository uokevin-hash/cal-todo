import { TODAY_SQL } from '../db.js';

export async function countByGroup(db, groupId) {
  const { rows } = await db.query(
    'SELECT count(*)::int AS n FROM attendances WHERE group_id = $1',
    [groupId],
  );
  return rows[0].n;
}

export async function isAttending(db, { groupId, memberId }) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM attendances WHERE group_id = $1 AND member_id = $2',
    [groupId, memberId],
  );
  return rowCount > 0;
}

// 같은 날짜 중복은 attendances_member_id_date_key 위반(23505, R-4)
// 오늘 이전 날짜면 넣지 않고 false(R-6)
export async function insertAttendance(db, { memberId, groupId, date }) {
  const { rowCount } = await db.query(
    `INSERT INTO attendances (member_id, group_id, date)
     SELECT $1, $2, $3 WHERE $3::date >= ${TODAY_SQL}`,
    [memberId, groupId, date],
  );
  return rowCount > 0;
}

export async function deleteAttendance(db, { groupId, memberId }) {
  const { rowCount } = await db.query(
    'DELETE FROM attendances WHERE group_id = $1 AND member_id = $2',
    [groupId, memberId],
  );
  return rowCount > 0;
}

// R-9: 오늘(R-12) 포함 이후 참석만 지운다
export async function deleteFromToday(db, memberId) {
  await db.query(`DELETE FROM attendances WHERE member_id = $1 AND date >= ${TODAY_SQL}`, [
    memberId,
  ]);
}
