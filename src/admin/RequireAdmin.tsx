import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import type { ReactNode } from "react";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAdminAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="admin-loading">
        <span>인증 확인 중...</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: loc }} replace />;
  }

  return <>{children}</>;
}
