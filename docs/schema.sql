-- cal-todo 데이터베이스 스키마 (PostgreSQL 17)
-- 근거: 7-erd.md v0.6, 2-PRD.md v0.11 7장, 5-project-principle.md v0.8 (N-7 제약 이름, C-15 ID 타입)
-- 적용의 기준은 backend/db/migrations/*.sql이고, 이 파일은 모든 마이그레이션을 적용한 누적 결과의 참조본이다(C-14).
-- 테이블 정의의 기준은 PRD 7장이다. 이 파일과 문서가 다르면 문서가 맞다.
-- 나이(R-12)와 그룹 상태(R-5)는 저장하지 않고 조회 때 계산한다.
-- 트랜잭션(BEGIN/COMMIT)은 적용하는 쪽(migrate.js, C-14)이 감싼다.

-- 회원. 물리 삭제하지 않고 deleted_at으로 비활성화한다(R-9).
CREATE TABLE members (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT        NOT NULL,
    email               TEXT        NOT NULL,
    password_hash       TEXT        NOT NULL,  -- bcrypt(NFR-6). 어떤 응답에도 내보내지 않는다
    phone               TEXT        NOT NULL,
    birth_date          DATE        NOT NULL,
    role                TEXT        NOT NULL DEFAULT 'MEMBER',
    is_permanent        BOOLEAN     NOT NULL DEFAULT false,
    deleted_at          TIMESTAMPTZ,           -- 탈퇴 시각(R-9). NULL이면 활성 회원
    password_changed_at TIMESTAMPTZ,           -- 이 시각 이전에 발급된 토큰은 거부(PRD 6.1 흐름 2·8)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT members_role_check
        CHECK (role IN ('MEMBER', 'ADMIN')),
    -- 영구 관리자는 ADMIN이며 삭제되지 않는다(R-11)
    CONSTRAINT members_is_permanent_check
        CHECK (NOT is_permanent OR (role = 'ADMIN' AND deleted_at IS NULL))
);

-- 활성 회원 사이에서만 이메일 중복 불가. 삭제된 회원의 이메일은 다시 쓸 수 있다(R-9)
CREATE UNIQUE INDEX members_email_key
    ON members (lower(email))
    WHERE deleted_at IS NULL;

-- 영구 관리자는 1명만(R-11)
CREATE UNIQUE INDEX members_is_permanent_key
    ON members (is_permanent)
    WHERE is_permanent;

-- 날짜별 그룹(조)
CREATE TABLE groups (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date       DATE        NOT NULL,
    name       TEXT        NOT NULL,
    capacity   INTEGER     NOT NULL,
    created_by INTEGER     NOT NULL REFERENCES members (id),  -- 회원은 물리 삭제하지 않으므로 기본(RESTRICT)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 같은 날짜 안에서 그룹명 중복 불가. `기본` 그룹 동시 생성도 이 제약으로 하나만 생긴다(R-2, NFR-5)
    -- 첫 컬럼이 date라서 날짜 조회 인덱스(PRD 7장 "인덱스 (date)")를 겸한다
    CONSTRAINT groups_date_name_key UNIQUE (date, name),
    CONSTRAINT groups_capacity_check CHECK (capacity IN (2, 4))
);

-- 참석. 정원 초과 방지(R-3)는 DB 제약으로 표현할 수 없어 그룹 행 잠금으로 보장한다(NFR-3)
CREATE TABLE attendances (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id  INTEGER     NOT NULL REFERENCES members (id),
    group_id   INTEGER     NOT NULL REFERENCES groups (id) ON DELETE CASCADE,  -- 그룹 삭제 시 참석 초기화(R-13)
    date       DATE        NOT NULL,  -- 그룹 날짜를 복제한 컬럼(D-3). 그룹 날짜는 수정하지 않는다
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 회원은 같은 날짜에 하나의 그룹에만 참석(R-4, NFR-4). 위반 23505 → ALREADY_ATTENDING
    CONSTRAINT attendances_member_id_date_key UNIQUE (member_id, date)
);

CREATE INDEX attendances_group_id_idx ON attendances (group_id);

-- Refresh Token. 기기(브라우저)마다 한 행(PRD 6.1)
CREATE TABLE refresh_tokens (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id  INTEGER     NOT NULL REFERENCES members (id),
    token_hash TEXT        NOT NULL,  -- jti의 SHA-256
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,           -- 폐기 시각. 재사용 판정에 쓰므로 만료 전까지 남긴다(6.1 흐름 5·9)
    revoked_reason TEXT,              -- 폐기 사유. 30초 유예(REFRESH_RACE)는 ROTATED에만 적용(6.1 흐름 5)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash),
    -- revoked_at과 revoked_reason은 함께 NULL이거나 함께 NOT NULL
    -- revoked_reason IS NOT NULL이 없으면 NULL IN (...)이 NULL이 되어 CHECK를 통과한다
    CONSTRAINT refresh_tokens_revoked_reason_check
        CHECK ((revoked_at IS NULL AND revoked_reason IS NULL)
            OR (revoked_at IS NOT NULL AND revoked_reason IS NOT NULL
                AND revoked_reason IN ('ROTATED', 'LOGOUT', 'FORCED')))
);

CREATE INDEX refresh_tokens_member_id_idx ON refresh_tokens (member_id);
