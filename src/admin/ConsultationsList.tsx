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

export function ConsultationsList() {
  const [rows, setRows] = useState<ConsultationDoc[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => watchConsultations(setRows, 500), []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "all" && (r.status ?? "new") !== status) return false;
      if (!keyword.trim()) return true;
      const k = keyword.toLowerCase();
      return [
        r.message,
        r.userName,
        r.userEmail,
        r.contact,
        ...(r.pickedItems ?? []),
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(k));
    });
  }, [rows, keyword, status]);

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">상담 요청</h1>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="이름, 이메일, 메시지 검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="admin-input"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="admin-input"
        >
          <option value="all">전체 상태</option>
          <option value="new">신규</option>
          <option value="contacted">연락 완료</option>
          <option value="consulted">상담 완료</option>
          <option value="contracted">위임 체결</option>
          <option value="closed">종료</option>
        </select>
        <span className="admin-count">{filtered.length}건</span>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 150 }}>일시</th>
            <th style={{ width: 80 }}>경로</th>
            <th style={{ width: 130 }}>의뢰인</th>
            <th>메시지</th>
            <th style={{ width: 130 }}>예상 청구액</th>
            <th style={{ width: 100 }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="admin-empty">
                결과가 없습니다.
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.createdAt)}</td>
                <td>
                  <span className={`admin-tag src-${r.source}`}>{r.source}</span>
                </td>
                <td>
                  {r.userName ?? <span className="admin-anon">익명</span>}
                  {r.userEmail && (
                    <div className="admin-email">{r.userEmail}</div>
                  )}
                </td>
                <td className="admin-msg-cell">
                  <Link to={`/admin/consultations/${r.id}`}>
                    {r.message ?? "(메시지 없음)"}
                  </Link>
                  {r.pickedItems && r.pickedItems.length > 0 && (
                    <div className="admin-picks">
                      {r.pickedItems.map((p, i) => (
                        <span key={i} className="admin-pick">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  {typeof r.estimatedAmount === "number"
                    ? r.estimatedAmount.toLocaleString("ko-KR") + "원"
                    : "—"}
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
    </div>
  );
}
