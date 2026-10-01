-- 그룹 채팅 메시지. 그룹이 삭제되면 함께 지운다(R-13)
CREATE TABLE group_messages (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id   INTEGER     NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    member_id  INTEGER     NOT NULL REFERENCES members (id),
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT group_messages_body_check CHECK (char_length(body) BETWEEN 1 AND 500)
);

CREATE INDEX group_messages_group_id_idx ON group_messages (group_id, id);
