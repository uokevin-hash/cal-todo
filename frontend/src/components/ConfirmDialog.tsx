import { useT } from '../lib/i18n';

type Props = {
  title: string;
  message: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string; // 기본은 [삭제]
  cancelLabel?: string; // 기본은 [취소]
  isDanger?: boolean; // 기본은 빨간 버튼. 삭제가 아닌 동작이면 false(주 버튼 색)
};

// WF-11: 바깥을 눌러도 닫히지 않고 [취소]로만 닫는다
export function ConfirmDialog({
  title,
  message,
  isPending,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  isDanger = true,
}: Props) {
  const t = useT();
  return (
    <div className="overlay modal-overlay confirm-overlay">
      <div className="confirm" role="alertdialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-foot">
          <button
            className={`btn ${isDanger ? 'danger-fill' : 'primary'}`}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? t('working') : (confirmLabel ?? t('delete'))}
          </button>
          <button className="btn" disabled={isPending} onClick={onCancel}>
            {cancelLabel ?? t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
