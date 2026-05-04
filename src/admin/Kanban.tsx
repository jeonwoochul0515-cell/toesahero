import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  watchConsultations,
  updateConsultation,
  type ConsultationDoc,
} from "../firebase";

type Status = NonNullable<ConsultationDoc["status"]>;

const COLUMNS: Array<{ id: Status; label: string; tone: string }> = [
  { id: "new", label: "신규", tone: "orange" },
  { id: "contacted", label: "연락 완료", tone: "yellow" },
  { id: "consulted", label: "상담 완료", tone: "mint" },
  { id: "contracted", label: "위임 체결", tone: "green" },
  { id: "closed", label: "종료", tone: "gray" },
];

function fmtDate(ts: ConsultationDoc["createdAt"]): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "방금";
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export function Kanban() {
  const [rows, setRows] = useState<ConsultationDoc[]>([]);

  useEffect(() => watchConsultations(setRows, 300), []);

  const grouped = useMemo(() => {
    const out: Record<Status, ConsultationDoc[]> = {
      new: [],
      contacted: [],
      consulted: [],
      contracted: [],
      closed: [],
    };
    for (const r of rows) {
      const s = (r.status ?? "new") as Status;
      if (out[s]) out[s].push(r);
    }
    return out;
  }, [rows]);

  const moveStatus = async (id: string, status: Status) => {
    try {
      await updateConsultation(id, { status });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">사건 추적 칸반</h1>
      <p className="admin-sub">
        실시간 동기화. 카드의 셀렉트로 상태 변경 가능. 카드 클릭 시 상세로 이동.
      </p>

      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <div key={col.id} className={`kanban-column tone-${col.tone}`}>
            <header className="kanban-header">
              <strong>{col.label}</strong>
              <span className="kanban-count">{grouped[col.id].length}</span>
            </header>
            <div className="kanban-cards">
              {grouped[col.id].length === 0 ? (
                <div className="kanban-empty">없음</div>
              ) : (
                grouped[col.id].map((r) => (
                  <KanbanCard key={r.id} row={r} onMove={moveStatus} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  row,
  onMove,
}: {
  row: ConsultationDoc;
  onMove: (id: string, status: Status) => void;
}) {
  const status = (row.status ?? "new") as Status;
  return (
    <div className="kanban-card">
      <div className="kanban-card-row">
        <span className={`admin-tag src-${row.source}`}>{row.source}</span>
        {row.draftLetter && (
          <span className="kanban-card-badge">📝 초안</span>
        )}
        {row.draftStatus === "approved" && (
          <span className="kanban-card-badge approved">✓ 승인</span>
        )}
        {row.draftStatus === "sent" && (
          <span className="kanban-card-badge sent">📤 발송</span>
        )}
      </div>
      <Link
        to={`/admin/consultations/${row.id}`}
        className="kanban-card-name"
      >
        {row.userName ?? <em className="admin-anon">익명</em>}
      </Link>
      <div className="kanban-card-msg">
        {(row.message ?? "(메시지 없음)").slice(0, 80)}
        {(row.message?.length ?? 0) > 80 ? "…" : ""}
      </div>
      <div className="kanban-card-foot">
        <select
          className="kanban-card-select"
          value={status}
          onChange={(e) => onMove(row.id, e.target.value as Status)}
        >
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <time>{fmtDate(row.createdAt)}</time>
      </div>
    </div>
  );
}
