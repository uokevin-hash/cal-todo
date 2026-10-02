-- 채팅 이미지(붙여넣기). 이미지 메시지는 본문이 빈 문자열이다
ALTER TABLE group_messages
    ADD COLUMN image      BYTEA,
    ADD COLUMN image_type TEXT,
    DROP CONSTRAINT group_messages_body_check,
    ADD CONSTRAINT group_messages_body_check CHECK (
        (image IS NULL AND image_type IS NULL AND char_length(body) BETWEEN 1 AND 500)
        OR (image IS NOT NULL AND image_type IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp')
            AND body = '')
    );

ALTER TABLE archived_messages
    ADD COLUMN image      BYTEA,
    ADD COLUMN image_type TEXT;
