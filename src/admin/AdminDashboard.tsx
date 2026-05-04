import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { watchConsultations, type ConsultationDoc } from "../firebase";

const STATUS_LABEL: Record<string, string> = {
  new: "신규",
  contacted: "연락 완료",
  consulted: "상담 완료",
  contracted: "위임 체결",
  closed: "종료",
};

function fmtDate(ts: ConsultationDoc["createdAt"]): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { hour12: false });
}

export function AdminDashboard() {
  const [rows, setRows] = useState<ConsultationDoc[]>([]);

  useEffect(() => watchConsultations(setRows, 200), []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySec = today.getTime() / 1000;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSec = weekAgo.getTime() / 1000;

    let todayN = 0;
    let weekN = 0;
    let newN = 0;
    let pendingN = 0;
    const bySource: Record<string, number> = {};
    for (const r of rows) {
      const s = r.createdAt?.seconds ?? 0;
      if (s >= todaySec) todayN++;
      if (s >= weekSec) weekN++;
      if (!r.status || r.status === "new") newN++;
      if (r.status === "contacted" || r.status === "consulted") pendingN++;
      bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    }
    return { total: rows.length, todayN, weekN, newN, pendingN, bySource };
  }, [rows]);

  const recent = rows.slice(0, 8);

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">대시보드</h1>

      <div className="admin-stats">
        <Stat label="전체 상담 요청" value={stats.total} />
        <Stat label="이번 주" value={stats.weekN} />
        <Stat label="오늘" value={stats.todayN} accent="yellow" />
        <Stat label="신규 (미처리)" value={stats.newN} accent="orange" />
        <Stat label="진행 중" value={stats.pendingN} />
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2>최근 상담 요청</h2>
          <Link to="/admin/consultations" className="admin-link">
            전체 보기 →
          </Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>일시</th>
              <th>경로</th>
              <th>의뢰인</th>
              <th>메시지</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  아직 상담 요청이 없습니다.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td>
                    <span className={`admin-tag src-${r.source}`}>
                      {r.source}
                    </span>
                  </td>
                  <td>{r.userName ?? "익명"}</td>
                  <td className="admin-msg-cell">
                    <Link to={`/admin/consultations/${r.id}`}>
                      {r.message ?? "(메시지 없음)"}
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-status st-${r.status ?? "new"}`}>
                      {STATUS_LABEL[r.status ?? "new"]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "yellow" | "orange";
}) {
  return (
    <div className={`admin-stat ${accent ? `accent-${accent}` : ""}`}>
      <div className="admin-stat-num">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}
