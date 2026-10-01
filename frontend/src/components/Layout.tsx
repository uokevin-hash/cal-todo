import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { formatMonthDay } from '../lib/date';
import { useStore } from '../store';

const MEMBER_MENU = [
  { to: '/', label: '캘린더' },
  { to: '/attendance', label: '참석 현황' },
  { to: '/me', label: '내 정보' },
];
// R-8: 관리자에게만. 그룹 관리는 P1(FR-17, FE-9)
const ADMIN_MENU = [
  { to: '/admin/members', label: '회원 관리' },
  { to: '/admin/groups', label: '그룹 관리' },
  { to: '/admin/chats', label: '채팅 보관함' },
];

type Props = { onLogout: () => void };

// WF 2.2 앱 셸: 데스크톱 상단 메뉴, 모바일 햄버거 + 왼쪽 서랍(L-13, 768px)
export function Layout({ onLogout }: Props) {
  const me = useStore((s) => s.me);
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  // WF-04: 날짜 상세는 ≡ 대신 ← 뒤로. 바로 들어온 경우(기록 없음)는 캘린더로
  const detailDate = pathname.match(/^\/dates\/(\d{4}-\d{2}-\d{2})$/)?.[1];
  const goBack = () => (key === 'default' ? navigate('/') : navigate(-1));
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const menu = me?.role === 'ADMIN' ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU;
  const title = detailDate
    ? formatMonthDay(detailDate)
    : (menu.find((item) => item.to === pathname)?.label ?? '');
  const close = () => setDrawerOpen(false);

  const links = (items: typeof menu) =>
    items.map((item) => (
      <NavLink key={item.to} to={item.to} end onClick={close}>
        {item.label}
      </NavLink>
    ));

  return (
    <>
      <header className="topbar">
        {detailDate ? (
          <button className="btn icon menu-button" aria-label="뒤로" onClick={goBack}>
            ←
          </button>
        ) : (
          <button
            className="btn icon menu-button"
            aria-label="메뉴 열기"
            onClick={() => setDrawerOpen(true)}
          >
            ≡
          </button>
        )}
        <span className="topbar-title">{title}</span>
        <span className="logo">cal-todo</span>
        <nav className="topbar-menu">{links(menu)}</nav>
        <button className="btn logout-button" onClick={onLogout}>
          로그아웃
        </button>
      </header>

      {isDrawerOpen && (
        <div className="overlay" onClick={close}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span>
                {me?.name}
                {me?.role === 'ADMIN' && ' (관리자)'}
              </span>
              <button className="btn icon" aria-label="메뉴 닫기" onClick={close}>
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
                로그아웃
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="content">
        {detailDate && (
          <button className="btn text back-link desktop-only" onClick={goBack}>
            ← 뒤로
          </button>
        )}
        <Outlet />
      </main>
    </>
  );
}
