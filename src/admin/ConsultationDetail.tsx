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
  const [draftEdit, setDraftEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    return watchConsultations((rows) => {
      const found = rows.find((r) => r.id === id) ?? null;
      setRow(found);
      if (found) {
        setNotes(found.notes ?? "");
        if (found.draftLetter && draftEdit === "") {
          setDraftEdit(found.draftLetter);
        }
      }
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const saveDraft = async () => {
    setSaving(true);
    try {
      await updateConsultation(row.id, {
        draftLetter: draftEdit,
        draftStatus: "edited",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setSaving(false);
    }
  };

  const approveDraft = async () => {
    if (
      !confirm(
        "이 통보문을 승인합니다. 발송 준비가 완료된 상태로 표시됩니다. 진행하시겠습니까?"
      )
    )
      return;
    setSaving(true);
    try {
      await updateConsultation(row.id, {
        draftLetter: draftEdit,
        draftStatus: "approved",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setSaving(false);
    }
  };

  const markSent = async () => {
    if (
      !confirm(
        "통보문을 회사 측에 발송했음을 표시합니다. 진행하시겠습니까?"
      )
    )
      return;
    setSaving(true);
    try {
      await updateConsultation(row.id, {
        draftStatus: "sent",
        status: "contacted",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setSaving(false);
    }
  };

  const downloadDraft = () => {
    const filename = `tongbo_${row.id.slice(0, 8)}_${
      new Date().toISOString().slice(0, 10)
    }.txt`;
    const blob = new Blob([draftEdit], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  const sendEmail = async () => {
    if (!emailTo.trim()) {
      alert("회사 측 수신 이메일을 입력해 주세요.");
      return;
    }
    if (!confirm(`${emailTo} 로 통보문을 발송합니다. 진행하시겠습니까?`)) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const resp = await fetch("/api/send-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          kind: "draft",
          letterText: draftEdit,
          caseId: row.id,
          clientName: row.userName ?? null,
        }),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        emailId?: string;
        error?: string;
        message?: string;
      };
      if (resp.status === 503) {
        setEmailResult(
          "❌ 이메일 인프라(Resend) 미설정. .txt 다운로드 후 수동 발송하세요."
        );
        return;
      }
      if (!resp.ok || !data.ok) {
        setEmailResult(
          `❌ 발송 실패: ${data.error ?? resp.statusText} ${
            data.message ?? ""
          }`
        );
        return;
      }
      // 성공 시 draftStatus = sent + status = contacted
      await updateConsultation(row.id, {
        draftStatus: "sent",
        status: "contacted",
      });
      setEmailResult(`✓ 발송 완료 · email id: ${data.emailId ?? "—"}`);
    } catch (e) {
      setEmailResult(`❌ ${String(e)}`);
    } finally {
      setEmailSending(false);
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

        {row.draftLetter && (
          <div className="admin-detail-card admin-detail-actions">
            <h3>
              ⚖️ 변호사 명의 통보문 — AI 1차 초안
              <span
                className={`admin-status st-${
                  row.draftStatus === "approved"
                    ? "contracted"
                    : row.draftStatus === "sent"
                    ? "closed"
                    : row.draftStatus === "edited"
                    ? "consulted"
                    : "new"
                }`}
                style={{ marginLeft: 12, fontSize: 11 }}
              >
                {row.draftStatus === "approved"
                  ? "승인됨 (발송 대기)"
                  : row.draftStatus === "sent"
                  ? "발송됨"
                  : row.draftStatus === "edited"
                  ? "수정됨"
                  : "검토 대기"}
              </span>
            </h3>
            {row.conversationLog && (
              <details style={{ marginBottom: 12 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  의뢰인 대화 로그 보기
                </summary>
                <pre
                  className="admin-message"
                  style={{ fontSize: 12, marginTop: 8 }}
                >
                  {row.conversationLog}
                </pre>
              </details>
            )}
            <textarea
              className="admin-textarea"
              value={draftEdit}
              onChange={(e) => setDraftEdit(e.target.value)}
              rows={20}
              style={{ fontFamily: "monospace", fontSize: 13 }}
              placeholder="통보문 초안 — [대괄호] 부분을 채우세요"
            />
            <div className="admin-detail-actions-row" style={{ flexWrap: "wrap" }}>
              <button
                className="btn"
                onClick={() => void saveDraft()}
                disabled={saving || draftEdit === (row.draftLetter ?? "")}
              >
                {saving ? "저장 중..." : "💾 수정 저장"}
              </button>
              <button
                className="btn"
                onClick={downloadDraft}
                style={{ background: "var(--gray-1)" }}
              >
                ⬇ .txt 다운로드
              </button>
              <a
                className="btn"
                href={`/admin/consultations/${row.id}/print`}
                target="_blank"
                rel="noopener"
                style={{ background: "var(--yellow)" }}
              >
                🖨 PDF 인쇄
              </a>
              {row.draftStatus !== "approved" && row.draftStatus !== "sent" && (
                <button
                  className="btn primary"
                  onClick={() => void approveDraft()}
                  disabled={saving}
                  style={{ background: "var(--green)", color: "var(--ink)" }}
                >
                  ✓ 승인 (발송 준비)
                </button>
              )}
              {row.draftStatus === "approved" && (
                <button
                  className="btn primary"
                  onClick={() => void markSent()}
                  disabled={saving}
                  style={{ background: "var(--orange)" }}
                >
                  📤 발송 완료 (수동)
                </button>
              )}
              {savedAt && <span className="admin-saved">✓ {savedAt}</span>}
            </div>

            {row.draftStatus === "approved" && (
              <div className="admin-send-row">
                <h4 style={{ margin: "16px 0 8px", fontSize: 13 }}>
                  📧 회사 측 자동 이메일 발송
                </h4>
                <div className="admin-send-fields">
                  <input
                    className="admin-input"
                    type="email"
                    placeholder="회사 인사담당자 이메일"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn primary"
                    onClick={() => void sendEmail()}
                    disabled={emailSending || !emailTo.trim()}
                    style={{ background: "var(--orange)" }}
                  >
                    {emailSending ? "발송 중..." : "📧 이메일 발송"}
                  </button>
                </div>
                {emailResult && (
                  <p
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      color: emailResult.startsWith("✓")
                        ? "var(--green)"
                        : "var(--orange)",
                      fontWeight: 700,
                    }}
                  >
                    {emailResult}
                  </p>
                )}
              </div>
            )}
            <p
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              ⚠️ 본 초안은 AI가 1차 작성한 것이며, 변호사가 사실관계 확인 및 법적
              검토 후 최종 발송됩니다. 변호사법·변협 윤리장전상 발송 전 변호사
              본인의 검토가 의무입니다.
            </p>
          </div>
        )}

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
