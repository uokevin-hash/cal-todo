import { create } from 'zustand';
import type { Me } from './types';

export type Lang = 'ko' | 'en' | 'zh';

const LANG_KEY = 'lang';

// 화면 언어: 고른 값(이 브라우저에 저장) → 브라우저 언어 → 영어
// 저장하는 것은 언어 설정뿐이다. 토큰은 저장하지 않는다(PRD 6.1)
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ko' || saved === 'en' || saved === 'zh') return saved;
  } catch {
    // 저장소를 쓸 수 없는 환경(시크릿 모드 등)은 브라우저 언어를 따른다
  }
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('ko')) return 'ko';
  if (browser.startsWith('zh')) return 'zh';
  return 'en';
}

// L-9: 클라이언트 상태만. accessToken은 메모리에만 둔다(PRD 6.1)
type State = {
  accessToken: string | null;
  me: Me | null;
  isForcedOut: boolean; // WF-01: 강제 로그아웃으로 들어오면 로그인 카드에 안내
  toast: { id: number; message: string } | null;
  lang: Lang;
  setAccessToken: (accessToken: string) => void;
  setMe: (me: Me) => void;
  clearAuth: (isForcedOut?: boolean) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setLang: (lang: Lang) => void;
};

export const useStore = create<State>((set) => ({
  accessToken: null,
  me: null,
  isForcedOut: false,
  toast: null,
  lang: initialLang(),
  setAccessToken: (accessToken) => set({ accessToken }),
  setMe: (me) => set({ me, isForcedOut: false }),
  clearAuth: (isForcedOut = false) => set({ accessToken: null, me: null, isForcedOut }),
  showToast: (message) => set({ toast: { id: Date.now(), message } }),
  hideToast: () => set({ toast: null }),
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // 저장하지 못해도 이번 접속 동안은 바뀐 언어로 보인다
    }
    set({ lang });
  },
}));

// <html lang>을 화면 언어와 맞춘다(글꼴·읽기 도구가 참고)
document.documentElement.lang = useStore.getState().lang;
useStore.subscribe((s) => (document.documentElement.lang = s.lang));
