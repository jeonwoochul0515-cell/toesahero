import { useEffect, useState, type FormEvent } from "react";
import {
  watchReviewsAdmin,
  createReview,
  updateReview,
  deleteReview,
  type ReviewDoc,
} from "../firebase";

const STATUS_LABEL: Record<ReviewDoc["status"], string> = {
  pending: "검토 대기",
  approved: "게재 중",
  rejected: "반려",
};

export function ReviewsAdmin() {
  const [rows, setRows] = useState<ReviewDoc[]>([]);
  const [filter, setFilter] = useState<ReviewDoc["status"] | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  // 조회 실패와 "후기 0건"을 화면에서 구분한다 — 예전엔 둘 다 "후기가 없습니다"로 보였다
  const [loadError, setLoadError] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [bg, setBg] = useState<NonNullable<ReviewDoc["bg"]>>("paper");
  const [consentNote, setConsentNote] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(
    () =>
      watchReviewsAdmin(
        (rows) => {
          setLoadError(null);
          setRows(rows);
        },
        200,
        setLoadError
      ),
    []
  );

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setCreating(true);
    try {
      await createReview({ title, body, tag, bg, consentNote });
      setTitle("");
      setBody("");
      setTag("");
      setBg("paper");
      setConsentNote("");
    } catch (e) {
      // 실패가 조용히 삼켜져 등록된 줄 착각하는 사고 방지 (2026-08-20 실제 발생)
      alert(`후기 저장에 실패했습니다. 어드민 로그인 상태를 확인해 주세요.\n${String(e)}`);
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id: string, status: ReviewDoc["status"]) => {
    setBusy(id);
    try {
      await updateReview(id, { status });
    } finally {
      setBusy(null);
    }
  };

  const toggleDisplay = async (id: string, display: boolean) => {
    setBusy(id);
    try {
      await updateReview(id, { display });
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("이 후기를 영구 삭제합니다. 진행하시겠습니까?")) return;
    setBusy(id);
    try {
      await deleteReview(id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">후기 관리</h1>
      <p className="admin-sub">
        변협 광고규정 준수 — (a) 의뢰인 동의 (b) 결과·금액 언급 X (c) 별점 X.
        승인 + 게재 ON 인 후기만 사이트에 표시됩니다.
      </p>

      <form className="review-form" onSubmit={onCreate}>
        <label>
          제목 (한 줄 따옴표 표현)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='예: "절차가 깔끔했어요"'
            required
          />
        </label>
        <label>
          태그 (연령 · 직군 등)
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="예: 30대 · 직장인"
          />
        </label>
        <label className="full">
          본문 (결과·금액 언급 금지)
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="예: 변호사님이 절차를 차근차근 안내해주셔서 마음이 놓였어요. 감사합니다."
            rows={3}
            required
          />
        </label>
        <label>
          배경색
          <select
            value={bg}
            onChange={(e) =>
              setBg(e.target.value as NonNullable<ReviewDoc["bg"]>)
            }
          >
            <option value="paper">흰색</option>
            <option value="yellow">노랑</option>
            <option value="orange">주황</option>
          </select>
        </label>
        <label>
          동의서 메모 (내부 보관 위치 등)
          <input
            value={consentNote}
            onChange={(e) => setConsentNote(e.target.value)}
            placeholder='예: "2026-05 #034 사건 동의서"'
          />
        </label>
        <div className="review-form-foot">
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            ※ 추가 후 검토 대기 상태로 저장. 승인 + 게재 ON 시 사이트에 노출.
          </span>
          <button
            type="submit"
            className="btn primary"
            disabled={creating}
          >
            {creating ? "저장 중..." : "후기 추가"}
          </button>
        </div>
      </form>

      <div className="admin-filters">
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as ReviewDoc["status"] | "all")
          }
          className="admin-input"
        >
          <option value="all">전체</option>
          <option value="pending">검토 대기</option>
          <option value="approved">게재 중</option>
          <option value="rejected">반려</option>
        </select>
        <span className="admin-count">{filtered.length}건</span>
      </div>

      <div className="reviews-admin-grid">
        {loadError ? (
          <p className="admin-empty admin-error">
            후기를 불러오지 못했습니다 — 목록이 비어 보이는 것은 후기가 없어서가
            아닙니다.
            <br />
            <code>{loadError}</code>
            <br />
            로그인 상태와 Firestore 권한 규칙을 확인해 주세요.
          </p>
        ) : filtered.length === 0 ? (
          <p className="admin-empty">후기가 없습니다.</p>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className={`review-admin-card status-${r.status}`}
            >
              <div className="review-admin-head">
                <h3 className="review-admin-title">"{r.title}"</h3>
                <span className={`admin-status st-${
                  r.status === "approved"
                    ? "contracted"
                    : r.status === "rejected"
                    ? "closed"
                    : "new"
                }`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="review-admin-body">{r.body}</p>
              <div className="review-admin-tag">— {r.tag || "(태그 없음)"}</div>
              {r.consentNote && (
                <div className="review-admin-consent">
                  📋 {r.consentNote}
                </div>
              )}
              <div className="review-admin-actions">
                {r.status !== "approved" && (
                  <button
                    className="primary"
                    onClick={() => void setStatus(r.id, "approved")}
                    disabled={busy === r.id}
                  >
                    ✓ 승인
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    className="warn"
                    onClick={() => void setStatus(r.id, "rejected")}
                    disabled={busy === r.id}
                  >
                    × 반려
                  </button>
                )}
                {r.status === "approved" && (
                  <button
                    onClick={() => void toggleDisplay(r.id, !(r.display ?? false))}
                    disabled={busy === r.id}
                    style={{
                      background: r.display ? "var(--yellow)" : "var(--gray-1)",
                    }}
                  >
                    {r.display ? "🟢 게재 중" : "⚪ 게재 OFF"}
                  </button>
                )}
                <button
                  className="subtle"
                  onClick={() => void onDelete(r.id)}
                  disabled={busy === r.id}
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
