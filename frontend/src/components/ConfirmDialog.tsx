type Props = {
  title: string;
  message: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string; // 기본은 삭제(빨간 버튼). 다른 동작이면 주 버튼 색
};

// WF-11: 바깥을 눌러도 닫히지 않고 [취소]로만 닫는다
export function ConfirmDialog({
  title,
  message,
  isPending,
  onConfirm,
  onCancel,
  confirmLabel = '삭제',
}: Props) {
  return (
    <div className="overlay modal-overlay confirm-overlay">
      <div className="confirm" role="alertdialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-foot">
          <button
            className={`btn ${confirmLabel === '삭제' ? 'danger-fill' : 'primary'}`}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? `${confirmLabel} 중…` : confirmLabel}
          </button>
          <button className="btn" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
