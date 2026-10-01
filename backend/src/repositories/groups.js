import { likePattern, TODAY_SQL } from '../db.js';

// R-5: 상태는 저장하지 않고 계산
const STATUS_SQL = `CASE WHEN count(a.id) >= g.capacity THEN 'FULL' ELSE 'AVAILABLE' END`;
const member = (alias) =>
  `json_build_object('memberId', ${alias}.id, 'name', ${alias}.name, 'isDeleted', ${alias}.deleted_at IS NOT NULL)`;
const ATTENDEES_SQL = `coalesce(json_agg(${member('m')} ORDER BY a.created_at, a.id)
  FILTER (WHERE a.id IS NOT NULL), '[]')`;

// month가 없으면 이번 달(Asia/Seoul, C-11)
export async function findMonthRange(db, month) {
  const { rows } = await db.query(
    `SELECT to_char(m, 'YYYY-MM') AS month, m AS "from",
            (m + interval '1 month - 1 day')::date AS "to"
     FROM (SELECT coalesce(to_date($1, 'YYYY-MM'), date_trunc('month', ${TODAY_SQL})::date) AS m) x`,
    [month ?? null],
  );
  return rows[0];
}

// 그룹이 있거나 내가 참석한 날짜만
export async function findCalendarDays(db, { from, to, memberId }) {
  const { rows } = await db.query(
    `SELECT coalesce(g.date, a.date) AS date, coalesce(g.n, 0) AS "groupCount",
            a.date IS NOT NULL AS attending
     FROM (SELECT date, count(*)::int AS n FROM groups
           WHERE date BETWEEN $1 AND $2 GROUP BY date) g
     FULL JOIN (SELECT date FROM attendances
                WHERE member_id = $3 AND date BETWEEN $1 AND $2) a ON a.date = g.date
     ORDER BY 1`,
    [from, to, memberId],
  );
  return rows;
}

// 날짜 상세를 한 쿼리로(NFR-2)
export async function findByDate(db, { date, memberId }) {
  const { rows } = await db.query(
    `SELECT g.id, g.name, g.capacity, count(a.id)::int AS count, ${STATUS_SQL} AS status,
            ${member('c')} AS "createdBy", ${ATTENDEES_SQL} AS attendees,
            coalesce(bool_or(a.member_id = $2), false) AS mine
     FROM groups g
     JOIN members c ON c.id = g.created_by
     LEFT JOIN attendances a ON a.group_id = g.id
     LEFT JOIN members m ON m.id = a.member_id
     WHERE g.date = $1
     GROUP BY g.id, c.id
     ORDER BY g.created_at, g.id`,
    [date, memberId],
  );
  return rows;
}

// GET /admin/groups 행(PRD 9장). id 하나 또는 기간으로 고른다
export async function findAdminRows(db, { id = null, from = null, to = null }) {
  const { rows } = await db.query(
    `SELECT g.id, g.date, g.name, g.capacity, count(a.id)::int AS count, ${STATUS_SQL} AS status,
            ${member('c')} AS "createdBy"
     FROM groups g
     JOIN members c ON c.id = g.created_by
     LEFT JOIN attendances a ON a.group_id = g.id
     WHERE ($1::int IS NULL OR g.id = $1) AND ($2::date IS NULL OR g.date BETWEEN $2 AND $3)
     GROUP BY g.id, c.id
     ORDER BY g.date, g.created_at, g.id`,
    [id, from, to],
  );
  return rows;
}

// 같은 이름은 groups_date_name_key 위반(23505)
export async function insertGroup(db, { date, name, capacity, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO groups (date, name, capacity, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [date, name, capacity, createdBy],
  );
  return rows[0].id;
}

export const DEFAULT_GROUP_NAME = '기본';

export async function findDefaultGroupId(db, date) {
  const { rows } = await db.query('SELECT id FROM groups WHERE date = $1 AND name = $2', [
    date,
    DEFAULT_GROUP_NAME,
  ]);
  return rows[0]?.id;
}

// NFR-5: 동시에 만들어도 하나만 생긴다
export async function insertDefaultGroup(db, { date, capacity, createdBy }) {
  await db.query(
    `INSERT INTO groups (date, name, capacity, created_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (date, name) DO NOTHING`,
    [date, DEFAULT_GROUP_NAME, capacity, createdBy],
  );
}

// NFR-3: 같은 그룹 요청은 여기서 한 줄로 선다. 인원은 잠금 뒤 따로 센다
export async function lockById(db, id) {
  const { rows } = await db.query(
    'SELECT id, date, name, capacity FROM groups WHERE id = $1 FOR UPDATE',
    [id],
  );
  return rows[0];
}

export async function exists(db, id) {
  const { rows } = await db.query('SELECT 1 FROM groups WHERE id = $1', [id]);
  return rows.length > 0;
}

export async function updateGroup(db, id, { name, capacity }) {
  await db.query(
    'UPDATE groups SET name = coalesce($2, name), capacity = coalesce($3, capacity) WHERE id = $1',
    [id, name ?? null, capacity ?? null],
  );
}

// R-13: 참석은 ON DELETE CASCADE로 함께 지워진다
export async function deleteGroup(db, id) {
  const { rowCount } = await db.query('DELETE FROM groups WHERE id = $1', [id]);
  return rowCount > 0;
}

// GET /attendance. 조건 조각과 params를 함께 쌓는다(C-5)
export async function search(db, { from, to, group, name, status, capacity, isAdmin }) {
  const params = [from, to];
  const conditions = ['g.date BETWEEN $1 AND $2'];

  if (group) {
    params.push(likePattern(group));
    conditions.push(`g.name ILIKE $${params.length}`);
  }
  if (capacity) {
    params.push(capacity);
    conditions.push(`g.capacity = $${params.length}`);
  }
  if (name) {
    params.push(likePattern(name), isAdmin);
    // R-9: 비관리자 검색에는 탈퇴 회원이 실명으로 걸리지 않는다(C-10)
    conditions.push(`EXISTS (SELECT 1 FROM attendances a2 JOIN members m2 ON m2.id = a2.member_id
      WHERE a2.group_id = g.id AND m2.name ILIKE $${params.length - 1}
        AND (m2.deleted_at IS NULL OR $${params.length}))`);
  }
  const having = status ? `HAVING ${STATUS_SQL} = $${params.push(status)}` : '';

  const { rows } = await db.query(
    `SELECT g.date, g.id AS "groupId", g.name AS "groupName", g.capacity,
            count(a.id)::int AS count, ${STATUS_SQL} AS status, ${ATTENDEES_SQL} AS attendees
     FROM groups g
     LEFT JOIN attendances a ON a.group_id = g.id
     LEFT JOIN members m ON m.id = a.member_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY g.id
     ${having}
     ORDER BY g.date, g.created_at, g.id`,
    params,
  );
  return rows;
}
