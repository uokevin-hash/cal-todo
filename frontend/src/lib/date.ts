// 표시용 날짜 계산(C-11). 규칙 판단(오늘, 나이)은 서버가 한다. 날짜는 "YYYY-MM-DD" 문자열로만 다룬다

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// R-12: 서울 기준 오늘
export function todaySeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function currentMonth(): string {
  return todaySeoul().slice(0, 7);
}

function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

export function weekdayOf(date: string): number {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
}

// SCR-06: 처음 열면 이번 달 1일~말일
export function currentMonthRange(): { from: string; to: string } {
  const month = currentMonth();
  return { from: `${month}-01`, to: `${month}-${daysInMonth(month)}` };
}

// 나이 = 현재연도 - 출생연도(SCR 공통 요소)
export function ageOf(birthDate: string): number {
  return parts(todaySeoul()).y - parts(birthDate).y;
}

// 1974년11월14일(52세)
export function formatBirth(birthDate: string): string {
  const { y, m, d } = parts(birthDate);
  return `${y}년${m}월${d}일(${ageOf(birthDate)}세)`;
}

// 2026년 10월 3일 (토)
export function formatLong(date: string): string {
  const { y, m, d } = parts(date);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[weekdayOf(date)]})`;
}

// 10월 3일 (토)
export function formatMonthDay(date: string): string {
  const { m, d } = parts(date);
  return `${m}월 ${d}일 (${WEEKDAYS[weekdayOf(date)]})`;
}

// 10/3(토)
export function formatShort(date: string): string {
  const { m, d } = parts(date);
  return `${m}/${d}(${WEEKDAYS[weekdayOf(date)]})`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}
