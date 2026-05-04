import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  watchConsultations,
  updateConsultation,
  type ConsultationDoc,
} from "../firebase";

const STATUS_OPTIONS: Array<{ value: NonNullable<ConsultationDoc["status"]>; label: string }> = [
  { value: "new", label: "신규" },
  { value: "contacted", label: "연락 완료" },
  { value: "consulted", label: "상담 완료" },
  { value: "contracted", label: "위임 체결" },
  { value: "closed", label: "종료" },
];

function fmtDate(ts: ConsultationDoc["createdAt"]): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { hour12: false });
}

export function ConsultationDetail() {
  const { id } = useParams();
  const [row, setRow] = useState<ConsultationDoc | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    return watchConsultations((rows) => {
      const found = rows.find((r) => r.id === id) ?? null;
      setRow(found);
      if (found) setNotes(found.notes ?? "");
    }, 500);
  }, [id]);

  if (!row) {
    return (
      <div className="admin-dash">
        <Link to="/admin/consultations" className="admin-link">
          ← 상담 요청 목록
        </Link>
        <p style={{ marginTop: 24 }}>로드 중... (없는 ID 일 수도 있음)</p>
      </div>
    );
  }

  const updateStatus = async (s: NonNullable<ConsultationDoc["status"]>) => {
    setSaving(true);
    try {
      await updateConsultation(row.id, { status: s });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await updateConsultation(row.id, { notes });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-dash">
      <Link to="/admin/consultations" className="admin-link">
        ← 상담 요청 목록
      </Link>
      <h1 className="admin-h1" style={{ marginTop: 12 }}>
        상담 #{row.id.slice(0, 8)}
      </h1>

      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <h3>요청 정보</h3>
          <DList
            items={[
              ["일시", fmtDate(row.createdAt)],
              ["경로", row.source],
              ["의뢰인", row.userName ?? "익명"],
              ["이메일", row.userEmail ?? "—"],
              ["UID", row.uid ?? "익명"],
              ["연락처", row.contact ?? "—"],
              ["페이지", row.path ?? "—"],
            ]}
          />
        </div>

        <div className="admin-detail-card">
          <h3>메시지</h3>
          <pre className="admin-message">
            {row.message ?? "(메시지 없음)"}
          </pre>
          {row.pickedItems && row.pickedItems.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>선택 항목</h4>
              <div className="admin-picks">
                {row.pickedItems.map((p, i) => (
                  <span key={i} className="admin-pick">
                    {p}
                  </span>
                ))}
              </div>
            </>
          )}
          {typeof row.estimatedAmount === "number" && (
            <>
              <h4 style={{ marginTop: 16 }}>참고 합산액</h4>
              <div className="admin-amount">
                {row.estimatedAmount.toLocaleString("ko-KR")}원
              </div>
            </>
          )}
        </div>

        <div className="admin-detail-card admin-detail-actions">
          <h3>상태 변경</h3>
          <div className="admin-status-buttons">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={saving || (row.status ?? "new") === opt.value}
                onClick={() => void updateStatus(opt.value)}
                className={`admin-status-btn ${
                  (row.status ?? "new") === opt.value ? "current" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>변호사 메모</h3>
          <textarea
            className="admin-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="내부 메모 (의뢰인에게 노출되지 않음)"
            rows={6}
          />
          <div className="admin-detail-actions-row">
            <button
              className="btn primary"
              onClick={() => void saveNotes()}
              disabled={saving}
            >
              {saving ? "저장 중..." : "메모 저장"}
            </button>
            {savedAt && <span className="admin-saved">✓ {savedAt}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="admin-dl">
      {items.map(([k, v]) => (
        <div key={k} className="admin-dl-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
