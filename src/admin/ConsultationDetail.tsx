import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  watchConsultation,
  fetchConsultationsBySession,
  updateConsultation,
  fetchChatMessagesBySession,
  watchCaseFiles,
  type ConsultationDoc,
  type ChatMessageDoc,
  type CaseFileDoc,
  getIdToken,
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
  const [notFound, setNotFound] = useState(false);
  // 같은 대화에서 앞서 저장된 상태·메모 (대표 문서가 바뀌어도 안 사라지게 승계해 보여 준다)
  const [inherited, setInherited] = useState<{
    status?: ConsultationDoc["status"];
    notes?: string;
  }>({});
  const [notes, setNotes] = useState("");
  const [draftEdit, setDraftEdit] = useState("");
  const [noticeEdit, setNoticeEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [chatThread, setChatThread] = useState<ChatMessageDoc[]>([]);
  const [caseFiles, setCaseFiles] = useState<CaseFileDoc[]>([]);

  const sessionId = row?.sessionId ?? null;

  useEffect(() => {
    // 사건(id)이 바뀌면 이전 사건의 편집 내용부터 비운다 — 남겨두면 A 사건의
    // 문서가 B 사건 화면에 그대로 보이고 저장까지 될 수 있다.
    setRow(null);
    setNotFound(false);
    setInherited({});
    setNotes("");
    setDraftEdit("");
    setNoticeEdit("");
    if (!id) return;
    let seeded = false;
    return watchConsultation(id, (found) => {
      setRow(found);
      setNotFound(found === null);
      if (!found) return;
      // 메모는 첫 스냅샷에서 한 번만 시딩 — 이후 스냅샷이 수정 중인 내용을 덮지 않게.
      if (!seeded) {
        seeded = true;
        setNotes(found.notes ?? "");
      }
      // 문서는 "아직 비어 있을 때만" 채운다(늦게 생성되는 경우 대비). functional
      // updater라 스냅샷이 다시 와도 수정 중인 내용은 보존된다.
      if (found.draftLetter) {
        setDraftEdit((prev) => (prev === "" ? found.draftLetter ?? "" : prev));
      }
      if (found.noticeLetter) {
        setNoticeEdit((prev) => (prev === "" ? found.noticeLetter ?? "" : prev));
      }
    });
  }, [id]);

  // 같은 대화에 앞서 만들어진 접수 문서에서 상태·메모를 승계한다(2026-09-13).
  // 손님이 대화를 이어가면 새 접수 문서가 생기고 목록은 그 문서로 링크한다. 승계하지 않으면
  // 어제 바꿔 둔 상태와 적어 둔 메모가 이 화면에서 사라진 것처럼 보인다.
  useEffect(() => {
    if (!sessionId || !row) return;
    if (row.status !== undefined && row.notes !== undefined) return;
    let cancel = false;
    void fetchConsultationsBySession(sessionId).then((siblings) => {
      if (cancel) return;
      const older = siblings.filter((s) => s.id !== row.id);
      const status =
        row.status ?? older.find((s) => s.status !== undefined)?.status;
      const notes = row.notes ?? older.find((s) => s.notes !== undefined)?.notes;
      setInherited({ status, notes });
      if (row.notes === undefined && notes !== undefined) {
        setNotes((prev) => (prev === "" ? notes : prev));
      }
    });
    return () => {
      cancel = true;
    };
  }, [sessionId, row]);

  // 같은 대화(sessionId)에 속한 채팅 메시지 전체를 불러와 시간순으로 표시.
  useEffect(() => {
    if (!sessionId) {
      setChatThread([]);
      return;
    }
    let cancel = false;
    void fetchChatMessagesBySession(sessionId).then((msgs) => {
      if (!cancel) setChatThread(msgs);
    });
    return () => {
      cancel = true;
    };
  }, [sessionId]);

  // 이 사건에 의뢰인이 올린 증거 파일.
  useEffect(() => {
    if (!id) return;
    return watchCaseFiles(id, setCaseFiles);
  }, [id]);

  // 이 문서에 상태가 저장돼 있으면 그 값, 없으면 같은 대화에서 승계한 값, 둘 다 없으면 신규.
  const currentStatus = row?.status ?? inherited.status ?? "new";

  if (!row) {
    return (
      <div className="admin-dash">
        <Link to="/admin/consultations" className="admin-link">
          ← 상담 요청 목록
        </Link>
        <p style={{ marginTop: 24 }}>
          {notFound
            ? "이 사건을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었습니다."
            : "불러오는 중..."}
        </p>
      </div>
    );
  }

  const updateStatus = async (s: NonNullable<ConsultationDoc["status"]>) => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateConsultation(row.id, { status: s });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateConsultation(row.id, { notes });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateConsultation(row.id, {
        draftLetter: draftEdit,
        draftStatus: "edited",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
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
    setSaveError(null);
    try {
      await updateConsultation(row.id, {
        draftLetter: draftEdit,
        draftStatus: "approved",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
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
    setSaveError(null);
    try {
      await updateConsultation(row.id, {
        draftStatus: "sent",
        status: "contacted",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
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

  const saveNotice = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateConsultation(row.id, {
        noticeLetter: noticeEdit,
        noticeStatus: "edited",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const approveNotice = async () => {
    if (
      !confirm(
        "이 내용증명을 승인합니다. 발송 준비가 완료된 상태로 표시됩니다. 진행하시겠습니까?"
      )
    )
      return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateConsultation(row.id, {
        noticeLetter: noticeEdit,
        noticeStatus: "approved",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const markNoticeSent = async () => {
    if (!confirm("내용증명을 발송했음을 표시합니다. 진행하시겠습니까?")) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateConsultation(row.id, {
        noticeStatus: "sent",
        status: "contacted",
      });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      console.warn("[admin] 저장 실패", e);
      setSaveError("저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const downloadNotice = () => {
    const filename = `naeyongjeungmyeong_${row.id.slice(0, 8)}_${
      new Date().toISOString().slice(0, 10)
    }.txt`;
    const blob = new Blob([noticeEdit], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendEmail = async () => {
    if (!emailTo.trim()) {
      alert("회사 측 수신 이메일을 입력해 주세요.");
      return;
    }
    if (!confirm(`${emailTo} 로 통보문을 발송합니다. 진행하시겠습니까?`)) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      // 승인은 저장본에 남는데 발송은 화면 상태를 보냈다. 승인 뒤 글을 고쳐도 상태는
      // "승인됨" 그대로라 검토를 통과하지 않은 문장이 사무소 명의로 나갈 수 있었다
      // (2026-09-12 점검 03-2). 저장본과 다르면 발송을 막는다.
      if (draftEdit !== (row.draftLetter ?? "")) {
        setSaveError(
          "화면의 글이 저장·승인된 글과 다릅니다. 먼저 저장하고 승인한 뒤 발송해 주세요."
        );
        setSaving(false);
        return;
      }
      const resp = await fetch("/api/send-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          kind: "draft",
          letterText: row.draftLetter ?? "",
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
        {row.damageThreat && (
          <span
            className="admin-status st-new"
            style={{ marginLeft: 12, fontSize: 12, verticalAlign: "middle" }}
            title="회사의 손해배상·위약금 협박이 감지된 건"
          >
            ⚠️ 손배 위협
          </span>
        )}
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

        {(row.meta as { docType?: string } | undefined)?.docType ===
          "delegation" && (
          <div className="admin-detail-card">
            <h3>전자서명 위임장</h3>
            {(() => {
              const m = row.meta as {
                birth?: string;
                address?: string;
                signaturePng?: string;
                signedAt?: string;
              };
              return (
                <>
                  <DList
                    items={[
                      ["생년월일", m.birth ?? "—"],
                      ["주소", m.address ?? "—"],
                      [
                        "제출일시",
                        m.signedAt
                          ? new Date(m.signedAt).toLocaleString("ko-KR", {
                              hour12: false,
                            })
                          : "—",
                      ],
                    ]}
                  />
                  {m.signaturePng && (
                    <img
                      src={m.signaturePng}
                      alt="위임인 전자서명"
                      style={{
                        width: 220,
                        border: "1px solid var(--line, #ddd)",
                        borderRadius: 8,
                        background: "#fff",
                        margin: "10px 0",
                        display: "block",
                      }}
                    />
                  )}
                  <a
                    href={`/admin/consultations/${row.id}/delegation-print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary"
                    style={{ fontSize: 13 }}
                  >
                    🖨 위임장 인쇄 / PDF 저장
                  </a>
                </>
              );
            })()}
          </div>
        )}

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

        {sessionId && chatThread.length > 0 && (
          <div className="admin-detail-card">
            <h3>💬 대화 전체 ({chatThread.length}개 메시지)</h3>
            <div className="admin-chat-thread">
              {chatThread.map((m) => (
                <div
                  key={m.id}
                  className={`admin-chat-bubble ${
                    m.role === "me" ? "from-client" : "from-bot"
                  }`}
                >
                  <div className="admin-chat-bubble-head">
                    <strong>{m.role === "me" ? "의뢰인" : "변호사/봇"}</strong>
                    <time>{fmtDate(m.createdAt)}</time>
                  </div>
                  <pre className="admin-chat-bubble-text">{m.text}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {caseFiles.length > 0 && (
          <div className="admin-detail-card">
            <h3>📎 의뢰인 증거 자료 ({caseFiles.length})</h3>
            <ul className="admin-file-list">
              {caseFiles.map((f) => (
                <li key={f.id}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    📄 {f.name}
                  </a>
                  {typeof f.size === "number" && (
                    <span className="admin-file-size">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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
              {savedAt && !saveError && <span className="admin-saved">✓ {savedAt}</span>}
              {saveError && <span className="admin-save-error">⚠ {saveError}</span>}
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

        {row.noticeLetter && (
          <div className="admin-detail-card admin-detail-actions">
            <h3>
              📜 내용증명 (표준) — AI 1차 초안
              <span
                className={`admin-status st-${
                  row.noticeStatus === "approved"
                    ? "contracted"
                    : row.noticeStatus === "sent"
                    ? "closed"
                    : row.noticeStatus === "edited"
                    ? "consulted"
                    : "new"
                }`}
                style={{ marginLeft: 12, fontSize: 11 }}
              >
                {row.noticeStatus === "approved"
                  ? "승인됨 (발송 대기)"
                  : row.noticeStatus === "sent"
                  ? "발송됨"
                  : row.noticeStatus === "edited"
                  ? "수정됨"
                  : "검토 대기"}
              </span>
            </h3>
            {typeof row.meta?.factSummary === "string" && (
              <details style={{ marginBottom: 12 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  의뢰인 계산기 입력 요약 보기
                </summary>
                <pre
                  className="admin-message"
                  style={{ fontSize: 12, marginTop: 8 }}
                >
                  {row.meta.factSummary}
                </pre>
              </details>
            )}
            <textarea
              className="admin-textarea"
              value={noticeEdit}
              onChange={(e) => setNoticeEdit(e.target.value)}
              rows={20}
              style={{ fontFamily: "monospace", fontSize: 13 }}
              placeholder="내용증명 초안 — [대괄호] 부분을 채우세요"
            />
            <div className="admin-detail-actions-row" style={{ flexWrap: "wrap" }}>
              <button
                className="btn"
                onClick={() => void saveNotice()}
                disabled={saving || noticeEdit === (row.noticeLetter ?? "")}
              >
                {saving ? "저장 중..." : "💾 수정 저장"}
              </button>
              <button
                className="btn"
                onClick={downloadNotice}
                style={{ background: "var(--gray-1)" }}
              >
                ⬇ .txt 다운로드
              </button>
              {row.noticeStatus !== "approved" && row.noticeStatus !== "sent" && (
                <button
                  className="btn primary"
                  onClick={() => void approveNotice()}
                  disabled={saving}
                  style={{ background: "var(--green)", color: "var(--ink)" }}
                >
                  ✓ 승인 (발송 준비)
                </button>
              )}
              {row.noticeStatus === "approved" && (
                <button
                  className="btn primary"
                  onClick={() => void markNoticeSent()}
                  disabled={saving}
                  style={{ background: "var(--orange)" }}
                >
                  📤 발송 완료 (수동)
                </button>
              )}
              {savedAt && !saveError && <span className="admin-saved">✓ {savedAt}</span>}
              {saveError && <span className="admin-save-error">⚠ {saveError}</span>}
            </div>
            <p
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              ⚠️ 본 초안은 AI가 1차 작성한 것이며, 변호사가 사실관계 확인 및 법적
              검토 후 최종 발송됩니다. 내용증명 발송은 우체국 e그린 또는 서면으로
              진행하세요.
            </p>
          </div>
        )}

        <div className="admin-detail-card admin-detail-actions">
          <h3>상태 변경</h3>
          <div className="admin-status-buttons">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={saving || currentStatus === opt.value}
                onClick={() => void updateStatus(opt.value)}
                className={`admin-status-btn ${
                  currentStatus === opt.value ? "current" : ""
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
            {savedAt && !saveError && <span className="admin-saved">✓ {savedAt}</span>}
              {saveError && <span className="admin-save-error">⚠ {saveError}</span>}
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
