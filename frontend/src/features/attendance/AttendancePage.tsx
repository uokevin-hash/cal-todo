import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Field } from '../../components/Field';
import { Loading } from '../../components/Loading';
import { MemberNames } from '../../components/MemberName';
import { Segment } from '../../components/Segment';
import { StatusBadge } from '../../components/StatusBadge';
import { currentMonthRange, formatShort } from '../../lib/date';
import { errorField, errorMessage } from '../../lib/errors';
import { useAttendance, type AttendanceFilters } from './api';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'AVAILABLE', label: '참석가능' },
  { value: 'FULL', label: '참석완료' },
];

// SCR-06, WF-06. 조회한 필터는 URL에 담아 뒤로 가기·새로고침에도 남긴다(ST-4)
export function AttendancePage() {
  const [params] = useSearchParams();
  // 뒤로 가기로 URL이 바뀌면 입력 칸도 그 필터로 다시 채운다
  return <Attendance key={params.toString()} />;
}

function Attendance() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const range = currentMonthRange(); // 처음 열면 이번 달 1일~말일
  const applied: AttendanceFilters = {
    from: params.get('from') ?? range.from,
    to: params.get('to') ?? range.to,
    group: params.get('group') ?? '',
    name: params.get('name') ?? '',
    status: params.get('status') ?? '',
    capacity: params.get('capacity') ?? '',
  };
  const [form, setForm] = useState(applied);
  const [isOpen, setOpen] = useState(false);
  const { data: rows, isPending, error } = useAttendance(applied);
  const isRangeError = errorField(error) === 'to';
  const set = (key: keyof AttendanceFilters) => (value: string) =>
    setForm({ ...form, [key]: value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
    setOpen(false);
  };

  const summary = [
    `${formatShort(applied.from).split('(')[0]}~${formatShort(applied.to).split('(')[0]}`,
    applied.group,
    applied.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <h1 className="page-title desktop-only">참석 현황</h1>
      <form className={`filters${isOpen ? ' open' : ''}`} onSubmit={submit} noValidate>
        <button type="button" className="btn wide filter-toggle" onClick={() => setOpen(!isOpen)}>
          <span>{isOpen ? '필터' : `필터: ${summary}`}</span>
          <span>{isOpen ? '▲' : '▼'}</span>
        </button>
        <div className="filter-body">
          <Field label="기간" error={isRangeError ? errorMessage(error) : undefined}>
            <input
              className="input date"
              type="date"
              aria-label="시작일"
              value={form.from}
              onChange={(e) => set('from')(e.target.value)}
            />
            <span>~</span>
            <input
              className="input date"
              type="date"
              aria-label="종료일"
              value={form.to}
              onChange={(e) => set('to')(e.target.value)}
            />
          </Field>
          <Field label="그룹명">
            <input
              className="input"
              aria-label="그룹명"
              value={form.group}
              onChange={(e) => set('group')(e.target.value)}
            />
          </Field>
          <Field label="참석자 이름">
            <input
              className="input"
              aria-label="참석자 이름"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          </Field>
          <Field label="상태">
            <Segment
              name="status"
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={set('status')}
            />
          </Field>
          <Field label="정원">
            <select
              className="input"
              aria-label="정원"
              value={form.capacity}
              onChange={(e) => set('capacity')(e.target.value)}
            >
              <option value="">전체</option>
              <option value="2">2명</option>
              <option value="4">4명</option>
            </select>
          </Field>
          <button className="btn primary filter-submit">조회</button>
        </div>
      </form>

      {isPending && <Loading />}
      {error && !isRangeError && <p className="empty">{errorMessage(error)}</p>}
      {rows?.length === 0 && <p className="empty">조건에 맞는 참석 기록이 없습니다</p>}
      {!!rows?.length && (
        <div className="table attendance-table">
          <div className="tr th">
            <span>날짜</span>
            <span>그룹명</span>
            <span>정원</span>
            <span>상태</span>
            <span>참석자</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.groupId}
              className="tr clickable"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/dates/${row.date}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/dates/${row.date}`)}
            >
              <span className="c-date">
                {formatShort(row.date)}
                <span className="mobile-only"> · 정원 {row.capacity}</span>
              </span>
              <strong className="c-title">{row.groupName}</strong>
              <span className="desktop-only">{row.capacity}</span>
              <span className="c-badge">
                <StatusBadge status={row.status} count={row.count} capacity={row.capacity} />
              </span>
              <span className="c-sub">
                <MemberNames members={row.attendees} />
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
