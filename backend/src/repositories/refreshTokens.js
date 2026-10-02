// 폐기 사유: ROTATED(교체), LOGOUT(로그아웃), FORCED(강제 폐기). 6.1 흐름 5

export async function deleteExpired(db, memberId) {
  await db.query('DELETE FROM refresh_tokens WHERE member_id = $1 AND expires_at < now()', [
    memberId,
  ]);
}

export async function insertToken(db, { memberId, tokenHash }) {
  await db.query(
    `INSERT INTO refresh_tokens (member_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '14 days')`,
    [memberId, tokenHash],
  );
}

export async function findByHash(db, tokenHash) {
  const { rows } = await db.query(
    `SELECT id, member_id AS "memberId", revoked_reason AS "revokedReason",
            revoked_at > now() - interval '30 seconds' AS "isRecentlyRevoked"
     FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  return rows[0];
}

// 아직 유효한 행만 바꾼다. 바뀐 행이 없으면 false(동시 교체에 진 쪽)
export async function revokeById(db, id, reason) {
  const { rowCount } = await db.query(
    `UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $2
     WHERE id = $1 AND revoked_at IS NULL`,
    [id, reason],
  );
  return rowCount > 0;
}

export async function revokeByHash(db, tokenHash, reason) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $2
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash, reason],
  );
}

export async function revokeAllForMember(db, memberId, reason) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $2
     WHERE member_id = $1 AND revoked_at IS NULL`,
    [memberId, reason],
  );
}
