import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Toast } from './components/Toast';
import { ChatArchivesPage } from './features/admin/ChatArchivesPage';
import { GroupsPage } from './features/admin/GroupsPage';
import { MembersPage } from './features/admin/MembersPage';
import { AttendancePage } from './features/attendance/AttendancePage';
import { useLogout } from './features/auth/api';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { DateDetailPage } from './features/dates/DateDetailPage';
import { MePage } from './features/me/MePage';
import { api, refresh } from './lib/client';
import { useStore } from './store';
import type { Me } from './types';

// R-1: 로그인하지 않았으면 SCR-01로
function RequireAuth() {
  const me = useStore((s) => s.me);
  const logout = useLogout();
  if (!me) return <Navigate to="/login" replace />;
  return <Layout onLogout={() => logout.mutate()} />;
}

// R-8: 관리자 화면은 ADMIN만. 화면 가드는 편의이고 판단은 서버가 한다(P-5)
function RequireAdmin() {
  const me = useStore((s) => s.me);
  return me?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
}

function GuestOnly() {
  const me = useStore((s) => s.me);
  return me ? <Navigate to="/" replace /> : <Outlet />;
}

// 6.1 흐름 6: 새로고침하면 메모리의 토큰이 사라지므로 Refresh 쿠키로 되살린다
async function restoreLogin() {
  if (!(await refresh())) return;
  try {
    useStore.getState().setMe(await api<Me>('/me'));
  } catch (error) {
    if (import.meta.env.DEV) console.error(error);
    useStore.getState().clearAuth();
  }
}

export default function App() {
  const [isRestoring, setRestoring] = useState(true);

  useEffect(() => {
    restoreLogin().finally(() => setRestoring(false));
  }, []);

  // WF 2.4: 복원 중에는 로고만. 로그인 화면을 잠깐도 보여 주지 않는다
  if (isRestoring) return <div className="splash">cal-todo</div>;

  return (
    <>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/dates/:date" element={<DateDetailPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/me" element={<MePage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/members" element={<MembersPage />} />
            <Route path="/admin/groups" element={<GroupsPage />} />
            <Route path="/admin/chats" element={<ChatArchivesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  );
}
