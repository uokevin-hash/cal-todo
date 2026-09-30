# cal-todo PRD

- **상태**: 검토 중
- **버전**: 0.12

> 근거: [1-definition.md](1-definition.md) **v0.14**, [2-user-scenarios.md](2-user-scenarios.md) **v0.17**, [3-screen-design.md](3-screen-design.md) **v0.15**, [prompts/PRD생성.md](../prompts/PRD생성.md). `REQ-n`·`R-n`·`UC-n`은 정의서, `S-n`은 시나리오, `SCR-n`은 화면 설계서 번호다. 도메인 규칙은 이 문서에서 다시 정의하지 않고 ID로 참조한다.

## 변경 이력

> 문서를 바꿀 때마다 표 맨 아래에 한 줄을 추가한다. 버전은 내용 추가·변경 시 소수점 자리(0.1 → 0.2), 구조가 크게 바뀌면 정수 자리(→ 1.0)를 올린다.

| 버전 | 날짜       | 변경자  | 변경내용  |
| ---- | ---------- | ------- | --------- |
| 0.1  | 2026-09-30 | uokevin | 초안 작성 |
| 0.2  | 2026-09-30 | uokevin | 인증을 JWT Access Token(15분, Bearer 헤더) + Refresh Token(14일, HttpOnly 쿠키, rotation·재사용 감지)으로 구체화: 6.1 인증 방식 추가, NFR-8·D-1 수정, `refresh_tokens` 테이블, `/auth/refresh` API 추가, 미결 사항에서 JWT 만료 항목 삭제 |
| 0.3  | 2026-09-30 | uokevin | PRD 평가 반영: 재사용 감지 30초 유예(6.1 흐름 5), 강제 폐기에서 역할 변경 제외·본인 비밀번호 변경 시 현재 세션 유지(흐름 8), 재발급 시 회원 재확인(흐름 4), Access Token에서 `role` 제거, 로그아웃 멱등(흐름 7), 폐기 행 보존 기간(흐름 9), 인증 오류 코드(D-4), SCR-04 관리자 버튼을 결정 D-7로 격상, FR-16을 삭제된 회원 보기 토글(P0)로 좁히고 검색은 FR-19(P1)로 분리, FR-1·FR-9·FR-11·FR-12·FR-13·FR-18 참조 수정, 부하 테스트 조건, M-5 대체 경로, 그룹 생성+참석 원자성, JWT 비밀키 검증·개발 프록시(NFR-9, NFR-14), 일정에 로그인·가입 화면과 인증 래퍼 추가, 상태·번호 정책 추가. v0.2에서 이력에 빠졌던 변경(6장 라이브러리 `cookie-parser`·`crypto`, 아키텍처 구성도, API 로그아웃 권한, Day1 오전 완료 기준)도 여기에 기록 |
| 0.4  | 2026-09-30 | uokevin | 시나리오 v0.9 반영: 비밀번호 변경 즉시 로그아웃을 위해 `members.password_changed_at` 추가, 인증 미들웨어·재발급에서 토큰 발급 시각과 비교(6.1 흐름 2·4·8, NFR-8), M-5 대상을 S-1 ~ S-15로 확대, FR 표 끊김 수정 |
| 0.5  | 2026-09-30 | uokevin | D-4에 로그인 실패 400 `INVALID_CREDENTIALS`와 오류 코드 전체 목록 추가(5-project-principle.md와 일치), 머리말 기준 버전 갱신 |
| 0.6  | 2026-09-30 | uokevin | 아키텍처 다이어그램 검토 반영: 두 번째 `REFRESH_RACE`는 SCR-01로(6.1 흐름 5), `기본` 그룹 생성은 참석 API로 확정·capacity 누락 시 400, 회원 삭제 API 응답(204, 자기 삭제 403 등), 머리말 기준 버전 갱신 |
| 0.7  | 2026-09-30 | uokevin | 정합성 점검 반영: 9장 `/auth/logout` 권한을 6.1 흐름 7(쿠키 없어도 204)에 맞춤, 머리말 기준 버전 갱신 |
| 0.8  | 2026-09-30 | uokevin | 계획 빈틈 결정 반영: 10장 일정을 8-plan.md 반나절 배치에 맞추고 예상 합계 19.5h 명시, 11장 일정 초과 대응에 M-5 모바일 확인 축소, 9장 핵심 응답 형식·`GET /attendance` 기간 기본값·상한(93일), 관리자 자기 비밀번호 변경 403(6.1 흐름 8, 9장), `기본` 그룹 이름 400(9장), 비밀번호 8자 이상·최대 72바이트(NFR-10, 12장에서 제거), FR-18 명세·429 `TOO_MANY_ATTEMPTS`(D-4), `refresh_tokens.revoked_reason`과 `ROTATED`에만 30초 유예(6.1 흐름 4·5·7·8, 7장), 머리말 기준 버전 갱신 |
| 0.9  | 2026-09-30 | uokevin | 잔여 빈틈 결정 반영: M-5에 일정 지연 시 모바일 확인 축소 조건, 6.1 흐름 5에 `LOGOUT`·`FORCED` 토큰 재사용 시 추가 폐기 없음 명시, 머리말 기준 버전 갱신 |
| 0.10 | 2026-09-30 | uokevin | 정합성 점검 반영: 머리말 기준 버전 갱신 |
| 0.11 | 2026-09-30 | uokevin | 정합성 점검 후속: 9장 핵심 응답 형식에 `PATCH /me` 추가(비밀번호 변경 시 `{accessToken}` + 새 Refresh 쿠키), 머리말 기준 버전 갱신 |
| 0.12 | 2026-09-30 | uokevin | API 빈틈 결정 반영: 9장 핵심 응답 형식에 `GET /calendar`·`GET /admin/members`·`GET /admin/groups` 본문, 가입 201 본문 없음, 그룹 생성 201 `{id}`, 참석 201 `{groupId}`, 관리자 PATCH 200 행 객체 추가, 새 비밀번호 필드 `newPassword`, `month` 선택·기본값, `GET /admin/groups` 기간 규칙, `GET /attendance`의 `group` 부분 일치·`status` 값, 참석 취소 멱등 204, 로그인 입력 400 `VALIDATION_ERROR`, 숫자가 아닌 경로 id 404, PATCH 부분 갱신, 그룹 생성 `attend` 기본값 `true` |

## 번호 정책

- `M-n`, `FR-n`, `NFR-n`, `D-n`은 한 번 붙이면 바꾸거나 다시 쓰지 않는다. 새 항목은 마지막 번호 다음을 쓴다.
- 없어진 항목은 지우지 않고 `(폐기, vX.Y)`로 남긴다.

## 1. 개요

| 항목          | 내용                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| 제품          | 배드민턴 동호회 일별 참석 관리 웹앱 (cal-todo)                                                         |
| 문제          | 인증된 회원이 날짜별 참석 여부와 조(그룹) 편성을 등록·조회할 수단이 없다 (정의서 1장)                  |
| 목표          | 회원이 캘린더에서 날짜·그룹을 골라 참석을 등록하고, 정원(2/4) 안에서 조를 짜며, 지난 기록까지 조회한다 |
| 목표 사용자   | 학생 및 일반인, 나이 제한 없음. 액터는 비회원·회원·관리자·영구 관리자 (정의서 3장)                     |
| 비즈니스 목표 | 1000명 동시 접속에서 정상 사용 (기준은 2장 M-1~M-3)                                                    |
| 제약          | 1인 개발, 2일 내 핵심 기능(P0) 완성, 1인 개발 수준 예산                                                |

## 2. 성공 지표

| ID  | 지표                                                       | 목표                                                                          | 측정 방법                           |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| M-1 | 동시 사용자 부하에서 읽기 API 응답시간                     | 가상 사용자 1000명(사용자당 5~10초 간격 요청, 약 100~200 RPS)에서 p95 ≤ 500ms | k6 또는 autocannon 부하 테스트 (P1) |
| M-2 | 같은 부하에서 쓰기 API(참석 등록·취소, 그룹 생성) 응답시간 | p95 ≤ 800ms                                                                   | 동일                                |
| M-3 | 오류율                                                     | 5xx·타임아웃 < 1%. 정원 초과 등 업무 규칙 거부(409)는 오류에서 제외           | 동일                                |
| M-4 | 정원·중복 참석 무결성                                      | 동시에 같은 그룹에 몰려도 정원 초과 0건, 같은 날짜 중복 참석 0건 (R-3, R-4)   | 동시 요청 테스트 후 DB 검증 쿼리    |
| M-5 | 핵심 흐름 완주                                             | S-1 ~ S-15 수동 시나리오 전부 통과. S-8·S-13의 "그룹 관리 화면" 단계는 SCR-04 관리자 버튼(D-7)으로 수행해도 통과로 본다. 일정이 밀리면 360px 모바일 확인은 SCR-03·SCR-04만 해도 통과로 본다(11장) | Day2 체크리스트                     |

**부하 테스트 조건 (M-1 ~ M-3)**

- 서버: 운영과 같은 VM 1대(2 vCPU, 4GB RAM 기준), 같은 VM의 PostgreSQL 17
- 시간: 준비 1분 + 1000 가상 사용자 유지 10분
- 초기 데이터: 회원 1000명, 3개월치 날짜별 그룹 4개와 참석 기록
- 요청 비율: 조회 80%(캘린더, 날짜 상세, 참석 현황), 쓰기 15%(참석 등록·취소, 그룹 생성), 로그인·토큰 재발급 5%

## 3. 범위

| 구분 | 항목                                                                                     |
| ---- | ---------------------------------------------------------------------------------------- |
| 포함 | 정의서 REQ-1 ~ REQ-17 전부, 반응형 웹 UI(데스크톱·모바일 브라우저)                       |
| 제외 | 접근성(WCAG, 스크린 리더 대응 등) — 이 앱에서는 고려하지 않음                            |
| 제외 | 네이티브 앱(iOS/Android), PWA 오프라인                                                   |
| 제외 | 알림(푸시·이메일·SMS), 비밀번호 찾기 메일 (관리자 비밀번호 변경 REQ-16으로 대체)         |
| 제외 | 소셜 로그인, 다국어, 결제, 페르소나별 상세 시나리오                                      |
| 제외 | 다중 서버·오토스케일링, 실시간 푸시(WebSocket). 화면 갱신은 TanStack Query 재조회로 처리 |

## 4. 기능 요구사항

P0 = 2일 내 필수, P1 = 시간 남으면 2일 내, P2 = 이후.

| ID    | 기능                                                                                    | 우선순위 | REQ                  | UC         | SCR                            |
| ----- | --------------------------------------------------------------------------------------- | -------- | -------------------- | ---------- | ------------------------------ |
| FR-1  | 회원가입(항목 검증, 나이 자동 표시, 삭제된 회원 이메일 재사용)                          | P0       | REQ-1, REQ-4, REQ-9, REQ-11 | UC-1       | SCR-02                         |
| FR-2  | 로그인·로그아웃, 미로그인 접근 차단, 삭제된 회원 로그인 차단                            | P0       | REQ-1, REQ-9         | UC-2       | SCR-01                         |
| FR-3  | 영구 관리자 시작 시 생성(환경 변수, 없으면 기동 실패)                                   | P0       | REQ-15               | UC-10      | -                              |
| FR-4  | 월 캘린더: 날짜별 그룹 수(●n), 내 참석(✔), 월 이동, 지난 날짜 선택                      | P0       | REQ-5, REQ-13        | UC-4       | SCR-03                         |
| FR-5  | 날짜 상세: 그룹 목록, 상태 배지, 참석자 이름, 참석·참석 취소                            | P0       | REQ-2, REQ-5, REQ-13 | UC-4       | SCR-04                         |
| FR-6  | 그룹 없이 참석(`기본` 그룹 자동 사용·생성, 정원 지정)                                   | P0       | REQ-2                | UC-4       | SCR-04, SCR-05                 |
| FR-7  | 그룹 만들기(이름, 정원 2/4, "만든 뒤 바로 참석")                                        | P0       | REQ-5, REQ-12        | UC-6       | SCR-05                         |
| FR-8  | 내 정보 조회·수정(비밀번호 변경은 현재 비밀번호 필요, 역할 보기 전용)                   | P0       | REQ-3, REQ-11        | UC-3       | SCR-07                         |
| FR-9  | 관리자 회원 편집(가입 정보, 새 비밀번호 지정, 영구 관리자 잠금)                         | P0       | REQ-10, REQ-15, REQ-16 | UC-7       | SCR-08                         |
| FR-10 | 관리자 회원 삭제(비활성화, 오늘 포함 이후 참석 정리)                                    | P0       | REQ-9                | UC-7       | SCR-08                         |
| FR-11 | 관리자 지정·해제(자기 해제 가능, 영구 관리자 잠금)                                      | P0       | REQ-14, REQ-15       | UC-8       | SCR-08                         |
| FR-12 | 관리자 그룹 편집·정원 조정·참석자 빼기                                                  | P0       | REQ-6, REQ-10        | UC-9       | SCR-04(D-7), SCR-09            |
| FR-13 | 관리자 그룹 삭제와 참석 기록 초기화(확인 창에 인원 표시)                                | P0       | REQ-17               | UC-11      | SCR-04(D-7), SCR-09            |
| FR-14 | 참석 현황 조회: 기간·그룹명·참석자 이름·상태·정원 필터, 행 클릭 시 SCR-04               | P0       | REQ-7, REQ-8         | UC-5       | SCR-06                         |
| FR-15 | 탈퇴 회원 표시(비관리자 `탈퇴 회원`, 관리자 실명+`(탈퇴)`, 비관리자 이름 검색에서 제외) | P0       | REQ-9                | UC-5, UC-7 | SCR-04, SCR-06, SCR-08, SCR-09 |
| FR-16 | [삭제된 회원 보기] 토글 (v0.2까지는 검색 포함, 검색은 FR-19로 분리)                     | P0       | REQ-9, REQ-10        | UC-7       | SCR-08                         |
| FR-17 | 그룹 관리 기간 조회 목록                                                                | P1       | REQ-6                | UC-9       | SCR-09                         |
| FR-18 | 로그인 시도 횟수 제한 (정의서에 없는 PRD 추가 보안 요구). 같은 이메일로 15분 안에 5회 실패하면 15분 동안 로그인 거부, 429 `TOO_MANY_ATTEMPTS`. 실패 기록은 서버 메모리(`Map`)에 둔다(서버 1대, 재시작 시 초기화 허용) | P2       | -                    | UC-2       | SCR-01                         |
| FR-19 | 회원 관리 검색(이름·이메일 부분 일치)                                                  | P1       | REQ-10               | UC-7       | SCR-08                         |

- FR-17이 P1인 이유: P0 기간에는 SCR-04의 관리자 버튼(D-7)으로 FR-12·FR-13을 먼저 제공한다.

## 5. 비기능 요구사항

| ID     | 분류        | 요구사항                                                                                                                                                                              |
| ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | 성능·동시성 | M-1 ~ M-3 충족. Node 단일 프로세스 + `pg.Pool`(max 20 내외). 목표 미달 시 PM2 cluster 모드로 코어 수만큼 확장                                                                         |
| NFR-2  | 성능        | 조회 API는 N+1 없이 한두 개 쿼리로 응답(그룹별 인원·참석자를 JOIN/집계로 한 번에). 필요한 인덱스는 7장                                                                                |
| NFR-3  | 무결성      | 정원(R-3)은 참석 등록·정원 변경 시 트랜잭션 안에서 그룹 행을 `SELECT ... FOR UPDATE`로 잠근 뒤 인원을 세서 보장한다                                                                   |
| NFR-4  | 무결성      | 중복 참석 금지(R-4)는 DB 제약 `UNIQUE(member_id, date)`로 보장하고, 위반(23505)은 409 "해당 날짜에 이미 참석한 그룹이 있습니다"로 변환한다                                            |
| NFR-5  | 무결성      | `기본` 그룹 동시 생성(R-2)은 `UNIQUE(date, name)` + `INSERT ... ON CONFLICT DO NOTHING` 후 재조회로 하나만 생긴다. 회원 삭제(R-9)·그룹 삭제(R-13)는 단일 트랜잭션                     |
| NFR-6  | 보안        | 비밀번호는 bcrypt(cost 10)로 해시 저장. 해시는 어떤 API 응답에도 내보내지 않는다(R-8)                                                                                                 |
| NFR-7  | 보안        | 모든 SQL은 pg 파라미터 쿼리(`$1, $2`)만 사용. 문자열 연결로 SQL을 만들지 않는다. 동적 필터(FR-14)도 조건 조각 + 파라미터 배열로 조립                                                  |
| NFR-8  | 보안        | 인증은 JWT Access Token(15분, `Authorization: Bearer` 헤더)과 Refresh Token(14일, `HttpOnly; Secure(운영); SameSite=Strict` 쿠키, 교체·재사용 감지)으로 한다(6.1, 결정 D-1). 매 요청 회원 행을 PK로 다시 읽어 `deleted_at`·`role`·`password_changed_at`을 확인한다                                      |
| NFR-9  | 보안        | 권한 검사는 서버에서 한다(R-8, R-10, R-11). 화면의 버튼 숨김은 편의일 뿐이다. 영구 관리자 이메일·초기 비밀번호·JWT 비밀키는 환경 변수로만 받는다. `JWT_ACCESS_SECRET`·`JWT_REFRESH_SECRET`이 없거나 32바이트보다 짧으면 서버가 시작되지 않는다. `jwt.verify`는 `algorithms: ['HS256']`로 고정하고 페이로드 `type`이 용도와 맞는지 검사한다 |
| NFR-10 | 입력 검증   | 서버에서 이메일·전화번호 형식(정의서 4.1), 정원 2/4, 날짜 형식, 비밀번호 길이(8자 이상, 최대 72바이트 — bcrypt 한계)를 검증한다. 클라이언트 검증은 보조                           |
| NFR-11 | 시간대      | "오늘"·나이 계산은 Asia/Seoul 기준(R-12). DB에서 `(now() AT TIME ZONE 'Asia/Seoul')::date`로 계산하고, 날짜는 `DATE`, 시각은 `TIMESTAMPTZ`로 저장. 서버 로컬 시간대에 의존하지 않는다 |
| NFR-12 | UI          | 반응형: 360px 모바일 ~ 데스크톱. 모바일에서 캘린더는 칸을 줄이고 표(SCR-06, SCR-08, SCR-09)는 가로 스크롤 또는 카드형으로 바꾼다                                                      |
| NFR-13 | 운영        | 서버 기동 시 스키마 SQL 파일 적용과 영구 관리자 확인(UC-10)을 수행. 에러는 콘솔 로그로 남긴다                                                                                         |
| NFR-14 | 개발 환경   | 개발 중에는 Vite `server.proxy`로 `/api`를 Express에 전달해 운영과 같은 출처로 동작시킨다. Refresh Token 쿠키(`SameSite=Strict`, `Path=/api/auth`)와 CORS 문제를 피하기 위해서다 |

## 6. 기술 스택과 아키텍처

| 계층       | 선택                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 프론트엔드 | React 19 + TypeScript + Vite, Zustand(로그인 사용자·UI 상태), TanStack Query(서버 데이터 조회·캐시, 쓰기 후 무효화) |
| 백엔드     | Node.js + JavaScript + Express, `pg`(Prisma 사용 금지), `bcrypt`, `jsonwebtoken`, `cookie-parser`, `crypto`(내장) |
| DB         | PostgreSQL 17                                                                                                       |
| 배포       | VM 1대(또는 저가 PaaS)에 Express + PostgreSQL. Express가 빌드된 SPA 정적 파일과 `/api`를 함께 서빙                  |

```
[브라우저: React SPA (반응형)]
      │  HTTPS, JSON, Authorization: Bearer <Access Token>, Refresh Token 쿠키(/api/auth만)
      ▼
[Express 서버 (Node)]
  ├─ 정적 파일 (Vite 빌드 결과)
  ├─ /api 라우터 → 인증 미들웨어(Access Token 검증 + 회원 행 재조회) → 권한 검사 → 핸들러
  └─ pg.Pool ──(파라미터 쿼리, 트랜잭션)──▶ [PostgreSQL 17]
```

### 6.1 인증 방식 (JWT Access Token + Refresh Token)

두 토큰 모두 JWT(`jsonwebtoken`, HS256)이며 서명 비밀키를 따로 쓴다. 비밀키는 환경 변수 `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`으로만 받는다(NFR-9).

| 항목 | Access Token | Refresh Token |
| ---- | ------------ | ------------- |
| 용도 | API 요청 인증 | Access Token 재발급 |
| 만료 | 15분 | 14일 |
| 페이로드 | `sub`(회원 id), `type: "access"`. 역할은 넣지 않는다. 서버는 DB의 역할을, 화면은 `GET /me` 응답의 역할을 쓴다 | `sub`, `jti`(무작위 UUID), `type: "refresh"` |
| 전달 | 응답 본문 → 요청 헤더 `Authorization: Bearer <token>` | `Set-Cookie: refresh_token`, `HttpOnly; Secure(운영); SameSite=Strict; Path=/api/auth` |
| 클라이언트 보관 | 메모리(Zustand 스토어)만. `localStorage`·`sessionStorage`에 저장하지 않는다 | 브라우저 쿠키(자바스크립트에서 읽을 수 없음) |
| 서버 보관 | 저장하지 않음 | `refresh_tokens` 테이블에 `jti`의 SHA-256 해시 저장(7장) |

**흐름**

1. **로그인** (`POST /auth/login`): 비밀번호를 확인하고 Access Token을 응답 본문에, Refresh Token을 쿠키로 준다. `refresh_tokens`에 행을 하나 추가한다. 기기(브라우저)마다 행이 따로 생긴다.
2. **API 요청**: 인증 미들웨어가 `Authorization` 헤더의 Access Token 서명과 만료를 검증한다. 이어서 회원 행을 PK로 다시 읽어 `deleted_at`·`role`을 확인한다. `password_changed_at`이 있으면 토큰 발급 시각(`iat`, 초)이 그 시각(초 단위 내림)보다 이전인 토큰은 거부하고 401 `UNAUTHENTICATED`로 응답한다. 이렇게 하면 역할 변경(S-10), 회원 삭제(R-9), 비밀번호 변경(S-15)이 Access Token 만료를 기다리지 않고 바로 반영된다.
3. **만료**: Access Token이 만료되면 401 + `TOKEN_EXPIRED`로 응답한다. 클라이언트의 API 호출 래퍼(TanStack Query가 쓰는 `fetch` 함수)가 `POST /auth/refresh`를 한 번 호출하고 원래 요청을 다시 보낸다. 동시에 여러 요청이 만료되더라도 재발급 요청은 하나만 보낸다(single-flight).
4. **재발급과 교체** (`POST /auth/refresh`): 쿠키의 Refresh Token을 검증하고 `jti` 해시가 `refresh_tokens`에 유효한 상태로 있는지 확인한다. 이어서 회원 행을 다시 읽어 삭제된 회원(`deleted_at`)이면 그 회원의 토큰을 모두 폐기(`FORCED`)하고 401 `UNAUTHENTICATED`로 응답한다. Refresh Token에도 흐름 2와 같은 `password_changed_at` 비교를 적용한다. 통과하면 기존 행을 폐기(`revoked_at`, `revoked_reason = 'ROTATED'`)하고 새 Access Token과 새 Refresh Token을 발급한다(rotation).
5. **재사용 감지**: 이미 폐기된 Refresh Token이 들어오면 `revoked_reason`과 `revoked_at`을 본다. 폐기 사유는 `ROTATED`(흐름 4 교체), `LOGOUT`(흐름 7), `FORCED`(흐름 4·5·8의 강제 폐기) 셋이며, 30초 유예는 `ROTATED`에만 적용한다.
   - `LOGOUT`·`FORCED`: 경과 시간과 관계없이 즉시 401 `UNAUTHENTICATED`. 다른 토큰은 추가로 폐기하지 않는다(로그아웃한 쿠키는 이미 지워졌고, 강제 폐기는 이미 전부 폐기된 상태다).
   - `ROTATED`, 폐기된 지 30초 이내: 여러 탭의 동시 새로고침이나 응답 유실로 보고, 전체 폐기 없이 401 `REFRESH_RACE`만 반환한다. 클라이언트는 한 번 더 `/auth/refresh`를 호출한다. 그 사이 다른 탭이 받은 새 쿠키가 브라우저에 공유되어 있으므로 재시도는 성공한다. 재시도에서도 `REFRESH_RACE`나 다른 401이 오면 더 재시도하지 않고 SCR-01로 보낸다.
   - `ROTATED`, 30초 경과: 탈취로 보고 그 회원의 Refresh Token을 모두 폐기(`FORCED`)한다. 401 `UNAUTHENTICATED`이며 모든 기기에서 다시 로그인해야 한다.
6. **새로고침·재방문**: Access Token은 메모리에만 있어 새로고침하면 사라진다. 앱이 시작할 때 `POST /auth/refresh`를 먼저 호출해 로그인 상태를 되살린다. 실패하면 SCR-01로 보낸다.
7. **로그아웃** (`POST /auth/logout`): 해당 Refresh Token 행을 폐기(`LOGOUT`)하고 쿠키를 지운다. 쿠키가 없거나 무효여도 쿠키를 지우고 204를 반환한다(멱등). 클라이언트는 메모리의 Access Token을 버린다.
8. **강제 폐기**: 비밀번호를 바꾸면(본인·관리자 모두) `password_changed_at`을 현재 시각으로 갱신한다. 흐름 2·4의 비교로 그 전에 발급된 Access Token도 즉시 거부된다.
   - 관리자의 비밀번호 변경(REQ-16), 회원 삭제(R-9): 그 회원의 Refresh Token을 모두 폐기(`FORCED`)한다. 관리자는 이 경로로 자기 비밀번호를 바꿀 수 없다(9장 `PATCH /admin/members/:id` 403, SCR-08 본인 행 잠금). 본인 비밀번호는 SCR-07에서만 바꾸며 아래 본인 변경 규칙을 따른다.
   - 본인 비밀번호 변경(`PATCH /me`): 다른 기기의 Refresh Token은 폐기(`FORCED`)하고, 현재 세션에는 `password_changed_at` 갱신 뒤 새 Access Token과 Refresh Token을 발급해 로그인을 유지한다.
   - 역할 변경(R-10)은 폐기하지 않는다. 흐름 2에서 매 요청 역할을 DB에서 읽으므로 바로 반영되고, S-10 2단계처럼 새로고침만 하면 메뉴가 바뀐다.
9. **정리**: 로그인할 때 그 회원의 행 중 만료(`expires_at` 경과)된 것을 지운다. 폐기된 행은 흐름 5의 재사용 판정에 필요하므로 만료될 때까지 남긴다. 별도 배치 작업은 두지 않는다.

- CSRF: 일반 API는 쿠키가 아니라 `Authorization` 헤더로 인증하므로 CSRF 대상이 아니다. Refresh Token 쿠키는 `SameSite=Strict`이고 `Path=/api/auth`로 좁혀 다른 경로에는 전송되지 않는다.
- XSS: Access Token은 메모리에만 있고 만료가 15분이라 노출 범위가 작다. Refresh Token은 `HttpOnly`라 스크립트로 읽을 수 없다.

## 7. 데이터 모델 요약

정의서 4장 엔티티를 테이블로 옮긴다. 파생값(나이 R-12, 그룹 상태 R-5)은 저장하지 않고 조회 때 계산한다.

| 테이블        | 주요 컬럼                                                                                                          | 제약·인덱스                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `members`     | id, name, email, password_hash, phone, birth_date `DATE`, role, is_permanent, deleted_at `TIMESTAMPTZ`, password_changed_at `TIMESTAMPTZ`(6.1 흐름 2·8), created_at | `CHECK(role IN ('MEMBER','ADMIN'))`; 활성 이메일 중복 불가: `UNIQUE INDEX ON (lower(email)) WHERE deleted_at IS NULL`; 영구 관리자 1명: `UNIQUE INDEX ON (is_permanent) WHERE is_permanent`; `CHECK(NOT is_permanent OR (role='ADMIN' AND deleted_at IS NULL))` |
| `groups`      | id, date `DATE`, name, capacity, created_by → members, created_at                                                  | `UNIQUE(date, name)`; `CHECK(capacity IN (2,4))`; 인덱스 `(date)`                                                                                                                                                                                               |
| `refresh_tokens` | id, member_id → members, token_hash(`jti`의 SHA-256), expires_at `TIMESTAMPTZ`, revoked_at `TIMESTAMPTZ`, revoked_reason `TEXT`(`ROTATED`·`LOGOUT`·`FORCED`, 6.1 흐름 5), created_at | `UNIQUE(token_hash)`; `CHECK`: revoked_reason은 세 값 중 하나이고 revoked_at과 함께 NULL이거나 함께 NOT NULL; 인덱스 `(member_id)`. 6.1 흐름 4·5·7·8·9에서 사용 |
| `attendances` | id, member_id → members, group_id → groups `ON DELETE CASCADE`, date `DATE`, created_at                            | `UNIQUE(member_id, date)`(R-4); 인덱스 `(group_id)`. `date`는 그룹 날짜를 복제한 컬럼으로, 그룹 날짜는 수정하지 않으므로(SCR-09) 어긋나지 않는다                                                                                                                |

- 회원은 물리 삭제하지 않으므로(R-9) `members` 참조 FK는 기본(RESTRICT)이다.
- 정원 초과 방지(R-3)는 DB 제약으로 표현할 수 없어 NFR-3의 행 잠금으로 보장한다.

## 8. 주요 결정 (정의서에 없는 사항)

| ID  | 결정                                                                                                                              | 이유                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| D-1 | 인증: JWT Access Token(15분, 메모리 보관, Bearer 헤더) + Refresh Token(14일, HttpOnly 쿠키, DB에 해시 저장, 교체·재사용 감지), 매 요청 회원 행 재조회(6.1) | Access Token을 짧게 두고 스크립트에서 읽을 수 없는 쿠키로 재발급해 탈취 피해를 줄인다. DB에 저장한 Refresh Token으로 로그아웃·강제 폐기가 가능하고, 재조회로 역할 변경(S-10)·회원 삭제(R-9)가 바로 반영된다 |
| D-2 | 정원은 그룹 행 `FOR UPDATE`, 중복 참석은 `UNIQUE(member_id, date)`                                                                | 가장 적은 코드로 동시 요청에서도 R-3·R-4를 보장                                                      |
| D-3 | `attendances.date` 비정규화 컬럼                                                                                                  | R-4를 DB 유니크 제약으로 걸기 위해                                                                   |
| D-4 | 업무 규칙 거부는 HTTP 409 + 오류 코드(`CAPACITY_FULL`, `ALREADY_ATTENDING`, `DUPLICATE_GROUP_NAME` 등), 권한 없음 403, 미인증 401. 401 코드는 `TOKEN_EXPIRED`(Access Token 만료 → 재발급 시도), `REFRESH_RACE`(재발급 재시도, 6.1 흐름 5), `UNAUTHENTICATED`(토큰 없음·무효·탈퇴 → SCR-01로 이동) 세 가지. 로그인 실패(없는 이메일·틀린 비밀번호·삭제된 회원)는 강제 로그아웃과 구분하려고 401이 아닌 400 `INVALID_CREDENTIALS`로 응답한다. 그 밖의 코드: 400 `VALIDATION_ERROR`·`WRONG_PASSWORD`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `EMAIL_TAKEN`·`CAPACITY_BELOW_COUNT`·`PERMANENT_ADMIN_LOCKED`·`MEMBER_DELETED`, 429 `TOO_MANY_ATTEMPTS`(FR-18, P2), 500 `INTERNAL`. 응답 형식은 `{error:{code,message,field?}}`([5-project-principle.md](5-project-principle.md) 5장) | 화면 문구(SCR-n)와 1:1로 매핑                                                                        |
| D-5 | 프론트 빌드는 Vite, 정적 파일은 Express가 서빙                                                                                    | 서버 1대로 배포 단순화                                                                               |
| D-6 | 부하 기준을 "가상 사용자 1000명, 5~10초 간격 요청"으로 정의                                                                       | "1000명 동시 접속"을 측정 가능한 값으로 바꾸기 위해                                                  |
| D-7 | P0에서는 SCR-04 날짜 상세의 각 그룹 행에 관리자에게만 [편집]·[삭제] 버튼을 보여 준다. [편집]은 SCR-09의 편집 패널과 같은 내용을 연다. 화면 설계서 SCR-04에 반영(v0.7) | 그룹 관리 목록(FR-17, SCR-09)을 P1로 미뤄도 FR-12·FR-13과 S-8·S-13을 2일 안에 제공하기 위해 |

## 9. API 개요

모든 경로는 `/api` 아래. 권한: 공개 = 비회원 가능, 회원 = 유효한 Access Token 필요(R-1), 관리자 = `ADMIN`(R-8). 인증 흐름은 6.1.

| 메서드 | 경로                                             | 권한   | 설명                                                    | UC         |
| ------ | ------------------------------------------------ | ------ | ------------------------------------------------------- | ---------- |
| POST   | `/auth/signup`                                   | 공개   | 회원가입                                                | UC-1       |
| POST   | `/auth/login`                                    | 공개   | 로그인. 본문에 Access Token, 쿠키로 Refresh Token 발급. `email`·`password` 누락·형식 오류는 400 `VALIDATION_ERROR`(`field`), 형식은 맞는데 인증 실패면 400 `INVALID_CREDENTIALS` | UC-2       |
| POST   | `/auth/refresh`                                  | 공개(Refresh Token 쿠키 필요) | Refresh Token 검증·교체, 새 Access Token 발급 | UC-2       |
| POST   | `/auth/logout`                                   | 공개(Refresh Token 쿠키, 없거나 무효여도 204) | Refresh Token 폐기, 쿠키 삭제      | UC-2       |
| GET    | `/me`                                            | 회원   | 내 정보(나이 포함)                                      | UC-3       |
| PATCH  | `/me`                                            | 회원   | 내 정보 수정, 비밀번호 변경 시 현재 비밀번호 필요(`currentPassword` + `newPassword`) | UC-3       |
| GET    | `/calendar?month=YYYY-MM`                        | 회원   | 날짜별 그룹 수, 내 참석 날짜. `month`는 선택이며 없으면 이번 달(Asia/Seoul). 형식이 틀리면 400 `VALIDATION_ERROR`(`field: month`) | UC-4       |
| GET    | `/dates/:date/groups`                            | 회원   | 그날 그룹·상태·참석자                                   | UC-4       |
| POST   | `/dates/:date/groups`                            | 회원   | 그룹 생성 `{name, capacity, attend?}`. `name`·`capacity` 필수, `attend`는 선택이며 기본값 `true`(SCR-05 "만든 뒤 바로 참석" 기본 선택). 한 트랜잭션으로 처리하며, `attend=true`인데 그날 이미 참석 중(R-4)이면 그룹도 만들지 않고 409. 이름이 `기본`이면 400 `VALIDATION_ERROR`(`field: name`, R-2) | UC-6       |
| POST   | `/dates/:date/attendance`                        | 회원   | 그룹 없이 참석. `기본` 그룹이 있으면 참석, 없으면 `{capacity}`로 생성 후 참석(`ON CONFLICT DO NOTHING`, NFR-5). `기본` 그룹 생성은 반드시 이 API로 한다(그룹 생성 API는 이름 `기본`을 400으로 거부한다, R-2). `기본` 그룹이 없는데 `capacity`가 없으면 400 `VALIDATION_ERROR`(`field: capacity`) | UC-4       |
| POST   | `/groups/:id/attendance`                         | 회원   | 해당 그룹 참석                                          | UC-4       |
| DELETE | `/groups/:id/attendance`                         | 회원   | 내 참석 취소. 멱등: 참석하지 않은 그룹이어도 204. 그룹 자체가 없으면 404 `NOT_FOUND` | UC-4       |
| GET    | `/attendance?from&to&group&name&status&capacity` | 회원   | 참석 현황 조회·필터. `from`·`to`가 없으면 이번 달(Asia/Seoul) 1일~말일. 기간은 최대 93일이며 넘으면 400 `VALIDATION_ERROR`(`field: to`). `group`은 그룹명 부분 일치(대소문자 무시, `name`과 같은 방식), `status`는 `AVAILABLE`/`FULL`. 페이지네이션 없음 | UC-5       |
| GET    | `/admin/members?q&includeDeleted`                | 관리자 | 회원 목록                                               | UC-7       |
| PATCH  | `/admin/members/:id`                             | 관리자 | 회원 정보·새 비밀번호(`newPassword`)·역할 수정. 대상이 자기 자신인데 새 비밀번호가 있으면 403 `FORBIDDEN`(본인 비밀번호는 `PATCH /me`, 6.1 흐름 8) | UC-7, UC-8 |
| DELETE | `/admin/members/:id`                             | 관리자 | 회원 비활성화. 성공 204. 자기 자신은 403 `FORBIDDEN`(R-9), 영구 관리자 409 `PERMANENT_ADMIN_LOCKED`, 이미 삭제됨 409 `MEMBER_DELETED` | UC-7       |
| GET    | `/admin/groups?from&to`                          | 관리자 | 그룹 목록. `from`·`to`는 `GET /attendance`와 같은 규칙(없으면 이번 달 1일~말일, 최대 93일, 넘으면 400 `VALIDATION_ERROR` `field: to`) | UC-9       |
| PATCH  | `/admin/groups/:id`                              | 관리자 | 그룹명·정원 수정. 새 이름이 `기본`이거나 `기본` 그룹의 이름을 바꾸면 400 `VALIDATION_ERROR`(`field: name`, R-2) | UC-9       |
| DELETE | `/admin/groups/:id/attendance/:memberId`         | 관리자 | 참석자 빼기                                             | UC-9       |
| DELETE | `/admin/groups/:id`                              | 관리자 | 그룹 삭제와 참석 초기화                                 | UC-11      |

- UC-10(영구 관리자 생성)은 API가 아니라 서버 기동 절차다.
- 탈퇴 회원 이름 가림(FR-15)은 서버가 요청자 역할에 따라 응답에서 처리한다. 클라이언트에 실명을 보내지 않는다.
- 경로 id(`:id`, `:memberId`)가 숫자가 아니면(정수로 해석 불가) 존재하지 않는 대상과 같게 404 `NOT_FOUND`로 응답한다.
- `PATCH /me`, `PATCH /admin/members/:id`, `PATCH /admin/groups/:id`는 부분 갱신이다. 보낸 필드만 바꾸고 없는 필드는 그대로 둔다. 빈 본문 `{}`은 200(변경 없음).

**핵심 응답 형식** (JSON 필드는 camelCase, 날짜는 `"YYYY-MM-DD"`)

| API | 성공 응답 본문 |
| --- | -------------- |
| `POST /auth/signup` | 201, 본문 없음 |
| `POST /auth/login`, `POST /auth/refresh` | `{accessToken}` + Refresh Token 쿠키(6.1) |
| `GET /me` | `{id, name, email, phone, birthDate, age, role, isPermanent}` |
| `PATCH /me` | 비밀번호를 바꾸지 않으면 `GET /me`와 같은 본문. 비밀번호를 바꾸면 로그인과 같은 `{accessToken}` + 새 Refresh Token 쿠키(현재 세션 유지, 6.1 흐름 8). 이때 화면은 새 Access Token을 저장한 뒤 `GET /me`로 다시 읽는다 |
| `GET /calendar` | `{month, days: [{date, groupCount, attending}]}`. 그룹이 있거나 내가 참석한 날짜만 담는다. `attending`은 그날 내가 참석 중인지(boolean) |
| `GET /dates/:date/groups` | `[{id, name, capacity, count, status, createdBy: {memberId, name}, attendees: [{memberId, name}], mine}]` |
| `POST /dates/:date/groups` | 201 `{id}`(만든 그룹 id) |
| `POST /dates/:date/attendance` | 201 `{groupId}`(들어간 `기본` 그룹 id) |
| `POST /groups/:id/attendance` | 201 `{groupId}` |
| `GET /attendance` | 그룹 단위 행 배열. 행마다 `{date, groupId, groupName, capacity, count, status, attendees: [{memberId, name}]}` |
| `GET /admin/members` | `[{id, name, email, phone, birthDate, age, role, isPermanent, isDeleted}]`(`GET /me` 필드 + `isDeleted`). 관리자 응답이므로 탈퇴 회원도 실명 |
| `PATCH /admin/members/:id` | 200, `GET /admin/members`의 한 행과 같은 객체 |
| `GET /admin/groups` | `[{id, date, name, capacity, count, status, createdBy: {memberId, name, isDeleted?}}]` |
| `PATCH /admin/groups/:id` | 200, `GET /admin/groups`의 한 행과 같은 객체 |

- `status`는 `"AVAILABLE"`(참석가능) 또는 `"FULL"`(참석완료)이다(R-5). `count`는 현재 참석 인원, `mine`은 요청자가 그 그룹에 참석했는지 여부다.
- 회원 표시 객체 `{memberId, name}`(참석자, 만든 사람): 비관리자에게 탈퇴 회원은 `name: "탈퇴 회원"`으로 가리고 `memberId`는 그대로 보낸다(숫자 ID만으로는 실명이 드러나지 않는다). 관리자에게 탈퇴 회원은 `name`에 실명을 넣고 `isDeleted: true`를 붙인다(R-9, FR-15).

## 10. 2일 일정

| 시점      | 마일스톤                                                                              | 예상(h) | 완료 기준                            |
| --------- | ------------------------------------------------------------------------------------- | ------- | ------------------------------------ |
| Day1 오전 | 프로젝트 골격, 스키마 마이그레이션, 영구 관리자 시드, 인증 API(가입·로그인·재발급·로그아웃) | 4.5     | FR-1 ~ FR-3, curl로 가입·로그인·토큰 재발급 확인 |
| Day1 오후 | 앱 골격과 인증 fetch 래퍼(재발급 single-flight, 앱 시작 시 재발급), Vite 프록시(NFR-14), 로그인·가입 화면(SCR-01, SCR-02). 이어서 참석 도메인 API(그룹 생성, 참석·취소, 기본 그룹, 동시성 제어) + 캘린더 화면 | 5.5     | FR-1·FR-2 화면, FR-4, API 수준 FR-5 ~ FR-7(T-5 동시성), S-1·S-2 통과 |
| Day2 오전 | 날짜 상세·그룹 만들기 화면(SCR-04, SCR-05), 내 정보, 관리자 회원 API와 화면(삭제된 회원 보기 포함), 관리자 그룹 API | 5       | FR-5 ~ FR-11·FR-16 화면, S-3 ~ S-6·S-9 ~ S-12·S-15 통과 |
| Day2 오후 | SCR-04 관리자 버튼(D-7), 참석 현황 조회, 탈퇴 회원 표시, 배포, 시나리오 전체 점검(반응형 수정 포함) | 4.5     | FR-12 ~ FR-15, S-7·S-8·S-13 통과(S-8·S-13은 SCR-04 경로), M-4·M-5 |
| 여유 시   | P1 기능, 간단한 부하 테스트                                                           | -       | FR-17·FR-19, M-1 ~ M-3 측정          |

- P0 예상 합계는 **19.5h**다([8-plan.md](8-plan.md) 1.1). 범위를 줄이지 않고 하루 약 10h로 2일에 수행한다. 반나절별 Task 배치는 8-plan.md 3.1.

## 11. 리스크와 대응

| 리스크                                                                         | 영향                                     | 대응                                                                                                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1000 동시 접속 목표와 2일 일정의 긴장 — 제대로 된 부하 테스트·튜닝 시간이 없다 | 목표 달성 여부를 확인하지 못함           | 설계로 먼저 막는다(인덱스, 집계 쿼리, 커넥션 풀). 부하 테스트는 k6/autocannon 한 스크립트로 P1. 미달 시 PM2 cluster, 풀 크기 조정 순서로 대응 |
| bcrypt가 CPU를 많이 써 로그인이 몰리면 이벤트 루프 지연                        | 로그인 p95 악화                          | 비동기 bcrypt 사용, cost 10 고정. 부하 시나리오에서 로그인 비중을 실제처럼 낮게 잡는다                                                        |
| 정원·중복 참석 경합(R-3, R-4)                                                  | 정원 초과·중복 기록                      | NFR-3 ~ NFR-5, M-4 동시 요청 테스트                                                                                                           |
| 탈퇴 회원 표시 규칙(R-9)이 여러 화면에 걸쳐 누락                               | 비관리자에게 실명 노출                   | 이름 가림을 서버 공통 함수 하나로 처리하고 모든 조회 API가 거친다                                                                             |
| 시간대 오류(R-12)                                                              | 회원 삭제 시 "오늘" 경계, 나이 계산 오차 | "오늘"을 DB 한 곳(Asia/Seoul)에서만 계산                                                                                                      |
| 1인 개발 일정 초과                                                             | P0 미완성                                | P1·P2는 과감히 미룬다. SCR-09 목록 대신 SCR-04에서 관리 기능 제공(D-7). 그래도 밀리면 M-5 모바일(360px) 확인을 SCR-03·SCR-04로 좁힌다 |

## 12. 미결 사항

결정이 필요한 사항이 생기면 여기에 적고, 결정되면 해당 절에 반영한 뒤 이 목록에서 지운다.

- 운영 호스팅(VM 또는 PaaS) 선택과 도메인·HTTPS 인증서.
