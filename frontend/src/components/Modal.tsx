import type { ReactNode } from 'react';
import { useT } from '../lib/i18n';

type Props = {
  title: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
  isFullOnMobile?: boolean; // 회원 편집 패널(WF-08)은 모바일 전체 화면
};

// 데스크톱 가운데 모달 / 모바일 하단 시트(WF-05, WF-10)
export function Modal({ title, onClose, footer, children, isFullOnMobile }: Props) {
  const t = useT();
  return (
    <div className="overlay modal-overlay" onClick={onClose}>
      <div
        className={`modal${isFullOnMobile ? ' modal-full' : ''}`}
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <button className="btn icon modal-back" aria-label={t('back')} onClick={onClose}>
            ←
          </button>
          <h2>{title}</h2>
          <button className="btn icon modal-close" aria-label={t('close')} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}
