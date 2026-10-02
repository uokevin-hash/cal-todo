import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useChatImage } from './api';
import { useT } from '../../lib/i18n';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// 인증이 필요한 이미지를 Blob으로 받아 object URL로 보여 준다
// 더블클릭: 크게 보기, 오른쪽 클릭: 내려받을지 묻기
export function ChatImage({ path }: { path: string }) {
  const t = useT();
  const { data, isError } = useChatImage(path);
  const [isZoomed, setZoomed] = useState(false);
  const [isAsking, setAsking] = useState(false);

  // 크게 보기는 Esc로도 닫는다
  useEffect(() => {
    if (!isZoomed) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isZoomed]);

  if (isError) return <span className="muted">{t('imageFailed')}</span>;
  if (!data) return <span className="chat-image-loading" aria-label={t('imageLoading')} />;

  const fileName = `chat-${path.split('/').at(-2)}.${EXTENSIONS[data.type] ?? 'img'}`;
  const download = () => {
    const a = document.createElement('a');
    a.href = data.url;
    a.download = fileName;
    a.click();
    setAsking(false);
  };

  return (
    <>
      <img
        className="chat-image"
        src={data.url}
        alt={t('chatImage')}
        title={t('imageHint')}
        onDoubleClick={() => setZoomed(true)}
        onContextMenu={(e) => {
          e.preventDefault(); // 브라우저 기본 메뉴 대신 내려받을지 묻는다
          setAsking(true);
        }}
      />
      {isZoomed && (
        <div
          className="overlay lightbox"
          role="dialog"
          aria-label={t('zoomImage')}
          onClick={() => setZoomed(false)}
        >
          <img src={data.url} alt={t('zoomImage')} />
          <button className="btn icon lightbox-close" aria-label={t('close')}>
            ✕
          </button>
        </div>
      )}
      {isAsking && (
        <ConfirmDialog
          title={t('downloadTitle')}
          message={t('downloadMessage', { file: fileName })}
          confirmLabel={t('download')}
          isDanger={false}
          isPending={false}
          onConfirm={download}
          onCancel={() => setAsking(false)}
        />
      )}
    </>
  );
}
