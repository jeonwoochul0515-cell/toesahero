import { useEffect, useMemo, useState, type DragEvent } from "react";
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);

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
        실시간 동기화. <strong>카드를 드래그</strong>해 컬럼 간 이동 가능 (데스크톱).
        모바일은 카드 내 셀렉트로 변경. 카드 제목 클릭 시 상세로 이동.
      </p>

      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={`kanban-column tone-${col.tone} ${
              dragOverCol === col.id ? "drag-over" : ""
            }`}
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              if (dragId) {
                e.preventDefault();
                setDragOverCol(col.id);
              }
            }}
            onDragLeave={() => {
              if (dragOverCol === col.id) setDragOverCol(null);
            }}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId;
              if (id) {
                const current = rows.find((r) => r.id === id);
                if (current && (current.status ?? "new") !== col.id) {
                  void moveStatus(id, col.id);
                }
              }
              setDragId(null);
              setDragOverCol(null);
            }}
          >
            <header className="kanban-header">
              <strong>{col.label}</strong>
              <span className="kanban-count">{grouped[col.id].length}</span>
            </header>
            <div className="kanban-cards">
              {grouped[col.id].length === 0 ? (
                <div className="kanban-empty">없음</div>
              ) : (
                grouped[col.id].map((r) => (
                  <KanbanCard
                    key={r.id}
                    row={r}
                    onMove={moveStatus}
                    onDragStart={(id) => setDragId(id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverCol(null);
                    }}
                    isDragging={dragId === r.id}
                  />
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
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  row: ConsultationDoc;
  onMove: (id: string, status: Status) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const status = (row.status ?? "new") as Status;
  return (
    <div
      className={`kanban-card ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", row.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(row.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-card-row">
        <span className={`admin-tag src-${row.source}`}>{row.source}</span>
        {row.draftLetter && (
          <span className="kanban-card-badge">📝 초안</span>
        )}
        {row.noticeLetter && (
          <span className="kanban-card-badge">📜 내용증명</span>
        )}
        {(row.draftStatus === "approved" ||
          row.noticeStatus === "approved") && (
          <span className="kanban-card-badge approved">✓ 승인</span>
        )}
        {(row.draftStatus === "sent" || row.noticeStatus === "sent") && (
          <span className="kanban-card-badge sent">📤 발송</span>
        )}
        {row.paymentStatus === "paid" && (
          <span className="kanban-card-badge approved">💳 결제</span>
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
