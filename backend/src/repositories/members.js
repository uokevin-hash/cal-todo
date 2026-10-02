import { likePattern, pool, TODAY_SQL } from '../db.js';

export async function hasPermanentAdmin() {
  const { rows } = await pool.query('SELECT 1 FROM members WHERE is_permanent');
  return rows.length > 0;
}

// 동시 기동에도 1명만 생긴다(부분 유니크 인덱스 + ON CONFLICT, C-16)
export async function insertPermanentAdmin({ email, passwordHash }) {
  await pool.query(
    `INSERT INTO members (name, email, password_hash, phone, birth_date, role, is_permanent)
     VALUES ('시스템관리자', $1, $2, '010-0000-0000', '1970-01-01', 'ADMIN', true)
     ON CONFLICT (is_permanent) WHERE is_permanent DO NOTHING`,
    [email, passwordHash],
  );
}

export async function isAfterToday(date) {
  const { rows } = await pool.query(`SELECT $1::date > ${TODAY_SQL} AS after`, [date]);
  return rows[0].after;
}

// 활성 이메일 중복은 members_email_key 위반(23505)으로 알린다(R-9)
export async function insertMember(db, { name, email, passwordHash, phone, birthDate }) {
  await db.query(
    `INSERT INTO members (name, email, password_hash, phone, birth_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [name, email, passwordHash, phone, birthDate],
  );
}

// 해시는 로그인 조회에서만 고른다(C-6)
export async function findLoginByEmail(db, email) {
  const { rows } = await db.query(
    `SELECT id, password_hash AS "passwordHash"
     FROM members WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
    [email],
  );
  return rows[0];
}

// 토큰 검증·관리자 수정 대상 판단용. password_changed_at은 밀리초(6.1 흐름 2)
export async function findAuthById(db, id) {
  const { rows } = await db.query(
    `SELECT id, role, is_permanent AS "isPermanent", deleted_at IS NOT NULL AS "isDeleted",
            (extract(epoch FROM password_changed_at) * 1000)::float8 AS "passwordChangedAt"
     FROM members WHERE id = $1`,
    [id],
  );
  return rows[0];
}

// GET /me 필드. 해시는 고르지 않는다(C-6)
const ME_COLUMNS = `id, name, email, phone, birth_date AS "birthDate",
  (EXTRACT(YEAR FROM ${TODAY_SQL}) - EXTRACT(YEAR FROM birth_date))::int AS age,
  role, is_permanent AS "isPermanent"`;

export async function findMe(db, id) {
  const { rows } = await db.query(`SELECT ${ME_COLUMNS} FROM members WHERE id = $1`, [id]);
  return rows[0];
}

// GET /admin/members 한 행(PRD 9장). 관리자 응답이라 탈퇴 회원도 실명
const ADMIN_COLUMNS = `${ME_COLUMNS}, deleted_at IS NOT NULL AS "isDeleted"`;

export async function findAdminRow(db, id) {
  const { rows } = await db.query(`SELECT ${ADMIN_COLUMNS} FROM members WHERE id = $1`, [id]);
  return rows[0];
}

// FR-16: 기본은 활성 회원만. FR-19: q는 이름·이메일 부분 일치
export async function listForAdmin(db, { includeDeleted, q }) {
  const like = q ? likePattern(q) : null;
  const { rows } = await db.query(
    `SELECT ${ADMIN_COLUMNS} FROM members
     WHERE (deleted_at IS NULL OR $1)
       AND ($2::text IS NULL OR name ILIKE $2 OR email ILIKE $2)
     ORDER BY id`,
    [includeDeleted, like],
  );
  return rows;
}

// 보낸 필드만 바꾼다(부분 갱신). 이메일 중복은 members_email_key 위반
export async function updateMember(db, id, { name, email, phone, birthDate, role }) {
  await db.query(
    `UPDATE members SET name = coalesce($2, name), email = coalesce($3, email),
       phone = coalesce($4, phone), birth_date = coalesce($5, birth_date), role = coalesce($6, role)
     WHERE id = $1`,
    [id, name ?? null, email ?? null, phone ?? null, birthDate ?? null, role ?? null],
  );
}

// 해시는 비밀번호 확인에서만 고른다(C-6)
export async function findPasswordHash(db, id) {
  const { rows } = await db.query('SELECT password_hash FROM members WHERE id = $1', [id]);
  return rows[0].password_hash;
}

// 6.1 흐름 8: 이 시각 이전에 발급된 토큰은 거부된다
export async function updatePassword(db, id, passwordHash) {
  await db.query(
    'UPDATE members SET password_hash = $2, password_changed_at = now() WHERE id = $1',
    [id, passwordHash],
  );
}

export async function markDeleted(db, id) {
  await db.query('UPDATE members SET deleted_at = now() WHERE id = $1', [id]);
}
