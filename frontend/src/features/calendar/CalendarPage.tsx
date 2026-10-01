import { Link, useSearchParams } from 'react-router-dom';
import {
  addMonths,
  currentMonth,
  daysInMonth,
  formatMonth,
  todaySeoul,
  weekdayOf,
} from '../../lib/date';
import { GroupChat } from '../chat/GroupChat';
import { useCalendar } from './api';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// SCR-03, WF-03. 월은 URL(?month)에 담는다(ST-4). 캘린더 라이브러리 없이 손 그리드(L-16)
export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('month') ?? '';
  const month = MONTH_RE.test(raw) ? raw : currentMonth();
  const { data } = useCalendar(month);
  const today = todaySeoul();
  const days = new Map(data?.days.map((d) => [d.date, d]));
  const myGroups = (data?.days ?? []).flatMap((d) =>
    d.groups.filter((g) => g.mine).map((g) => ({ id: g.id, name: g.name, date: d.date })),
  );

  const first = weekdayOf(`${month}-01`);
  const cells = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, day: i + 1, dow: (first + i) % 7 };
  });

  return (
    <>
      <div className="month-bar">
        <button
          className="btn icon"
          aria-label="이전 달"
          onClick={() => setParams({ month: addMonths(month, -1) })}
        >
          ◀
        </button>
        <h1 className="page-title">{formatMonth(month)}</h1>
        <button
          className="btn icon"
          aria-label="다음 달"
          onClick={() => setParams({ month: addMonths(month, 1) })}
        >
          ▶
        </button>
        <button className="btn push-right" onClick={() => setParams({ month: currentMonth() })}>
          오늘
        </button>
      </div>
      <div className="calendar">
        {WEEK.map((w, i) => (
          <div key={w} className={`weekday dow-${i}`}>
            {w}
          </div>
        ))}
        {cells.map(({ date, day, dow }) => {
          const info = days.get(date);
          return (
            // R-6: 지난 날짜도 누를 수 있다
            <Link
              key={date}
              to={`/dates/${date}`}
              className={`day dow-${dow}${date === today ? ' today' : ''}`}
              style={day === 1 ? { gridColumnStart: first + 1 } : undefined}
              data-date={date}
            >
              <span className="day-num">{day}</span>
              {info && (
                <span className="day-marks">
                  {info.groups.map((group) => (
                    <span key={group.name} className="day-group">
                      {group.name}({group.count})
                    </span>
                  ))}
                  {info.attending && <b aria-label="참석">✔</b>}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="muted small">그룹명(n) = 그룹과 참여 인원 · ✔ = 내가 참석한 날</p>
      <GroupChat groups={myGroups} />
    </>
  );
}
