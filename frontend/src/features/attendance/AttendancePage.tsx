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
import { groupLabel, useT, type Key } from '../../lib/i18n';

const STATUS_OPTIONS: { value: string; label: Key }[] = [
  { value: '', label: 'statusAll' },
  { value: 'AVAILABLE', label: 'statusAvailable' },
  { value: 'FULL', label: 'statusFull' },
];

// 필터 요약용 월/일(예: 10/1)
const monthDay = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;

// SCR-06, WF-06. 조회한 필터는 URL에 담아 뒤로 가기·새로고침에도 남긴다(ST-4)
export function AttendancePage() {
  const [params] = useSearchParams();
  // 뒤로 가기로 URL이 바뀌면 입력 칸도 그 필터로 다시 채운다
  return <Attendance key={params.toString()} />;
}

function Attendance() {
  const t = useT();
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
  // 서버는 역순·93일 초과를 같은 칸(to)으로 거부하므로 역순은 화면이 구분한다
  const rangeMessage = applied.from > applied.to ? t('errRangeOrder') : errorMessage(error);
  const set = (key: keyof AttendanceFilters) => (value: string) =>
    setForm({ ...form, [key]: value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
    setOpen(false);
  };

  const summary = [`${monthDay(applied.from)}~${monthDay(applied.to)}`, applied.group, applied.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <h1 className="page-title desktop-only">{t('menuAttendance')}</h1>
      <form className={`filters${isOpen ? ' open' : ''}`} onSubmit={submit} noValidate>
        <button type="button" className="btn wide filter-toggle" onClick={() => setOpen(!isOpen)}>
          <span>{isOpen ? t('filter') : t('filterSummary', { summary })}</span>
          <span>{isOpen ? '▲' : '▼'}</span>
        </button>
        <div className="filter-body">
          <Field label={t('period')} error={isRangeError ? rangeMessage : undefined}>
            <input
              className="input date"
              type="date"
              aria-label={t('startDate')}
              value={form.from}
              onChange={(e) => set('from')(e.target.value)}
            />
            <span>~</span>
            <input
              className="input date"
              type="date"
              aria-label={t('endDate')}
              value={form.to}
              onChange={(e) => set('to')(e.target.value)}
            />
          </Field>
          <Field label={t('groupName')}>
            <input
              className="input"
              aria-label={t('groupName')}
              value={form.group}
              onChange={(e) => set('group')(e.target.value)}
            />
          </Field>
          <Field label={t('attendeeName')}>
            <input
              className="input"
              aria-label={t('attendeeName')}
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          </Field>
          <Field label={t('status')}>
            <Segment
              name="status"
              value={form.status}
              options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              onChange={set('status')}
            />
          </Field>
          <Field label={t('capacity')}>
            <select
              className="input"
              aria-label={t('capacity')}
              value={form.capacity}
              onChange={(e) => set('capacity')(e.target.value)}
            >
              <option value="">{t('statusAll')}</option>
              <option value="2">{t('capacity2')}</option>
              <option value="4">{t('capacity4')}</option>
            </select>
          </Field>
          <button className="btn primary filter-submit">{t('query')}</button>
        </div>
      </form>

      {isPending && <Loading />}
      {error && !isRangeError && <p className="empty">{errorMessage(error)}</p>}
      {rows?.length === 0 && <p className="empty">{t('noAttendanceRows')}</p>}
      {!!rows?.length && (
        <div className="table attendance-table">
          <div className="tr th">
            <span>{t('date')}</span>
            <span>{t('groupName')}</span>
            <span>{t('capacity')}</span>
            <span>{t('status')}</span>
            <span>{t('attendees')}</span>
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
                <span className="mobile-only"> · {t('capacityShort', { n: row.capacity })}</span>
              </span>
              <strong className="c-title">{groupLabel(row.groupName)}</strong>
              <span className="desktop-only">{row.capacity}</span>
              <span className="c-badge">
                <StatusBadge
                  status={row.status}
                  count={row.count}
                  capacity={row.capacity}
                  date={row.date}
                />
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
