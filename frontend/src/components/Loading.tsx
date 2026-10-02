import { useT } from '../lib/i18n';

// WF 2.4: 목록 조회 중 회색 줄 3개
export function Loading() {
  const t = useT();
  return (
    <div className="loading" aria-label={t('loading')}>
      <span />
      <span />
      <span />
    </div>
  );
}
