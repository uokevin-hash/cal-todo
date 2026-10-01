import type { GroupStatus } from '../types';

type Props = { status: GroupStatus; count: number; capacity: number };

// R-5: 참석가능 (n/정원) · 참석완료 (n/정원)
export function StatusBadge({ status, count, capacity }: Props) {
  const label = status === 'FULL' ? '참석완료' : '참석가능';
  return (
    <span className={`badge ${status === 'FULL' ? 'badge-full' : 'badge-open'}`}>
      {label} ({count}/{capacity})
    </span>
  );
}
