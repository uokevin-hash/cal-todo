import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { formatMonthDay } from '../lib/date';
import { useT, type Key } from '../lib/i18n';
import { useStore } from '../store';
import { LangSelect } from './LangSelect';

const MEMBER_MENU: { to: string; label: Key }[] = [
  { to: '/', label: 'menuCalendar' },
  { to: '/attendance', label: 'menuAttendance' },
  { to: '/me', label: 'menuMe' },
];
// R-8: 관리자에게만. 그룹 관리는 P1(FR-17, FE-9)
const ADMIN_MENU: { to: string; label: Key }[] = [
  { to: '/admin/members', label: 'menuMembers' },
  { to: '/admin/groups', label: 'menuGroups' },
  { to: '/admin/chats', label: 'menuChats' },
];

type Props = { onLogout: () => void };

// WF 2.2 앱 셸: 데스크톱 상단 메뉴, 모바일 햄버거 + 왼쪽 서랍(L-13, 768px)
export function Layout({ onLogout }: Props) {
  const t = useT();
  const me = useStore((s) => s.me);
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  // WF-04: 날짜 상세는 ≡ 대신 ← 뒤로. 바로 들어온 경우(기록 없음)는 캘린더로
  const detailDate = pathname.match(/^\/dates\/(\d{4}-\d{2}-\d{2})$/)?.[1];
  const goBack = () => (key === 'default' ? navigate('/') : navigate(-1));
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const menu = me?.role === 'ADMIN' ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU;
  const current = menu.find((item) => item.to === pathname);
  const title = detailDate ? formatMonthDay(detailDate) : current ? t(current.label) : '';
  const close = () => setDrawerOpen(false);

  const links = (items: typeof menu) =>
    items.map((item) => (
      <NavLink key={item.to} to={item.to} end onClick={close}>
        {t(item.label)}
      </NavLink>
    ));

  return (
    <>
      <header className="topbar">
        {detailDate ? (
          <button className="btn icon menu-button" aria-label={t('back')} onClick={goBack}>
            ←
          </button>
        ) : (
          <button
            className="btn icon menu-button"
            aria-label={t('openMenu')}
            onClick={() => setDrawerOpen(true)}
          >
            ≡
          </button>
        )}
        <span className="topbar-title">{title}</span>
        <span className="logo">Badminatics</span>
        <nav className="topbar-menu">{links(menu)}</nav>
        <span className="topbar-right">
          {/* 이 화면은 로그인해야 보이므로 상태는 항상 로그인중 */}
          {me && (
            <span className="login-info" title={me.email}>
              ({me.email}:{t('loggedIn')}:{t(me.role === 'ADMIN' ? 'roleAdmin' : 'roleUser')})
            </span>
          )}
          <LangSelect />
          <button className="btn logout-button" onClick={onLogout}>
            {t('logout')}
          </button>
        </span>
      </header>

      {isDrawerOpen && (
        <div className="overlay" onClick={close}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span>
                {me?.name}
                {me?.role === 'ADMIN' && t('adminSuffix')}
              </span>
              <button className="btn icon" aria-label={t('closeMenu')} onClick={close}>
                ✕
              </button>
            </div>
            <nav className="drawer-section">{links(MEMBER_MENU)}</nav>
            {me?.role === 'ADMIN' && <nav className="drawer-section">{links(ADMIN_MENU)}</nav>}
            <div className="drawer-section">
              <button
                className="drawer-item"
                onClick={() => {
                  close();
                  onLogout();
                }}
              >
                {t('logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="content">
        {detailDate && (
          <button className="btn text back-link desktop-only" onClick={goBack}>
            ← {t('back')}
          </button>
        )}
        <Outlet />
      </main>
    </>
  );
}
