import { Link, NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";

export function AdminLayout() {
  const { user, signOut } = useAdminAuth();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link to="/admin" className="admin-brand">
          🛡️ 퇴사히어로 어드민
        </Link>
        <nav className="admin-nav">
          <NavLink to="/admin" end>
            대시보드
          </NavLink>
          <NavLink to="/admin/kanban">칸반</NavLink>
          <NavLink to="/admin/consultations">상담 요청</NavLink>
          <NavLink to="/admin/reviews">후기 관리</NavLink>
          <NavLink to="/admin/chats">채팅 로그</NavLink>
        </nav>
        <div className="admin-user">
          <span>{user?.email ?? user?.displayName ?? "어드민"}</span>
          <button className="admin-out" onClick={() => void signOut()}>
            로그아웃
          </button>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
