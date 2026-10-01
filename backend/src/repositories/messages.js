const AUTHOR_SQL = `json_build_object('memberId', m.id, 'name', m.name,
                                     'isDeleted', m.deleted_at IS NOT NULL) AS author`;

// 최근 limit개를 오래된 순으로. 이미지 바이트는 목록에 싣지 않는다
export async function findByGroup(db, groupId, limit) {
  const { rows } = await db.query(
    `SELECT * FROM (
       SELECT gm.id, gm.body, gm.image IS NOT NULL AS "hasImage",
              gm.created_at AS "createdAt", ${AUTHOR_SQL}
       FROM group_messages gm JOIN members m ON m.id = gm.member_id
       WHERE gm.group_id = $1
       ORDER BY gm.id DESC LIMIT $2
     ) x ORDER BY id`,
    [groupId, limit],
  );
  return rows;
}

export async function insertMessage(db, { groupId, memberId, body }) {
  const { rows } = await db.query(
    'INSERT INTO group_messages (group_id, member_id, body) VALUES ($1, $2, $3) RETURNING id',
    [groupId, memberId, body],
  );
  return rows[0];
}

export async function insertImage(db, { groupId, memberId, image, imageType }) {
  const { rows } = await db.query(
    `INSERT INTO group_messages (group_id, member_id, body, image, image_type)
     VALUES ($1, $2, '', $3, $4) RETURNING id`,
    [groupId, memberId, image, imageType],
  );
  return rows[0];
}

export async function findImage(db, { groupId, messageId }) {
  const { rows } = await db.query(
    `SELECT image, image_type AS "imageType" FROM group_messages
     WHERE id = $1 AND group_id = $2 AND image IS NOT NULL`,
    [messageId, groupId],
  );
  return rows[0];
}

// 그룹을 지우기 전에 같은 트랜잭션에서 호출한다. 메시지가 없으면 보관하지 않는다
export async function archiveGroupChat(db, groupId) {
  await db.query(
    `WITH archive AS (
       INSERT INTO chat_archives (group_id, date, name)
       SELECT g.id, g.date, g.name FROM groups g
       WHERE g.id = $1 AND EXISTS (SELECT 1 FROM group_messages WHERE group_id = $1)
       RETURNING id
     )
     INSERT INTO archived_messages (archive_id, member_id, body, image, image_type, created_at)
     SELECT archive.id, gm.member_id, gm.body, gm.image, gm.image_type, gm.created_at
     FROM archive, group_messages gm WHERE gm.group_id = $1
     ORDER BY gm.id`,
    [groupId],
  );
}

export async function findArchives(db) {
  const { rows } = await db.query(
    `SELECT ca.id, ca.group_id AS "groupId", ca.date, ca.name, ca.deleted_at AS "deletedAt",
            count(am.id)::int AS "messageCount"
     FROM chat_archives ca JOIN archived_messages am ON am.archive_id = ca.id
     GROUP BY ca.id
     ORDER BY ca.deleted_at DESC, ca.id DESC`,
  );
  return rows;
}

export async function archiveExists(db, id) {
  const { rowCount } = await db.query('SELECT 1 FROM chat_archives WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function findArchivedMessages(db, archiveId) {
  const { rows } = await db.query(
    `SELECT am.id, am.body, am.image IS NOT NULL AS "hasImage",
            am.created_at AS "createdAt", ${AUTHOR_SQL}
     FROM archived_messages am JOIN members m ON m.id = am.member_id
     WHERE am.archive_id = $1
     ORDER BY am.id`,
    [archiveId],
  );
  return rows;
}

export async function findArchivedImage(db, { archiveId, messageId }) {
  const { rows } = await db.query(
    `SELECT image, image_type AS "imageType" FROM archived_messages
     WHERE id = $1 AND archive_id = $2 AND image IS NOT NULL`,
    [messageId, archiveId],
  );
  return rows[0];
}

// 보관 메시지는 ON DELETE CASCADE로 함께 지워진다
export async function deleteArchive(db, id) {
  const { rowCount } = await db.query('DELETE FROM chat_archives WHERE id = $1', [id]);
  return rowCount > 0;
}
