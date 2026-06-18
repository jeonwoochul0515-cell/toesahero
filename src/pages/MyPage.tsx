import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  signInWithKakao,
  signOut,
  watchAuth,
  watchMyCases,
  type AppUser,
  type ConsultationDoc,
} from "../firebase";
import { usePageMeta } from "../hooks/usePageMeta";

const STATUS_LABEL: Record<NonNullable<ConsultationDoc["status"]>, string> = {
  new: "신규 접수",
  contacted: "변호사 응대 중",
  consulted: "1차 상담 완료",
  contracted: "위임 체결",
  closed: "종료",
};

// 진행 단계 타임라인 정의 (status 순서 = 단계 인덱스)
const STAGES: { key: NonNullable<ConsultationDoc["status"]>; label: string; desc: string }[] = [
  { key: "new", label: "신규 접수", desc: "사건이 접수되었습니다." },
  { key: "contacted", label: "변호사 응대", desc: "변호사가 사안을 확인하고 연락드립니다." },
  { key: "consulted", label: "상담 완료", desc: "1차 상담을 마쳤습니다." },
  { key: "contracted", label: "위임 체결", desc: "위임계약·결제가 완료되어 절차를 진행합니다." },
  { key: "closed", label: "종료", desc: "사건이 종료되었습니다." },
];

const SOURCE_LABEL: Record<ConsultationDoc["source"], string> = {
  chat: "카톡 상담",
  form: "체크리스트",
  floating: "긴급 문의",
  draft: "베이직: 통보문",
  notice: "표준: 내용증명",
};

function fmtDate(ts: ConsultationDoc["createdAt"]): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function MyPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cases, setCases] = useState<ConsultationDoc[]>([]);
  const [signingIn, setSigningIn] = useState(false);

  usePageMeta({
    title: "마이페이지 — 의뢰인 본인 사건 진행 상황",
    description:
      "카카오 본인 확인 후 본인이 신청한 사건 진행 상황을 실시간 조회. 변호사 비밀유지 의무 적용.",
    canonical: "/my",
    noIndex: true, // 본인 정보 페이지 — 검색 노출 X
  });

  useEffect(() => {
    return watchAuth((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return watchMyCases(user.uid, setCases, 50);
  }, [user]);

  if (authLoading) {
    return (
      <div className="my-page">
        <div className="my-loading">로그인 확인 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="my-page my-login-required">
        <div className="my-login-card">
          <Link to="/" className="my-back">← 홈으로</Link>
          <h1 className="my-h1">마이페이지</h1>
          <p className="my-sub">
            사건 진행 상황을 보려면 카카오로 본인 확인이 필요합니다.
            <br />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              변호사 비밀유지 의무가 적용되며, 본인만 본인 사건을 확인할 수 있습니다.
            </span>
          </p>
          <button
            className="auth-kakao my-kakao-btn"
            onClick={async () => {
              setSigningIn(true);
              try {
                await signInWithKakao();
              } catch (e) {
                console.warn(e);
                alert(
                  "카카오 로그인이 취소되었거나 실패했습니다. 다시 시도해 주세요."
                );
              } finally {
                setSigningIn(false);
              }
            }}
            disabled={signingIn}
          >
            {signingIn ? "연결 중..." : "🟡 카카오로 로그인"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-page">
      <header className="my-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <div className="my-greeting">
          <strong>{user.displayName ?? "의뢰인"}</strong>님 안녕하세요
        </div>
        <button className="auth-out" onClick={() => void signOut()}>
          로그아웃
        </button>
      </header>

      <main className="my-main">
        <h1 className="my-h1">내 사건 ({cases.length})</h1>

        {cases.length === 0 ? (
          <div className="my-empty">
            <p>아직 신청한 사건이 없습니다.</p>
            <Link to="/" className="btn primary">
              💬 상담 신청하러 가기
            </Link>
          </div>
        ) : (
          <div className="my-cases">
            {cases.map((c) => {
              const status = c.status ?? "new";
              const currentIndex = STAGES.findIndex((s) => s.key === status);
              return (
                <article key={c.id} className="my-case">
                  <header className="my-case-head">
                    <div>
                      <span className="my-case-source">
                        {SOURCE_LABEL[c.source]}
                      </span>
                      <span className={`admin-status st-${status}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      {c.paymentStatus === "paid" && (
                        <span className="admin-status st-contracted" style={{ marginLeft: 6 }}>
                          결제완료
                        </span>
                      )}
                    </div>
                    <time className="my-case-time">{fmtDate(c.createdAt)}</time>
                  </header>

                  <ol className="my-timeline">
                    {STAGES.map((st, i) => {
                      const state =
                        i < currentIndex
                          ? "done"
                          : i === currentIndex
                          ? "current"
                          : "pending";
                      return (
                        <li key={st.key} className={`my-tl-step ${state}`}>
                          <span className="my-tl-dot">
                            {state === "done" ? "✓" : state === "current" ? "●" : ""}
                          </span>
                          <div className="my-tl-body">
                            <span className="my-tl-label">{st.label}</span>
                            <span className="my-tl-desc">{st.desc}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {c.message && (
                    <div className="my-case-msg">
                      <strong>요청 내용:</strong> {c.message}
                    </div>
                  )}

                  {c.pickedItems && c.pickedItems.length > 0 && (
                    <div className="my-case-items">
                      <strong>검토 항목:</strong>{" "}
                      {c.pickedItems.map((p, i) => (
                        <span key={i} className="admin-pick">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {c.draftLetter && (
                    <div className="my-case-draft">
                      <h4>📝 변호사 명의 통보문</h4>
                      <div className="my-draft-status">
                        상태:{" "}
                        <strong>
                          {c.draftStatus === "approved"
                            ? "변호사 승인 완료 (발송 준비)"
                            : c.draftStatus === "sent"
                            ? "회사 측 발송 완료"
                            : c.draftStatus === "edited"
                            ? "변호사 검토·수정 중"
                            : "변호사 검토 대기"}
                        </strong>
                      </div>
                    </div>
                  )}

                  {c.noticeLetter && (
                    <div className="my-case-draft">
                      <h4>📜 내용증명</h4>
                      <div className="my-draft-status">
                        상태:{" "}
                        <strong>
                          {c.noticeStatus === "approved"
                            ? "변호사 승인 완료 (발송 준비)"
                            : c.noticeStatus === "sent"
                            ? "발송 완료"
                            : c.noticeStatus === "edited"
                            ? "변호사 검토·수정 중"
                            : "변호사 검토 대기"}
                        </strong>
                      </div>
                    </div>
                  )}

                  {typeof c.estimatedAmount === "number" &&
                    c.estimatedAmount > 0 && (
                      <div className="my-case-amount">
                        검토 가능 항목 합산:{" "}
                        <strong>
                          {c.estimatedAmount.toLocaleString("ko-KR")}원
                        </strong>
                        <small>
                          {" "}
                          (참고용, 실제 청구 가능액은 변호사 검토 후 결정)
                        </small>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}

        <div className="my-foot-note">
          🔒 변호사 비밀유지 의무 적용 · 본 사이트는 변호사법 제23조에 따른 광고물입니다
          <br />
          진행 상황 문의는 카카오톡 채널 또는 ☎ 1660-4452 로 연락 주세요.
        </div>
      </main>
    </div>
  );
}
