import type { ReactNode } from 'react';
import { useT } from '../lib/i18n';

type Props = {
  label: string;
  error?: string;
  isLocked?: boolean;
  aside?: ReactNode; // 칸 오른쪽 글자(나이, 안내)
  children: ReactNode;
};

// 라벨 + 입력 칸 + 칸 오류(WF 2.4). 데스크톱은 라벨 왼쪽, 모바일은 라벨 위(WF 2.1)
export function Field({ label, error, isLocked, aside, children }: Props) {
  const t = useT();
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        <span className="field-row">
          {children}
          {isLocked && <span className="muted">{t('locked')}</span>}
          {aside && <span className="muted">{aside}</span>}
        </span>
        {error && <span className="field-error">! {error}</span>}
      </span>
    </div>
  );
}
