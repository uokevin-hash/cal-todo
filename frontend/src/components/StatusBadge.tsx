import { todaySeoul } from '../lib/date';
import { useT } from '../lib/i18n';
import type { GroupStatus } from '../types';

type Props = { status: GroupStatus; count: number; capacity: number; date: string };

// R-5: 참석가능 (n/정원) · 참석완료 (n/정원). R-6: 지난 날짜는 참석불가 (n/정원)
export function StatusBadge({ status, count, capacity, date }: Props) {
  const t = useT();
  const closed = status === 'FULL' || date < todaySeoul();
  const label =
    status === 'FULL' ? t('statusFull') : closed ? t('statusClosed') : t('statusAvailable');
  return (
    <span className={`badge ${closed ? 'badge-full' : 'badge-open'}`}>
      {label} ({count}/{capacity})
    </span>
  );
}
