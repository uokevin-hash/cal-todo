import { useStore } from '../store';
import { LOCALES, t } from './i18n';

// 표시용 날짜 계산(C-11). 규칙 판단(오늘, 나이)은 서버가 한다. 날짜는 "YYYY-MM-DD" 문자열로만 다룬다

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

function utc(date: string) {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d));
}

export function weekdayOf(date: string): number {
  return utc(date).getUTCDay();
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
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

const locale = () => LOCALES[useStore.getState().lang];

// 요일·월 이름은 Intl이 화면 언어로 만든다(UTC 자정 기준이라 시간대 밀림 없음)
function names(date: string) {
  const at = utc(date);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...options }).format(at);
  return {
    ...parts(date),
    w: format({ weekday: 'short' }),
    mon: format({ month: 'short' }),
    monLong: format({ month: 'long' }),
  };
}

// 일 ~ 토 요일 이름(캘린더 머리 행). 2026-10-04는 일요일
export function weekdayNames(): string[] {
  return Array.from({ length: 7 }, (_, i) => names(`2026-10-${String(4 + i).padStart(2, '0')}`).w);
}

// 한국어 예: 1974년11월14일(52세)
export function formatBirth(birthDate: string): string {
  return t('fmtBirth', { ...names(birthDate), age: ageOf(birthDate) });
}

// 한국어 예: 2026년 10월 3일 (토)
export function formatLong(date: string): string {
  return t('fmtLong', names(date));
}

// 한국어 예: 10월 3일 (토)
export function formatMonthDay(date: string): string {
  return t('fmtMonthDay', names(date));
}

// 한국어 예: 10/3(토)
export function formatShort(date: string): string {
  return t('fmtShort', names(date));
}

// 한국어 예: 2026년 10월
export function formatMonth(month: string): string {
  return t('fmtMonth', names(`${month}-01`));
}

// 채팅·보관함 시각(서울 기준)
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
