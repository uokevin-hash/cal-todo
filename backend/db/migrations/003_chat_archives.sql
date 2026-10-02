-- 삭제된 그룹의 채팅 보관함. 관리자만 열람한다
-- 그룹 행은 지워지므로 그룹 정보는 삭제 시점의 값을 복사해 둔다(FK 없음)
CREATE TABLE chat_archives (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id   INTEGER     NOT NULL,  -- 삭제된 그룹의 원래 id
    date       DATE        NOT NULL,
    name       TEXT        NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE archived_messages (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    archive_id INTEGER     NOT NULL REFERENCES chat_archives (id) ON DELETE CASCADE,
    member_id  INTEGER     NOT NULL REFERENCES members (id),
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL  -- 원래 메시지를 쓴 시각
);

CREATE INDEX archived_messages_archive_id_idx ON archived_messages (archive_id, id);
