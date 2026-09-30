# cal-todo 프로젝트 구조 설계 원칙

> 근거: [1-definition.md](1-definition.md) **v0.14**, [2-user-scenarios.md](2-user-scenarios.md) **v0.17**, [2-PRD.md](2-PRD.md) **v0.11**, [3-screen-design.md](3-screen-design.md) **v0.15**, [4-wireframes.md](4-wireframes.md) **v0.7**, [CLAUDE.md](../CLAUDE.md). `REQ-n`·`R-n`·`UC-n`은 정의서, `S-n`은 시나리오, `M-n`·`FR-n`·`NFR-n`·`D-n`과 "6.1 흐름 n"은 PRD, `SCR-n`은 화면 설계서, `WF-n`은 와이어프레임 번호다. 이 문서가 정의하는 ID는 `P-n`(공통), `L-n`(의존성·레이어), `N-n`(코드·네이밍), `T-n`(테스트·품질), `C-n`(설정·보안·운영), `ST-n`(디렉토리 구조)이다. 도메인 규칙은 다시 정의하지 않고 ID로 참조한다. **(결정)** 표시는 다른 문서에 없던 것을 이 문서에서 새로 정한 사항이다.

## 변경 이력

> 문서를 바꿀 때마다 표 맨 아래에 한 줄을 추가한다. 버전은 내용 추가·변경 시 소수점 자리(0.1 → 0.2), 구조가 크게 바뀌면 정수 자리(→ 1.0)를 올린다.

| 버전 | 날짜 | 변경자 | 변경내용 |
|------|------|--------|----------|
| 0.1 | 2026-09-30 | uokevin | 초안 작성 |
| 0.2 | 2026-09-30 | uokevin | 머리말 기준 버전 갱신. 오류 코드 표의 (결정) 항목이 PRD v0.5 D-4에 반영됨 |
| 0.3 | 2026-09-30 | uokevin | PRD v0.6 반영: L-11에 `REFRESH_RACE` 1회 재시도 예외 명시, 머리말 기준 버전 갱신 |
| 0.4 | 2026-09-30 | uokevin | 정합성 점검 반영: 6.1 트리의 `docs/` 설명을 실제 문서 목록에 맞춤, 머리말 기준 버전 갱신 |
| 0.5 | 2026-09-30 | uokevin | 계획 빈틈 결정 반영: C-3·T-2·ST 트리에 `backend/.env.test`(+`.env.test.example`), C-9 비밀번호 8자 이상·최대 72바이트(PRD NFR-10)·이름·생년월일, C-8 표에 429 `TOO_MANY_ATTEMPTS`(FR-18, P2), C-14에 `docs/schema.sql`은 누적 참조본, T-5 인증에 `LOGOUT`·`FORCED` 폐기 토큰, T-5 권한에 관리자 자기 삭제·자기 비밀번호 변경 403과 `기본` 이름 400, T-5 탈퇴 회원 관리자 응답을 `isDeleted`로(PRD 9장), 6.1 트리 `docs/`에 schema.sql·8-plan.md, 머리말 기준 버전 갱신 |
| 0.6 | 2026-09-30 | uokevin | 잔여 빈틈 결정 반영: C-9 생년월일 미래 판정을 service(`TODAY_SQL`)로 이동, T-6에 일정 지연 시 모바일 확인 축소 조건, 머리말 기준 버전 갱신 |
| 0.7 | 2026-09-30 | uokevin | 정합성 점검 반영: 머리말 기준 버전 갱신 |
| 0.8 | 2026-09-30 | uokevin | 머리말 기준 버전 갱신 |

## 번호 정책

- `P-n`, `L-n`, `N-n`, `T-n`, `C-n`, `ST-n`은 한 번 붙이면 바꾸거나 다시 쓰지 않는다. 새 항목은 마지막 번호 다음을 쓰고, 없어진 항목은 `(폐기, vX.Y)`로 남긴다.

---

## 1. 공통 최상위 원칙

| ID | 원칙 | 근거 |
|----|------|------|
| P-1 | **단순함 우선.** 요청된 FR만 만든다. 한 번만 쓰는 코드는 추상화하지 않고, "나중에 쓸" 설정·옵션·확장 지점을 만들지 않는다. 200줄이 50줄로 되면 다시 쓴다 | CLAUDE.md 2장 |
| P-2 | **1인·2일에 맞는 최소 구조.** 폴더·파일은 ST-n에 적힌 것만 만들고, 필요해질 때 늘린다. P0가 끝나기 전에 P1·P2 코드를 만들지 않는다 | PRD 1장 제약, 10장 |
| P-3 | **금지 목록.** DI 컨테이너, 헥사고날·클린 아키텍처 풀세트(ports/adapters/usecases), 구현이 하나뿐인 인터페이스·추상 클래스·팩토리, 제네릭 Repository/BaseService, 이벤트 버스, 모노레포 도구(Nx, Turborepo, npm workspaces), ORM·쿼리 빌더, 전역 상태로 서버 데이터 캐시 | P-1, PRD 6장 |
| P-4 | **도메인 규칙의 단일 출처는 정의서 R-n이다.** 코드는 규칙을 새로 만들지 않고, 규칙을 판단하는 곳에 `R-n` 주석을 단다(N-12). 규칙이 모호하면 코드로 해석하지 말고 문서에 묻는다 | CLAUDE.md 1장·문서 관리 |
| P-5 | **서버가 규칙의 최종 판단자다.** 권한·정원·중복·탈퇴 회원 가림·"오늘"은 서버(가능하면 DB 제약·SQL)에서 판단한다. 화면의 비활성 버튼·검증은 편의일 뿐이다 | NFR-9, NFR-10, PRD 9장 |
| P-6 | **DB가 할 수 있는 무결성은 DB에 맡긴다.** 유니크·체크·FK 제약을 먼저 쓰고, 제약으로 안 되는 정원(R-3)만 행 잠금으로 보장한다 | D-2, NFR-3 ~ NFR-5 |
| P-7 | **외과적 변경.** 요청과 관계없는 코드·서식·주석을 고치지 않는다. 내 변경으로 안 쓰이게 된 것만 지운다 | CLAUDE.md 3장 |
| P-8 | **검증 가능한 목표로 일한다.** 작업마다 "무엇이 통과하면 끝인가"(T-n 테스트, S-n 시나리오)를 먼저 정하고, 통과할 때까지 반복한다 | CLAUDE.md 4장 |
| P-9 | **문서가 먼저다.** 구현 중 문서와 다르게 해야 하면 코드부터 바꾸지 않고 해당 문서를 고쳐 변경 이력에 한 줄을 남긴다 | CLAUDE.md 문서 관리 |

## 2. 의존성·레이어 원칙

### 2.1 백엔드 레이어

```
routes (HTTP) ──▶ services (규칙·트랜잭션) ──▶ repositories (SQL) ──▶ pg
     │                    │
     └── middleware(인증·권한)   └── errors, validate, db(withTx)
```

| ID | 원칙 |
|----|------|
| L-1 | 의존 방향은 `routes → services → repositories` 한 방향이다. 역방향 import(예: repository가 service를, service가 `req`/`res`를) 금지. route가 repository나 SQL을 직접 부르지 않는다 |
| L-2 | **routes**: URL·메서드 매핑, 입력 형식 검증(`validate.js`, NFR-10), `req.member`에서 요청자 꺼내기, 응답 상태 코드 결정만 한다. 업무 규칙을 판단하지 않는다 |
| L-3 | **services**: R-n 판단, 트랜잭션 경계, 오류 코드 결정(`AppError`), 탈퇴 회원 이름 가림(FR-15). 도메인당 파일 하나. 로직이 거의 없는 service(단순 조회)도 거치게 하되 한두 줄이면 충분하다 |
| L-4 | **repositories**: SQL과 컬럼 별칭(N-9)만 있다. 규칙 판단·HTTP 지식이 없다. 모든 함수는 첫 인자로 `db`(pool 또는 트랜잭션 client)를 받는다 |
| L-5 | **트랜잭션 경계는 service에 있다.** 여러 쓰기가 원자적이어야 하면 service가 `withTx(async (client) => { ... })`로 감싸고 같은 `client`를 repository에 넘긴다. 대상: 참석 등록(`FOR UPDATE`, NFR-3), 그룹 생성+참석(PRD 9장), 기본 그룹 생성+참석(NFR-5), 정원 변경, 회원 삭제(R-9), 그룹 삭제(R-13), 비밀번호 변경+토큰 폐기(6.1 흐름 8), 토큰 교체(6.1 흐름 4) |
| L-6 | 권한은 두 단계다. 라우터 단위 `requireAuth`·`requireAdmin` 미들웨어(R-1, R-8)가 먼저 막고, 대상에 따라 달라지는 규칙(영구 관리자 잠금 R-11, 삭제된 회원 보기 전용 FR-16)은 service가 판단한다 |
| L-7 | 도메인 간 호출은 service → 다른 service 허용(예: 회원 삭제가 참석 정리를 호출). 순환 import는 금지이며, 생기면 함수를 호출하는 쪽 service로 옮긴다 |

### 2.2 프론트엔드 레이어

```
pages/컴포넌트 (features/*) ──▶ api 훅 (features/*/api.ts, TanStack Query) ──▶ api 클라이언트 (lib/client.ts, fetch)
          │
          └── store.ts (Zustand: accessToken, me, 토스트)
```

| ID | 원칙 |
|----|------|
| L-8 | 컴포넌트는 `fetch`를 직접 부르지 않는다. 서버 호출은 반드시 `features/*/api.ts`의 훅 → `lib/client.ts`를 거친다 |
| L-9 | **서버 상태는 TanStack Query**, 클라이언트 상태만 Zustand. Zustand에는 `accessToken`(6.1 메모리 보관), 로그인 사용자 `me`(PRD 6장), 토스트만 둔다. 그룹·참석·회원 목록을 Zustand에 복사하지 않는다 |
| L-10 | 쓰기 뒤에는 관련 쿼리를 **접두 키로 넓게 무효화**한다(예: 참석 쓰기 → `['calendar']`, `['dateGroups', date]`, `['attendance']`). 낙관적 업데이트는 쓰지 않는다. 정원·중복 판단은 서버 응답(409)을 따른다(P-5) |
| L-11 | `lib/client.ts`만 인증을 안다: Bearer 헤더 부착, 401 `TOKEN_EXPIRED` 시 `/auth/refresh` single-flight 후 재시도, `REFRESH_RACE` 시 한 번 더 재발급, `UNAUTHENTICATED` 시 스토어 비우고 SCR-01로 이동(6.1 흐름 3·5·6, D-4). `/auth/*` 요청 자체의 실패에는 이 처리를 하지 않는다. 예외는 `/auth/refresh`의 `REFRESH_RACE`에 대한 1회 재시도뿐이며(앱 시작 시 복원 포함), 재시도에서도 401이면 SCR-01로 보낸다 |
| L-12 | 폼 상태는 컴포넌트 `useState`로 충분하다. 폼 라이브러리·전역 폼 상태 금지 |
| L-13 | 반응형은 CSS 미디어 쿼리(768px, WF 2.1)로만 한다. 모바일·데스크톱 컴포넌트를 따로 만들지 않고, 표 ↔ 카드 전환도 같은 컴포넌트 안의 CSS로 처리한다 |

### 2.3 공유 코드 정책

| ID | 원칙 |
|----|------|
| L-14 | **(결정) 프론트·백엔드는 코드를 공유하지 않는다.** 백엔드가 JavaScript라 타입 공유의 이득이 없고, 공유 패키지는 빌드 설정만 늘린다. 계약의 단일 출처는 PRD 9장 API 표이고, 프론트는 `src/types.ts`에 응답 타입을 손으로 적는다 |
| L-15 | 양쪽에 중복되는 것은 오류 코드 문자열(C-8 표)과 형식 검증(이메일·전화번호·정원·비밀번호 길이) 두 가지뿐이다. 바꿀 때는 두 곳을 같은 커밋에서 고친다 |

### 2.4 새 의존성 추가 기준

| ID | 원칙 |
|----|------|
| L-16 | 추가 전 순서대로 묻는다: ① 정말 필요한가(FR에 있나) ② 이미 있는 코드·패키지로 되나 ③ Node/브라우저 내장 기능으로 되나(`fetch`, `crypto`, `Intl`, `<input type="date">`, `node --env-file`, `node --watch`, `node:test`) ④ 수십 줄로 되나. 넷 다 "아니오"일 때만 추가하고 아래 표에 한 줄을 더한다 |
| L-17 | 허용 목록 밖의 패키지는 이 표를 먼저 고친 뒤 설치한다 |

| 위치 | 런타임 의존성 | 개발 의존성 |
|------|---------------|-------------|
| frontend | `react`, `react-dom`, `react-router-dom` **(결정: URL 라우팅·딥링크 `/dates/:date`·뒤로 가기 WF-04)**, `zustand`, `@tanstack/react-query` | `vite`, `@vitejs/plugin-react`, `typescript`, `eslint`(Vite 템플릿 구성), `prettier` |
| backend | `express`(**결정: v5**, async 오류 자동 전달로 래퍼 불필요), `pg`, `bcrypt`, `jsonwebtoken`, `cookie-parser` | `eslint`, `@eslint/js`, `globals`, `prettier` |

- 쓰지 않는 것(대체 수단): `dotenv`(`node --env-file`), `nodemon`(`node --watch`), `axios`(`fetch`), `zod`·`joi`(`validate.js` 손 검증), `supertest`(`app.listen(0)` + `fetch`), `dayjs`·`moment`(SQL + `Intl`), 캘린더·날짜 선택 라이브러리(손 그리드 + `<input type="date">`), UI 키트·Tailwind(CSS 파일 하나), `helmet`(`app.disable('x-powered-by')`로 충분, 필요해지면 추가), `concurrently`(터미널 두 개).

## 3. 코드·네이밍 원칙

| ID | 대상 | 규칙 | 예 |
|----|------|------|----|
| N-1 | 백엔드 파일·폴더 | 소문자 camelCase `.js`, 폴더가 레이어를 말하므로 접미사 없음. CommonJS 대신 **ESM**(`"type": "module"`) **(결정)** | `routes/admin.js`, `services/groups.js`, `repositories/refreshTokens.js` |
| N-2 | 프론트 컴포넌트 파일 | PascalCase `.tsx`, 파일 하나에 컴포넌트 하나(작은 보조 컴포넌트는 같은 파일 허용). 화면은 `…Page`, 모달은 `…Modal` | `DateDetailPage.tsx`, `GroupCreateModal.tsx` |
| N-3 | 프론트 기타 파일 | camelCase `.ts` | `client.ts`, `api.ts` |
| N-4 | 훅 | `use` + 동사/명사. 조회 `use…Query`, 쓰기 `use…Mutation` 대신 동작 이름 | `useDateGroups`, `useAttend`, `useCancelAttendance` |
| N-5 | 함수·변수 | camelCase, 함수는 동사로 시작. 불리언은 `is`/`has`/`can` | `createGroup`, `isPermanent`, `canAttend` |
| N-6 | 상수 | 모듈 최상위의 바뀌지 않는 값은 UPPER_SNAKE_CASE | `BCRYPT_COST = 10`, `ACCESS_TOKEN_TTL = '15m'` |
| N-7 | DB 테이블·컬럼 | snake_case, 테이블은 복수형(PRD 7장 그대로). 제약·인덱스는 이름을 직접 붙인다: `<테이블>_<컬럼>_key`(유니크), `_idx`, `_check` | `attendances_member_id_date_key`, `groups_date_name_key` |
| N-8 | API 경로 | PRD 9장 그대로. 소문자, 복수 명사, 케밥은 쓰지 않음(필요한 경로가 없음). 쿼리 파라미터는 camelCase | `/api/admin/members?includeDeleted=true` |
| N-9 | JSON 필드 | camelCase. **(결정) 변환은 repository SQL의 별칭 한 곳에서** 한다(`birth_date AS "birthDate"`). 변환 유틸·라이브러리는 만들지 않는다. 요청 본문은 route에서 필드를 꺼내 service 인자로 넘긴다 | `{ "birthDate": "1974-11-14", "isPermanent": false }` |
| N-10 | 날짜·시각 JSON | 날짜는 `"YYYY-MM-DD"` 문자열, 시각은 ISO 8601 문자열. 날짜를 `Date` 객체로 다루지 않는다(C-11) | `"date": "2026-10-03"` |
| N-11 | 오류 코드 | UPPER_SNAKE_CASE 문자열, 뜻이 드러나는 영어. 목록은 C-8 표가 기준 | `CAPACITY_FULL` |
| N-12 | 주석 | "왜"만 쓴다. 규칙을 판단하는 줄에는 `// R-n: 한 줄 요약`(필요하면 `NFR-n`·`D-n`·"6.1 흐름 n" 병기). 규칙을 주석으로 다시 풀어 쓰지 않는다. 한계를 알고 택한 단순화에는 `// 단순화: 한계, 넘어서면 할 일` | `// R-3: 정원 초과 거부 (NFR-3, 그룹 행 FOR UPDATE)` |
| N-13 | 포맷터 | Prettier 기본값, 저장소 루트 `.prettierrc` 하나를 양쪽이 같이 쓴다. 설정 항목은 `{ "singleQuote": true, "printWidth": 100 }`만 **(결정)** | |
| N-14 | 린터 | ESLint flat config 최소: 프론트는 Vite React-TS 템플릿 기본(typescript-eslint, react-hooks), 백엔드는 `@eslint/js` recommended + Node globals. 규칙 추가는 실제로 버그를 막은 경우만. TypeScript는 `strict: true` | |
| N-15 | 화면 문구 | 사용자에게 보이는 오류 문구는 프론트 `lib/errors.ts`에서 오류 코드로 찾는다(SCR-n 문구 그대로). 서버 `message`는 로그·디버깅용이며 화면에 그대로 쓰지 않는다 | `CAPACITY_FULL → "정원이 가득 찼습니다"` |

## 4. 테스트·품질 원칙

### 4.1 전략

| ID | 원칙 |
|----|------|
| T-1 | **(결정) 자동 테스트는 백엔드 API 수준만** 쓴다. 도구는 Node 내장 `node:test` + `node:assert`, 앱을 `app.listen(0)`으로 띄워 `fetch`로 호출한다. 단위 테스트·목(mock)은 쓰지 않는다 |
| T-2 | **(결정) 실제 PostgreSQL 17 테스트 DB**(`cal_todo_test`)에 마이그레이션을 적용해 돌린다. 각 테스트 파일 시작 시 `TRUNCATE … RESTART IDENTITY CASCADE`로 비운다. 테스트 파일은 순차 실행(`--test-concurrency=1`). `DATABASE_URL`에 `_test`가 없으면 테스트가 바로 실패해 운영 DB를 지우지 않게 한다. 테스트 환경 변수는 `backend/.env.test`에서 `node --env-file=.env.test --test`로 읽는다(C-3) |
| T-3 | 프론트엔드 자동 테스트는 P0 범위 밖이다. 대신 `tsc --noEmit`·ESLint·`vite build` 통과를 품질 관문으로 삼고, 화면 흐름은 T-6 수동 체크리스트로 확인한다. 필요해지면 Vite와 맞는 `vitest` 하나만 추가한다(L-16) |
| T-4 | 테스트는 규칙 ID로 이름 짓는다: `test('R-3 정원이 찬 그룹 참석은 409 CAPACITY_FULL', …)`. 버그를 고칠 때는 재현 테스트부터 쓴다(CLAUDE.md 4장) |

### 4.2 반드시 자동 테스트할 것 (T-5)

| 영역 | 테스트 | 근거 |
|------|--------|------|
| 동시성 | 정원 4 그룹에 서로 다른 회원 10명이 `Promise.all`로 동시 참석 → 성공 4, 409 `CAPACITY_FULL` 6, DB 인원 4 | R-3, NFR-3, M-4 |
| 동시성 | 같은 회원이 같은 날짜 두 그룹에 동시 참석 → 1건만 성공, 나머지 409 `ALREADY_ATTENDING` | R-4, NFR-4, M-4 |
| 동시성 | 같은 날짜에 그룹 없이 참석 동시 요청 → `기본` 그룹 1개 | R-2, NFR-5 |
| 원자성 | `attend=true` 그룹 생성인데 그날 이미 참석 중 → 409, 그룹도 생기지 않음 | S-4, PRD 9장 |
| 정원 | 정원을 현재 인원보다 작게 변경 → 409 | R-3, S-8 |
| 인증 | 로그인 → Access 발급, 만료 토큰 → 401 `TOKEN_EXPIRED`, 재발급 시 교체(이전 토큰 폐기) | 6.1 흐름 1·3·4 |
| 인증 | 폐기된 Refresh 재사용: `ROTATED` 30초 이내 `REFRESH_RACE`(다른 토큰 유지), 30초 경과 `UNAUTHENTICATED`(전부 폐기). `LOGOUT`·`FORCED`로 폐기된 토큰은 30초 이내라도 `UNAUTHENTICATED`. 시간은 `revoked_at`을 SQL로 과거로 돌려 흉내 낸다 | 6.1 흐름 5 |
| 인증 | 로그아웃 멱등(쿠키 없이도 204), 비밀번호 변경 뒤 이전 Access 401, 삭제된 회원의 Access·Refresh 401, 삭제된 회원 로그인 실패 | 6.1 흐름 2·7·8, R-1, S-15 |
| 인증 | `alg: none`·다른 비밀키·`type` 불일치 토큰 거부 | NFR-9 |
| 권한 | 회원이 `/admin/*` → 403, 영구 관리자 삭제·역할 해제·타인의 이메일/비밀번호 변경 → 거부, 삭제된 회원 수정 → 거부, 관리자 자기 삭제 → 403 `FORBIDDEN`, 관리자 자기 비밀번호 변경(`PATCH /admin/members/:id`, SCR-08 경로) → 403 `FORBIDDEN`, 그룹 이름 `기본` 사용(생성·변경, `기본` 그룹 이름 변경) → 400 `VALIDATION_ERROR`(`field: name`) | R-2, R-8, R-9, R-11, FR-16, 6.1 흐름 8 |
| 탈퇴 회원 | 비관리자 응답에 탈퇴 회원 실명이 없음(`name: "탈퇴 회원"`), 관리자 응답은 실명 + `isDeleted: true`(PRD 9장), 비관리자 이름 검색에 걸리지 않음 | R-9, FR-15 |
| 회원 삭제 | 오늘(Asia/Seoul) 포함 이후 참석 삭제, 어제 기록·만든 그룹 유지 | R-9, R-12 |
| 그룹 삭제 | 참석 기록 삭제 후 참석자가 같은 날짜 다른 그룹에 참석 가능 | R-13 |
| 기동 | JWT 비밀키 없음·32바이트 미만, 영구 관리자 없음 + `ADMIN_EMAIL` 없음 → `loadConfig`/기동 함수가 예외 | NFR-9, R-11 |
| 응답 | 어떤 응답에도 `passwordHash`·`password_hash` 없음(회원 관련 응답 확인) | NFR-6 |

### 4.3 수동 시나리오 체크리스트 (T-6, M-5)

Day2 오후에 배포 환경(또는 운영 빌드를 서빙하는 로컬)에서 데스크톱과 360px 모바일로 한 번씩 수행한다. 한 줄이라도 실패하면 M-5 미달이다. 단 일정이 밀리면 360px 모바일 확인은 SCR-03·SCR-04가 나오는 줄만 해도 된다(PRD M-5, 11장).

| S | 확인할 것 |
|---|-----------|
| S-1 | 가입 검증 문구 3종, 나이 자동 표시, 삭제된 회원 이메일로 재가입 |
| S-2 | 로그인·로그아웃, 미로그인 딥링크 → SCR-01, 삭제된 회원 로그인 실패 문구 |
| S-3 | 내 정보 수정, 역할 보기 전용 |
| S-4 | 그룹 생성+바로 참석, 이름 중복, 정원 마감, 이미 참석 중 잠금 |
| S-5 | 그룹 없이 참석 → 정원 선택 → `기본` 생성, 마감 시 거부 |
| S-6 | 참석 취소, 지난 날짜 취소 |
| S-7 | 조회 필터 4종, 지난달 기록 |
| S-8 | SCR-04 [편집]으로 정원 축소 거부 → 빼기 → 저장(D-7) |
| S-9 | 회원 편집·새 비밀번호·삭제, 삭제된 회원 보기, 영구 관리자 잠금 |
| S-10 | 관리자 지정 후 새로고침 시 메뉴, 해제 즉시 관리 API 거부 |
| S-11 | 첫 기동 영구 관리자 생성, 재기동 시 중복 생성 없음 |
| S-12 | 참석하지 않고 그룹 만들기 `(0/4)` |
| S-13 | SCR-04 [삭제] 확인 창 인원 표시, ✔ 사라짐 |
| S-14 | 새로고침 유지, 15분 뒤 자동 연장(개발 중에는 Access 만료를 짧게 설정해 확인), 두 탭 동시 새로고침, 기기별 로그아웃 |
| S-15 | 본인 비밀번호 변경 시 다른 기기만 로그아웃, 관리자 변경·삭제 시 즉시 로그아웃 |

### 4.4 부하 테스트와 완료 기준

| ID | 원칙 |
|----|------|
| T-7 | 부하 테스트(M-1 ~ M-3)는 P1이다. k6 스크립트 하나(`backend/load/k6.js`)와 초기 데이터 SQL 하나(`backend/load/seed.sql`, PRD 2장 조건)만 만든다. k6는 npm 의존성이 아니라 별도 실행 파일로 쓴다. 미달 시 대응 순서는 PRD 11장(인덱스·쿼리 → PM2 cluster → 풀 크기) |
| T-8 | **기능 완료 기준(DoD)**: ① 관련 T-5 테스트 통과 ② ESLint·Prettier·`tsc` 오류 0 ③ 관련 S-n을 T-6 방식으로 확인 ④ 규칙 판단 줄에 `R-n` 주석 ⑤ 응답에 해시·비관리자용 탈퇴 실명 없음 ⑥ 문서와 달라진 점이 있으면 문서 먼저 갱신(P-9) |
| T-9 | **릴리스 완료 기준**: P0 FR 전부 T-8 충족, M-4(T-5 동시성 + DB 검증 쿼리) 통과, M-5(T-6 전부) 통과, 배포 URL에서 S-2·S-11 재확인 |

## 5. 설정·보안·운영 원칙

### 5.1 환경 변수

| ID | 원칙 |
|----|------|
| C-1 | 환경 변수는 `backend/src/config.js` 한 곳에서만 읽고 검증해 객체로 내보낸다. 다른 파일은 `process.env`를 직접 읽지 않는다 |
| C-2 | 필수값이 없거나 형식이 틀리면 **서버는 listen 전에 오류 메시지를 찍고 종료**한다(NFR-9, R-11). 기본값이 있는 값만 생략 가능 |
| C-3 | **(결정)** `.env` 로딩은 Node 내장 `node --env-file=.env`로 한다. `backend/.env`는 git에 넣지 않고, 같은 키를 빈 값·주석으로 적은 `backend/.env.example`만 커밋한다. 테스트는 `backend/.env.test`(git 제외)를 `node --env-file=.env.test --test`로 읽고, 같은 방식으로 `backend/.env.test.example`을 커밋한다(`DATABASE_URL`은 `cal_todo_test`, T-2) |

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | 예 | `postgres://user:pass@host:5432/cal_todo` (테스트는 `cal_todo_test`, T-2) |
| `JWT_ACCESS_SECRET` | 예 | 32바이트 이상, 아니면 기동 실패(NFR-9) |
| `JWT_REFRESH_SECRET` | 예 | 32바이트 이상, Access와 다른 값(6.1) |
| `ADMIN_EMAIL` | 조건부 | 영구 관리자가 DB에 없을 때만 필수. 없으면 기동 실패(R-11) |
| `ADMIN_PASSWORD` | 조건부 | 위와 같음. 영구 관리자 생성 뒤에는 쓰지 않는다(이후 변경은 SCR-07) |
| `PORT` | 아니오 | 기본 `3000` |
| `NODE_ENV` | 아니오 | `production`이면 쿠키 `Secure`, SPA 정적 파일 서빙 |
| `ACCESS_TOKEN_TTL` | 아니오 | 기본 `15m`. S-14 수동 확인용으로 개발에서만 줄인다 |

- 비밀키 생성: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

### 5.2 보안

| ID | 원칙 | 근거 |
|----|------|------|
| C-4 | 비밀(비밀키·DB 비밀번호·관리자 초기 비밀번호)은 소스·로그·응답·git 어디에도 두지 않는다. 운영 서버의 `.env`는 소유자만 읽기 권한 | NFR-9, R-11 |
| C-5 | 모든 SQL은 `$1, $2` 파라미터 쿼리. 동적 필터(FR-14)는 값을 `params` 배열에 넣고 그 길이로 `$n` 자리표시자를 만든 조건 조각(예: `g.name ILIKE $3`)을 `conditions` 배열에 함께 쌓는다. 값은 절대 SQL 문자열에 넣지 않는다. 정렬 컬럼 같은 식별자가 필요하면 허용 목록에서 고른다 | NFR-7 |
| C-6 | 비밀번호는 `bcrypt` 비동기 API(`hash`, `compare`), cost `10` 상수. 해시 컬럼은 로그인·비밀번호 확인 쿼리에서만 SELECT하고, 회원 조회 쿼리는 해시를 아예 고르지 않는다 | NFR-6, PRD 11장 |
| C-7 | 토큰: `jsonwebtoken` HS256, `verify`는 `{ algorithms: ['HS256'] }` 고정 + 페이로드 `type` 확인. Refresh `jti`는 `crypto.randomUUID()`, DB에는 SHA-256 hex만. 쿠키는 `HttpOnly; SameSite=Strict; Path=/api/auth; Secure(운영)`. 매 요청 회원 행 재조회와 `iat` < `password_changed_at`(초 내림) 거부는 `requireAuth` 한 곳에서 | 6.1, NFR-8, NFR-9 |
| C-8 | 오류 응답 형식은 `{ "error": { "code": "…", "message": "…", "field"?: "email" } }` 하나 **(결정)**. HTTP 상태와 코드는 아래 표가 기준이다(D-4를 구체화) | D-4 |
| C-9 | 입력 검증은 route에서 `validate.js`로 형식(이메일, 전화번호 정의서 4.1, 정원 2/4, `YYYY-MM-DD` 날짜, 비밀번호 8자 이상·최대 72바이트 — PRD NFR-10, 이름 비어 있지 않음, 생년월일 `YYYY-MM-DD`)을 본다. DB가 필요한 규칙은 service. 생년월일이 미래인지는 "오늘"이 필요하므로 route가 아니라 service가 `TODAY_SQL`(C-11)로 판단한다. 알 수 없는 필드는 무시하고 읽지 않는다(역할·`isPermanent`를 본문에서 받는 곳은 `PATCH /admin/members/:id`의 `role`뿐) | NFR-10, R-10 |
| C-10 | 비관리자 응답에 탈퇴 회원 실명을 넣지 않는다. 가림은 `services/display.js`의 함수 하나로 하고 모든 조회 service가 거친다. 이름 검색 제외는 repository SQL 조건(`m.deleted_at IS NULL OR $isAdmin`)으로 한다 | R-9, FR-15, PRD 11장 |

| 상황 | HTTP | `code` |
|------|------|--------|
| 입력 형식 오류 | 400 | `VALIDATION_ERROR` (+`field`) |
| 로그인 실패(없는 이메일·틀린 비밀번호·삭제된 회원 모두 동일) **(결정)** | 400 | `INVALID_CREDENTIALS` |
| 내 정보 수정 시 현재 비밀번호 틀림 **(결정)** | 400 | `WRONG_PASSWORD` (`field: currentPassword`) |
| Access 만료 / 재발급 경합 / 미인증·무효·탈퇴 | 401 | `TOKEN_EXPIRED` / `REFRESH_RACE` / `UNAUTHENTICATED` (D-4) |
| 권한 없음 | 403 | `FORBIDDEN` |
| 대상 없음 | 404 | `NOT_FOUND` |
| 정원 초과 / 같은 날짜 중복 참석 / 같은 날짜 그룹명 중복 | 409 | `CAPACITY_FULL` / `ALREADY_ATTENDING` / `DUPLICATE_GROUP_NAME` (D-4) |
| 활성 회원 이메일 중복 **(결정)** | 409 | `EMAIL_TAKEN` |
| 정원을 현재 인원보다 작게 **(결정)** | 409 | `CAPACITY_BELOW_COUNT` |
| 영구 관리자 보호 위반 **(결정)** | 409 | `PERMANENT_ADMIN_LOCKED` (R-11) |
| 삭제된 회원 수정·삭제 **(결정)** | 409 | `MEMBER_DELETED` (FR-16) |
| 로그인 시도 제한 초과(같은 이메일 15분 안에 5회 실패, 15분 거부) | 429 | `TOO_MANY_ATTEMPTS` (FR-18, P2) |
| 예상하지 못한 오류 | 500 | `INTERNAL` (메시지에 내부 정보 없음) |

- 유니크 위반(`23505`)은 service가 제약 이름(N-7)으로 코드를 고른다. 예: `attendances_member_id_date_key` → `ALREADY_ATTENDING`(NFR-4).

### 5.3 오류 처리·로깅·시간대·스키마

| ID | 원칙 | 근거 |
|----|------|------|
| C-11 | **시간대**: "오늘"은 SQL `(now() AT TIME ZONE 'Asia/Seoul')::date`, 나이는 `EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Seoul') - EXTRACT(YEAR FROM birth_date)`로만 계산하고, 이 SQL 조각은 `db.js`에 상수(`TODAY_SQL`) 하나로 둔다. JS `new Date()`로 규칙을 판단하지 않는다. `pg`의 `DATE`(OID 1082) 타입 파서를 문자열 그대로 반환하도록 바꿔 시간대 밀림을 막는다. 프론트의 "오늘" 강조·가입 화면 나이는 `Intl`(`timeZone: 'Asia/Seoul'`)로 계산한 표시용이다 | R-12, NFR-11, PRD 11장 |
| C-12 | **오류 처리**: service는 업무 거부를 `throw new AppError(status, code, message, field?)`로 알린다. Express 5가 async 오류를 넘기므로 try/catch 래퍼를 쓰지 않는다. 마지막 오류 미들웨어 하나가 `AppError`는 C-8 형식으로, 나머지는 500 `INTERNAL`로 바꾼다. 일어날 수 없는 상황의 방어 코드는 넣지 않는다(CLAUDE.md 2장) | D-4 |
| C-13 | **로깅**: `console.error`로 500만 남긴다(메서드, 경로, 스택). 4xx는 남기지 않는다. 요청 본문·`Authorization`·쿠키·비밀번호는 절대 찍지 않는다. 로깅 라이브러리는 쓰지 않는다 | NFR-13 |
| C-14 | **(결정) 스키마 적용**: ORM 없이 `backend/db/migrations/NNN_설명.sql`(3자리 번호, 영어 snake_case, 예: `001_init.sql`, `002_add_group_index.sql`)을 둔다. 서버 기동 시 `migrate.js`가 `schema_migrations(filename PRIMARY KEY, applied_at)`에 없는 파일을 번호 순으로 파일당 트랜잭션 하나로 적용한다. 여러 프로세스가 동시에 떠도 한 번만 돌도록 `pg_advisory_lock`을 잡는다. **적용된 파일은 절대 고치지 않고** 새 번호 파일로 바꾼다. 롤백 파일(down)은 만들지 않는다. 적용의 기준은 `backend/db/migrations/*.sql`이고, `docs/schema.sql`은 모든 마이그레이션을 적용한 누적 결과의 참조본이다. 새 마이그레이션을 추가하는 커밋에서 `docs/schema.sql`도 함께 갱신한다 | NFR-13 |
| C-15 | **(결정) ID 컬럼**은 `INTEGER GENERATED ALWAYS AS IDENTITY`. `BIGINT`는 `pg`가 문자열로 돌려주므로 쓰지 않는다(이 규모에서 범위도 충분) | PRD 7장 |
| C-16 | **영구 관리자 확인**(UC-10)은 마이그레이션 직후 기동 절차에서 한다. `is_permanent` 부분 유니크 인덱스(PRD 7장) + `ON CONFLICT DO NOTHING`으로 동시 기동에도 1명만 생긴다. 시드 데이터를 SQL 파일에 넣지 않는다(비밀번호가 환경 변수라서) | R-11, FR-3 |
| C-17 | `pg.Pool`은 `db.js`에서 하나만 만든다(max 20, NFR-1). 요청마다 client를 빌리면 `withTx`가 반드시 `release`한다 | NFR-1 |

### 5.4 개발·배포

| ID | 원칙 | 근거 |
|----|------|------|
| C-18 | **개발**: 터미널 두 개. `backend`에서 `node --watch --env-file=.env src/server.js`, `frontend`에서 `vite`. Vite `server.proxy`로 `/api` → `http://localhost:3000`. CORS 미들웨어는 두지 않는다 | NFR-14 |
| C-19 | **(결정) 배포**: VM 1대에 Node 22 LTS + PostgreSQL 17. `frontend`에서 `npm ci && npm run build` → `frontend/dist`. `backend`에서 `npm ci --omit=dev` 후 `NODE_ENV=production node --env-file=.env src/server.js`를 PM2(fork 1개)로 띄운다. cluster는 M-1 미달 때만(NFR-1) | D-5, NFR-1 |
| C-20 | Express는 `/api` 라우터 → `frontend/dist` 정적 파일 → 나머지 `GET`은 `index.html`(SPA 폴백) 순서로 붙인다. `/api` 아래 없는 경로는 JSON 404 | D-5 |
| C-21 | HTTPS는 앞단(호스팅 기본 TLS 또는 Caddy/nginx 리버스 프록시)에서 끝낸다. 프록시 뒤라면 `app.set('trust proxy', 1)`. 호스팅 선택은 PRD 12장 미결 사항을 따른다 | PRD 12장 |

## 6. 디렉토리 구조

### 6.1 저장소 최상위

| ID | 원칙 |
|----|------|
| ST-1 | **(결정) 저장소 루트는 `cal-todo/`** 하나이고, 그 아래에 `frontend/`와 `backend/`를 독립 npm 프로젝트로 둔다. 루트 `package.json`·워크스페이스·모노레포 도구는 두지 않는다(P-3) |
| ST-2 | 도메인은 **회원(members)·그룹(groups)·참석(attendance)·인증(auth)** 넷으로 나눈다. 관리자는 도메인이 아니라 권한이다. 관리자 API는 `routes/admin.js` 하나에 모으고, 회원·그룹 service를 그대로 부른다 |
| ST-3 | 파일은 "필요해질 때" 만든다. 아래 트리는 P0 완성 시점의 예상 모습이며, 한 파일이 300줄을 넘기 전에는 쪼개지 않는다 |

```
cal-todo/
├─ CLAUDE.md          작업 지침
├─ .prettierrc        프론트·백 공용 포맷 설정(N-13)
├─ .gitignore         node_modules, dist, .env, .env.test
├─ docs/              정의서·시나리오·PRD·화면·와이어프레임·이 문서·아키텍처 다이어그램·ERD·DDL 참조본(schema.sql)·실행 계획
├─ prompts/           문서 생성에 쓴 원문 프롬프트
├─ frontend/          React SPA (Vite)
└─ backend/           Express API + SPA 서빙
```

### 6.2 백엔드

```
backend/
├─ package.json            "type": "module", scripts: dev, start, test, lint
├─ .env.example            C-3 변수 목록
├─ .env.test.example       테스트용 변수 목록(C-3, T-2). 실제 값은 .env.test(git 제외)
├─ eslint.config.js
├─ db/
│  └─ migrations/
│     └─ 001_init.sql      members, groups, attendances, refresh_tokens + 제약·인덱스(PRD 7장)
├─ src/
│  ├─ server.js            기동 순서: config 검증 → 마이그레이션 → 영구 관리자 확인 → listen
│  ├─ app.js               Express 조립(cookie-parser, JSON, /api 라우터, 정적 파일, 오류 미들웨어). 테스트가 import
│  ├─ config.js            환경 변수 읽기·검증(C-1, C-2)
│  ├─ db.js                pg.Pool, withTx, DATE 타입 파서, TODAY_SQL(C-11, C-17)
│  ├─ migrate.js           마이그레이션 적용(C-14)
│  ├─ errors.js            AppError, 오류 미들웨어(C-8, C-12)
│  ├─ validate.js          형식 검증 함수(C-9)
│  ├─ middleware.js        requireAuth(토큰 검증 + 회원 재조회), requireAdmin(L-6, C-7)
│  ├─ routes/
│  │  ├─ auth.js           /auth/signup, login, refresh, logout
│  │  ├─ me.js             /me
│  │  ├─ dates.js          /calendar, /dates/:date/groups, /dates/:date/attendance
│  │  ├─ groups.js         /groups/:id/attendance
│  │  ├─ attendance.js     /attendance (조회·필터)
│  │  └─ admin.js          /admin/members/*, /admin/groups/* (requireAdmin)
│  ├─ services/
│  │  ├─ auth.js           로그인, 토큰 발급·교체·재사용 감지·폐기(6.1)
│  │  ├─ members.js        가입, 내 정보, 관리자 편집·삭제·역할, 영구 관리자 확인
│  │  ├─ groups.js         그룹 생성·편집·삭제, 캘린더·날짜 상세
│  │  ├─ attendance.js     참석 등록·취소·빼기, 기본 그룹, 현황 조회
│  │  └─ display.js        탈퇴 회원 이름 가림(C-10)
│  └─ repositories/
│     ├─ members.js
│     ├─ groups.js
│     ├─ attendances.js
│     └─ refreshTokens.js
├─ test/
│  ├─ helpers.js           앱 기동(listen 0), DB 비우기, 가입·로그인 헬퍼
│  ├─ auth.test.js         T-5 인증
│  ├─ attendance.test.js   T-5 정원·중복·기본 그룹·동시성
│  ├─ admin.test.js        T-5 권한·영구 관리자·회원 삭제·그룹 삭제·탈퇴 회원 가림
│  └─ config.test.js       T-5 기동 실패
└─ load/                   (P1) k6.js, seed.sql(T-7)
```

- route 파일은 URL 접두어 기준, service·repository 파일은 도메인·테이블 기준이다. `/calendar`는 날짜 단위 조회라 `dates.js`에 둔다.

### 6.3 프론트엔드

```
frontend/
├─ package.json            scripts: dev, build, lint, typecheck
├─ index.html
├─ vite.config.ts          react 플러그인, server.proxy /api(C-18)
├─ tsconfig.json           strict
├─ eslint.config.js
└─ src/
   ├─ main.tsx             QueryClient, Router, 렌더
   ├─ App.tsx              라우트 표, 앱 시작 시 로그인 복원(6.1 흐름 6), 로그인·관리자 가드
   ├─ styles.css           전역 스타일 하나, 768px 미디어 쿼리(L-13)
   ├─ types.ts             API 요청·응답 타입(L-14)
   ├─ store.ts             Zustand: auth(accessToken, me), toast(L-9)
   ├─ lib/
   │  ├─ client.ts         fetch 래퍼: Bearer, 재발급 single-flight, 401 처리(L-11)
   │  ├─ errors.ts         오류 코드 → SCR 문구(N-15)
   │  ├─ date.ts           생년월일(나이) 표시, 서울 기준 오늘(표시용, C-11)
   │  └─ validate.ts       이메일·전화번호·비밀번호 형식(보조, L-15)
   ├─ components/          여러 화면 공용, 서버 호출 없음
   │  ├─ Layout.tsx        앱 셸(상단 메뉴·모바일 서랍, WF 2.2)
   │  ├─ StatusBadge.tsx   상태 배지(R-5)
   │  ├─ Modal.tsx         가운데 모달 / 모바일 하단 시트
   │  ├─ ConfirmDialog.tsx WF-11
   │  └─ Toast.tsx
   └─ features/            화면 단위. 각 폴더의 api.ts가 TanStack Query 훅(L-8)
      ├─ auth/             LoginPage.tsx, SignupPage.tsx, api.ts
      ├─ calendar/         CalendarPage.tsx, api.ts
      ├─ dates/            DateDetailPage.tsx, GroupCreateModal.tsx, GroupEditModal.tsx, api.ts
      ├─ attendance/       AttendancePage.tsx, api.ts
      ├─ me/               MePage.tsx, api.ts
      └─ admin/            MembersPage.tsx, MemberEditModal.tsx, GroupsPage.tsx(P1), api.ts
```

| ID | 원칙 |
|----|------|
| ST-4 | **(결정) 라우트**: `/login`, `/signup`, `/`(캘린더, `?month=YYYY-MM`), `/dates/:date`, `/attendance`, `/me`, `/admin/members`, `/admin/groups`(P1). URL이 화면 상태(월, 날짜, 필터)를 담아 새로고침·뒤로 가기가 그대로 동작하게 한다 |
| ST-5 | `GroupEditModal`(WF-10)은 P0에서 SCR-04가 쓰므로 `features/dates/`에 두고, P1의 `admin/GroupsPage`가 그대로 import한다. 기능 간 import는 허용하되 순환은 금지. `index.ts` 재수출(barrel) 파일은 만들지 않는다 |
| ST-6 | `components/`는 서버 호출·도메인 규칙이 없는 표시용만 둔다. 두 화면 이상에서 쓰이기 전에는 `components/`로 옮기지 않는다 |
