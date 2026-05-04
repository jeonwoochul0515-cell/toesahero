import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";

export function AdminLogin() {
  const { signIn } = useAdminAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from =
    (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signIn(email, password);
      nav(from, { replace: true });
    } catch (e) {
      const msg = (e as Error)?.message ?? "로그인 실패";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1 className="admin-login-title">
          🛡️ 퇴사히어로
          <br />
          <span>어드민 로그인</span>
        </h1>
        <p className="admin-login-sub">
          법률사무소 청송 어드민 전용. 의뢰인 카카오 로그인이 아닙니다.
        </p>
        <form onSubmit={onSubmit}>
          <label className="admin-label">
            이메일
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lawyer@chungsong.law"
            />
          </label>
          <label className="admin-label">
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {err && <div className="admin-err">⚠ {err}</div>}
          <button type="submit" className="btn primary admin-submit" disabled={busy}>
            {busy ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <div className="admin-login-foot">
          <a href="/">← 홈으로</a>
        </div>
      </div>
    </div>
  );
}
