// 결제 주문(orders) 목록을 보여주는 어드민 화면 — 상담 미연결(noref) 결제까지 확인용
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { watchOrders, type OrderDoc } from "../firebase";

const STATUS_LABEL: Record<string, string> = {
  ready: "대기",
  paid: "결제완료",
  canceled: "취소",
  failed: "실패",
};

const PACKAGE_LABEL: Record<string, string> = {
  basic: "기본 절차",
  pro: "표준",
  max: "분쟁 대응",
};

function fmtDate(ts: OrderDoc["createdAt"]): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("ko-KR", { hour12: false });
}

function won(n?: number): string {
  return typeof n === "number" ? n.toLocaleString("ko-KR") + "원" : "—";
}

export function OrdersAdmin() {
  const [rows, setRows] = useState<OrderDoc[]>([]);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => watchOrders(setRows, 300), []);

  const filtered = useMemo(
    () => rows.filter((r) => status === "all" || (r.status ?? "ready") === status),
    [rows, status]
  );

  const paidTotal = useMemo(
    () =>
      rows
        .filter((r) => r.status === "paid")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [rows]
  );

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">결제 주문</h1>

      <div className="admin-filters">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="admin-input"
        >
          <option value="all">전체 상태</option>
          <option value="paid">결제완료</option>
          <option value="ready">대기</option>
          <option value="canceled">취소</option>
          <option value="failed">실패</option>
        </select>
        <span className="admin-count">{filtered.length}건</span>
        <span className="admin-count" style={{ marginLeft: "auto" }}>
          결제완료 합계 {won(paidTotal)}
        </span>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 150 }}>일시</th>
            <th style={{ width: 100 }}>패키지</th>
            <th style={{ width: 120 }}>금액</th>
            <th style={{ width: 100 }}>상태</th>
            <th>연결 상담</th>
            <th style={{ width: 160 }}>주문번호</th>
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
                <td>{PACKAGE_LABEL[r.packageId ?? ""] ?? r.packageId ?? "—"}</td>
                <td>{won(r.amount)}</td>
                <td>
                  <span className={`admin-status st-${r.status === "paid" ? "contracted" : r.status === "canceled" || r.status === "failed" ? "closed" : "new"}`}>
                    {STATUS_LABEL[r.status ?? "ready"]}
                  </span>
                </td>
                <td className="admin-msg-cell">
                  {r.caseId ? (
                    <Link to={`/admin/consultations/${r.caseId}`}>
                      #{r.caseId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="admin-anon">상담 미연결</span>
                  )}
                </td>
                <td>
                  <code className="admin-uid">{r.id}</code>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
