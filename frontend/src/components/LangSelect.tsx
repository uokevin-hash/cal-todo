import { LANG_OPTIONS, useT } from '../lib/i18n';
import { useStore, type Lang } from '../store';

// 화면 언어 선택. 고른 값은 이 브라우저에 기억한다
export function LangSelect() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <select
      className="input lang-select"
      aria-label={t('language')}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
    >
      {LANG_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
