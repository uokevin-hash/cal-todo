# cal-todo 스타일 가이드

> 근거: [3-screen-design.md](3-screen-design.md) **v0.16**, [4-wireframes.md](4-wireframes.md) **v0.7**, [5-project-principle.md](5-project-principle.md) **v0.10**(L-13, ST 트리의 `styles.css`), 참고 이미지(캘린더 웹앱의 월간 화면 스크린샷, 2000×1016). 색 값은 참고 이미지의 픽셀에서 뽑은 값을 반올림했다. 배치·화면 구성은 와이어프레임(WF-n)이 기준이고, 이 문서는 색·글자·간격·컴포넌트 모양만 정한다. `SCR-n`은 화면 설계서, `WF-n`은 와이어프레임, `R-n`은 정의서의 비즈니스 규칙 번호다.

## 변경 이력

> 문서를 바꿀 때마다 표 맨 아래에 한 줄을 추가한다. 버전은 내용 추가·변경 시 소수점 자리(0.1 → 0.2), 구조가 크게 바뀌면 정수 자리(→ 1.0)를 올린다.

| 버전 | 날짜 | 변경자 | 변경내용 |
|------|------|--------|----------|
| 0.1 | 2026-10-01 | uokevin | 초안 작성: 참고 이미지에서 색·선·버튼·캘린더 칸 모양을 뽑아 토큰과 컴포넌트 규칙으로 정리 |

## 1. 원칙

| ID | 원칙 |
|----|------|
| SG-1 | **평평하고 선으로 나눈다.** 그림자·그라데이션 없이 흰 바탕 + 옅은 회색 선(1px)으로 영역을 나눈다. 강조는 색 하나(보라)로만 한다 |
| SG-2 | **강조색은 한 곳에 하나.** 주 버튼, 선택된 탭·메뉴, 체크 상자처럼 "지금 고른 것·누를 것"에만 보라를 쓴다. 정보(상태·날짜)는 회색 단계와 의미 색(빨강·파랑·초록)으로 나타낸다 |
| SG-3 | **배치는 WF가 기준이다.** 참고 이미지의 왼쪽 사이드바·미니 달력·상단 아이콘 줄은 따르지 않는다. 앱 셸은 WF 2.2(데스크톱 상단 가로 메뉴, 모바일 햄버거 + 왼쪽 서랍)를 그대로 쓴다 |
| SG-4 | **참고 이미지의 브랜드 요소는 쓰지 않는다.** 로고, 서비스 이름, 브랜드 색(녹색 로고 등)은 가져오지 않는다. 로고 자리는 글자 `cal-todo`다(WF 2.2) |
| SG-5 | **CSS 파일 하나.** 모든 규칙은 `frontend/src/styles.css`에 둔다(ST 트리, L-13). 색·간격은 아래 CSS 변수로만 쓰고, 컴포넌트 안에 색 값을 직접 적지 않는다 |

## 2. 색

### 2.1 색 토큰

| 토큰 | 값 | 참고 이미지에서 뽑은 곳 | 용도 |
|------|----|------------------------|------|
| `--color-primary` | `#6D5BEF` | [일정 쓰기] 버튼 배경, [월간] 선택 탭 | 주 버튼, 선택된 메뉴·탭, 체크 상자, 포커스 테두리, 캘린더 `●n`·`✔` |
| `--color-primary-strong` | `#5A48D6` | 주 버튼 가장자리 | 주 버튼 hover·눌림 |
| `--color-primary-weak` | `#F0EEFD` | (이미지에 없음, 주 색을 옅게) | 선택된 행·메뉴 배경, 보조 버튼 hover |
| `--color-text` | `#333333` | 사이드바 제목 글자 | 본문 글자 |
| `--color-text-strong` | `#111111` | 월 제목 `2026.10` | 화면 제목, 월 제목 |
| `--color-text-sub` | `#5C5C5C` | 안내 상자 글자, [오늘] 버튼 글자 | 보조 글자, 표 머리글 |
| `--color-text-muted` | `#8D8D8D` | 왼쪽 메뉴 글자, 요일 글자 | 요일, 설명, 비활성 메뉴 |
| `--color-text-faint` | `#B2B2B2` | 음력 날짜 글자 | 입력 칸 안내 문구(placeholder), 비활성 버튼 글자 |
| `--color-bg` | `#FFFFFF` | 본문 배경 | 페이지·칸·카드 배경 |
| `--color-bg-subtle` | `#F8F8F8` | 요일 머리 행 | 요일 머리 행, 표 머리글 행, 보조 버튼 hover |
| `--color-bg-muted` | `#F2F2F2` | 미니 달력 바탕 | 참석완료 배지 채움, 로딩 줄 |
| `--color-bg-today` | `#F5FAFD` | 오늘 칸 배경 | 캘린더 오늘 칸 |
| `--color-line` | `#E5E5E5` | 캘린더 칸 구분선 | 칸·표·카드 구분선 |
| `--color-line-soft` | `#F0F1F5` | 상단 바 아래 선 | 상단 바 아래 선, 서랍 구역 구분선 |
| `--color-border` | `#D0D0D0` | 검색 칸·[오늘] 버튼 테두리 | 입력 칸, 보조 버튼 테두리 |
| `--color-border-strong` | `#A2A3A5` | 오늘 칸 테두리 | 캘린더 오늘 칸 테두리 |
| `--color-sunday` | `#BA5753` | 일요일 숫자·요일 | 일요일 날짜·요일 |
| `--color-saturday` | `#344FCB` | 체크 상자의 파랑 | 토요일 날짜·요일(WF-03) |
| `--color-danger` | `#C8423B` | (일요일 빨강을 조금 진하게) | 칸 오류 문구, 삭제 버튼 |
| `--color-success` | `#24804A` | (이미지에 없음) | 참석가능 배지 |
| `--color-toast` | `#333333` | (이미지에 없음) | 토스트 배경(글자는 흰색) |
| `--color-overlay` | `rgb(0 0 0 / 40%)` | (이미지에 없음) | 모달·서랍 뒤 덮개 |

- 이미지에서 뽑은 값은 화면 축소로 글자 가장자리가 섞여 있어 반올림했다. 글자색은 가장 진한 픽셀 기준이다.
- 지난달·다음 달 날짜를 그릴 때는 해당 글자색에 `opacity: 0.4`를 준다(이미지의 흐린 27~30일). 현재 WF-03은 이번 달 날짜만 그린다.

### 2.2 대비 확인

| 조합 | 대비 | 쓰는 곳 |
|------|------|---------|
| 흰 글자 / `--color-primary` | 4.8 : 1 | 주 버튼 |
| `--color-text` / 흰 바탕 | 12.6 : 1 | 본문 |
| `--color-text-sub` / 흰 바탕 | 6.7 : 1 | 보조 글자, 표 머리글 |
| `--color-success` / 흰 바탕 | 4.9 : 1 | 참석가능 배지 글자 |
| `--color-danger` / 흰 바탕 | 4.9 : 1 | 칸 오류 문구 |
| `--color-text-muted` / 흰 바탕 | 3.3 : 1 | 요일·설명(12px 이상 굵게 또는 14px 이상에만) |
| `--color-text-faint` / 흰 바탕 | 2.1 : 1 | 안내 문구·비활성에만. 읽어야 하는 글자에는 쓰지 않는다 |

접근성은 PRD 3장에서 범위 밖이지만, 위 표 밖의 조합을 새로 만들지 않는 정도로만 지킨다.

## 3. 글자

| 토큰 | 크기 / 줄 높이 | 굵기 | 쓰는 곳 |
|------|---------------|------|---------|
| `--font-title` | 18px / 26px | 700 | 화면 제목, 캘린더 월 제목 `2026년 10월` |
| `--font-heading` | 15px / 22px | 700 | 구역 제목, 모달 제목, 날짜 상세의 그룹 이름 |
| `--font-body` | 14px / 20px | 400 | 본문, 입력 칸, 버튼, 메뉴 |
| `--font-small` | 12px / 18px | 400 | 요일, 캘린더 날짜 숫자, 칸 오류, 배지, 설명 |

- 글꼴: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif`. 웹 폰트는 내려받지 않는다.
- 참고 이미지는 본문이 12px이지만, 360px 모바일에서 읽고 누르기 쉽도록 본문을 14px로 올렸다. 캘린더 칸 안 글자는 이미지처럼 12px로 둔다.
- 숫자(날짜, `3/4` 인원)는 `font-variant-numeric: tabular-nums`로 폭을 맞춘다.

## 4. 간격·크기·선

| 토큰 | 값 | 쓰는 곳 |
|------|----|---------|
| `--space-1` ~ `--space-6` | 4, 8, 12, 16, 24, 32px | 모든 여백. 이 값만 쓴다 |
| `--radius` | 3px | 버튼, 입력 칸, 배지, 카드 (이미지의 버튼 모서리) |
| `--radius-pill` | 999px | 상태 배지 |
| `--control-h` | 32px(데스크톱) / 44px(모바일) | 버튼·입력 칸 높이. 모바일은 손가락으로 누르기 쉽게 키운다 |
| `--topbar-h` | 48px | 상단 바 |
| 선 | `1px solid var(--color-line)` | 칸·표·카드. 2px 선은 선택 표시(메뉴 밑줄)에만 쓴다 |

- 본문 폭과 좌우 여백은 WF 2.1을 따른다: 데스크톱 최대 1080px·여백 24px, 모바일 여백 16px.

## 5. 컴포넌트

### 5.1 앱 셸 (WF 2.2)

- **상단 바**: 흰 바탕, 높이 48px, 아래 선 `--color-line-soft`, 스크롤해도 위에 고정. 왼쪽 `cal-todo`(15px 700, `--color-text-strong`), 그 오른쪽에 메뉴, 맨 오른쪽 [로그아웃](보조 버튼).
- **메뉴 항목**: 14px `--color-text`. 지금 화면은 700 + `--color-primary` 글자 + 아래 2px `--color-primary` 밑줄(WF 2.2의 "굵은 글씨 + 밑줄").
- **모바일 서랍**: 폭 280px 흰 바탕, 뒤는 `--color-overlay`. 항목 높이 44px, 지금 화면 항목은 `--color-primary-weak` 배경 + `--color-primary` 글자. 구역 사이 선 `--color-line-soft`. 맨 위 사용자 이름은 `--font-heading`.

### 5.2 버튼

| 종류 | 모양 | 예 |
|------|------|----|
| 주 버튼 | 배경 `--color-primary`, 흰 글자, 테두리 없음, `--radius`. hover·눌림 `--color-primary-strong` | [로그인] [가입] [만들기] [저장] [참석] |
| 보조 버튼 | 흰 배경, 1px `--color-border`, `--color-text` 글자. hover 배경 `--color-bg-subtle` | [취소] [오늘] [로그아웃] |
| 위험 버튼 | 흰 배경, 1px `--color-danger`, `--color-danger` 글자 | 확인 창의 [삭제], 회원 관리 [삭제] |
| 글자 버튼 | 배경·테두리 없음, `--color-primary` 글자 | [편집] [빼기] 같은 행 안 작은 동작 |
| 비활성 | 배경 `--color-bg-muted`, 글자 `--color-text-faint`, `cursor: not-allowed` | WF 2.3의 `{ 참석 }`, 제출 중 `{ 저장 중… }` |

- 높이 `--control-h`, 좌우 안쪽 여백 `--space-3`, 글자 `--font-body`.
- 아이콘만 있는 버튼(◀ ▶ ✕)은 보조 버튼 모양의 정사각형(32×32, 모바일 44×44)으로 한다(이미지의 ◀ ▶ 버튼).

### 5.3 세그먼트 선택

참고 이미지의 [일간|주간|월간|목록] 묶음 모양이다. 붙어 있는 보조 버튼들 중 고른 하나만 주 버튼 색으로 채운다. 두세 개 중 하나를 고르는 곳에 라디오 대신 쓴다.

- 쓰는 곳: SCR-05·WF-10 정원 `2명 | 4명`, SCR-04 그룹 없이 참석의 정원 고르기, SCR-06 상태 필터 `전체 | 참석가능 | 참석완료`.
- 안쪽은 `<input type="radio">`를 숨기고 `<label>`을 버튼처럼 그린다(키보드·폼 동작을 그대로 쓰기 위해서).

### 5.4 입력 칸

- 흰 배경, 1px `--color-border`, `--radius`, 높이 `--control-h`, 안쪽 여백 `--space-2`. 안내 문구 `--color-text-faint`.
- 포커스: 테두리 `--color-primary` + `outline: none`.
- 오류: 테두리 `--color-danger`, 칸 바로 아래 `--font-small` `--color-danger` 한 줄(WF 2.4 칸 오류).
- 잠김(WF 2.3 `(잠김)`): 배경 `--color-bg-subtle`, 글자 `--color-text-sub`, `readonly`.
- 체크 상자·라디오는 브라우저 기본을 쓰고 `accent-color: var(--color-primary)`만 준다. 날짜는 `<input type="date">`(L-16).
- 라벨: 데스크톱은 칸 왼쪽, 모바일은 칸 위(WF 2.1). `--font-body` `--color-text-sub`.

### 5.5 캘린더 칸 (WF-03)

참고 이미지의 월간 표 모양을 그대로 따른다.

- **요일 머리 행**: 배경 `--color-bg-subtle`, 높이 28px, 글자 `--font-small` `--color-text-muted`, 왼쪽 정렬, 안쪽 여백 `--space-2`. `일`은 `--color-sunday`, `토`는 `--color-saturday`.
- **날짜 칸**: 흰 배경, 오른쪽·아래 1px `--color-line`. 데스크톱 높이 96px, 모바일 64px(약 48px 폭, WF-03). 칸 전체가 눌리는 영역이고 hover 배경 `--color-bg-subtle`.
- **날짜 숫자**: 칸 왼쪽 위, `--font-small`, 평일 `--color-text`, 일요일 `--color-sunday`, 토요일 `--color-saturday`.
- **오늘**: 배경 `--color-bg-today` + 1px `--color-border-strong` 테두리(칸 안쪽으로 그려 크기가 변하지 않게 `box-shadow: inset 0 0 0 1px`).
- **표시 `●n`·`✔`**: 숫자 아래 줄, `--font-small`. `●n`은 `--color-primary`, `✔`(내가 참석한 날)는 `--color-primary` 700. 모바일은 두 줄로 나눈다(WF-03).
- 공휴일 표시는 하지 않는다(공휴일 데이터가 없다).

### 5.6 상태 배지 (R-5, WF 2.4)

| 상태 | 모양 |
|------|------|
| 참석가능 (n/정원) | 흰 배경, 1px `--color-success`, `--color-success` 글자 |
| 참석완료 (n/정원) | `--color-bg-muted` 채움, 테두리 없음, `--color-text-sub` 글자 |

- `--radius-pill`, 높이 22px, 좌우 여백 `--space-2`, `--font-small`, 숫자는 tabular-nums.

### 5.7 목록·표·카드

- **날짜 상세 그룹 행(WF-04)**: 카드 하나에 그룹 하나. 1px `--color-line`, `--radius`, 안쪽 여백 `--space-4`, 카드 사이 `--space-3`. 첫 줄은 그룹 이름(`--font-heading`)과 상태 배지, 다음 줄은 참석자 이름(`--color-text-sub`), 오른쪽 아래에 동작 버튼. 내가 참석한 그룹(`mine`)은 왼쪽 3px `--color-primary` 선으로 표시한다.
- **표(데스크톱 SCR-06·SCR-08)**: 머리글 행 배경 `--color-bg-subtle`, 글자 `--color-text-sub` 700. 행 높이 40px, 행 사이 1px `--color-line`. hover 배경 `--color-bg-subtle`.
- **카드(모바일)**: 표 한 행이 카드 하나가 된다(L-13, 같은 컴포넌트에서 CSS로 바꾼다). 모양은 그룹 행 카드와 같다.
- **탈퇴 회원 표시**: `탈퇴 회원`, 관리자에게 보이는 `(탈퇴)`는 `--color-text-muted`로 쓴다(SCR 공통 요소).

### 5.8 모달·하단 시트·확인 창 (WF-05, WF-10, WF-11)

- 흰 바탕, 1px `--color-line`, `--radius`, 그림자 없음(SG-1). 뒤는 `--color-overlay`.
- 데스크톱 모달 폭 400px(회원 편집 패널 480px), 안쪽 여백 `--space-5`, 제목 `--font-heading`, 맨 아래 버튼 줄은 주 버튼 왼쪽·보조 버튼 오른쪽(WF 2.4).
- 모바일 하단 시트는 화면 아래에 붙고 위쪽 모서리만 `--radius`. 회원 편집 패널은 전체 화면.
- 오른쪽 위 닫기 ✕는 `--color-text-muted`, 누르는 영역 32×32(모바일 44×44).

### 5.9 토스트·안내 상자

- **토스트(WF 2.4)**: 배경 `--color-toast`, 흰 글자 `--font-body`, `--radius`, 안쪽 여백 `--space-3` `--space-4`. 화면 아래 가운데에서 `--space-6` 위, 3초 뒤 사라짐. 모바일은 좌우 16px 여백 전체 폭.
- **안내 상자**: 참고 이미지의 말풍선 모양. 흰 바탕, 1px `--color-border`, 글자 `--font-small` `--color-text-sub`, 오른쪽 위 ✕. 한 번 읽으면 되는 설명(예: SCR-07 "비밀번호를 바꾸면 다른 기기에서는 로그아웃됩니다")에 쓴다.

### 5.10 빈 상태·로딩 (WF 2.4)

- 빈 상태: 목록 자리 가운데 `--color-text-muted` 한두 줄, 그 아래 `--space-3` 띄워 다음 동작 버튼(주 버튼).
- 로딩: 높이 16px, `--color-bg-muted` 줄 3개, 줄 사이 `--space-2`. 움직임(애니메이션)은 넣지 않는다.
- 앱 시작 시 로그인 복원 중에는 화면 가운데 `cal-todo` 글자만 `--font-title` `--color-text-muted`로 보여 준다.

## 6. 반응형 (WF 2.1, L-13)

| 항목 | 모바일(~767px) | 데스크톱(768px~) |
|------|----------------|------------------|
| `--control-h` | 44px | 32px |
| 캘린더 칸 높이 | 64px | 96px |
| 본문 여백 | 16px | 24px, 최대 폭 1080px |
| 표 | 카드 목록 | 표 |
| 모달 | 하단 시트·전체 화면 | 가운데 모달 |

미디어 쿼리는 `@media (min-width: 768px)` 하나만 쓴다. 기본 규칙이 모바일이고, 데스크톱을 덮어쓴다.

## 7. `styles.css` 시작 부분

```css
:root {
  --color-primary: #6d5bef;
  --color-primary-strong: #5a48d6;
  --color-primary-weak: #f0eefd;
  --color-text: #333;
  --color-text-strong: #111;
  --color-text-sub: #5c5c5c;
  --color-text-muted: #8d8d8d;
  --color-text-faint: #b2b2b2;
  --color-bg: #fff;
  --color-bg-subtle: #f8f8f8;
  --color-bg-muted: #f2f2f2;
  --color-bg-today: #f5fafd;
  --color-line: #e5e5e5;
  --color-line-soft: #f0f1f5;
  --color-border: #d0d0d0;
  --color-border-strong: #a2a3a5;
  --color-sunday: #ba5753;
  --color-saturday: #344fcb;
  --color-danger: #c8423b;
  --color-success: #24804a;
  --color-toast: #333;
  --color-overlay: rgb(0 0 0 / 40%);

  --font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic',
    '맑은 고딕', sans-serif;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --radius: 3px;
  --radius-pill: 999px;
  --control-h: 44px;
  --topbar-h: 48px;
}

@media (min-width: 768px) {
  :root {
    --control-h: 32px;
  }
}

body {
  margin: 0;
  font: 14px/20px var(--font-family);
  color: var(--color-text);
  background: var(--color-bg);
}

input[type='checkbox'],
input[type='radio'] {
  accent-color: var(--color-primary);
}
```

## 8. 참고 이미지와 다르게 정한 점

| 항목 | 참고 이미지 | 이 가이드 | 이유 |
|------|-------------|-----------|------|
| 레이아웃 | 왼쪽 사이드바 + 미니 달력 | 상단 가로 메뉴, 모바일 서랍 | WF 2.2가 기준(SG-3) |
| 토요일 색 | 평일과 같은 검정 | 파랑 `--color-saturday` | WF-03 "토요일은 파란색" |
| 본문 글자 | 12px | 14px | 360px 모바일 가독성 |
| 참석가능 배지 | 없음 | 초록 테두리 | WF 2.4 "초록 계열" |
| 공휴일·음력 | 빨간 공휴일 이름, 회색 음력 날짜 | 표시 안 함 | 해당 데이터·요구사항이 없음 |
| 브랜드 | 로고·서비스명·녹색 브랜드 색 | 쓰지 않음, 글자 `cal-todo` | SG-4 |
