import { useEffect } from 'react';
import { useStore } from '../store';

// WF 2.4: 하단 가운데, 3초 뒤 사라짐
export function Toast() {
  const toast = useStore((s) => s.toast);
  const hideToast = useStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hideToast, 3000);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast.message}
    </div>
  );
}
