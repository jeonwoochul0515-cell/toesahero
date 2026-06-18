import { useEffect, useMemo, useRef, useState } from "react";
import {
  logChatMessage,
  saveConsultation,
  saveDraftConsultation,
  signInWithKakao,
  signOut,
  watchAuth,
  type AppUser,
} from "../firebase";

type Msg = { who: "me" | "them"; text: string };

// 한 번의 채팅 대화를 묶는 세션 ID 생성 (구형 브라우저 폴백 포함)
function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

const replies = [
  "사장과 연락이 안 됩니다",
  "퇴직금 관련 문의",
  "직장 내 괴롭힘 상담",
  "퇴사 절차 안내",
];

// AI 챗봇 미설정 시 폴백 응답
const fallbackResponses: Record<string, string> = {
  "사장과 연락이 안 됩니다":
    "변호사 명의로 공식 통보를 진행하는 절차가 있습니다. 사안에 따라 적합한 절차를 변호사가 안내드립니다.",
  "퇴직금 관련 문의":
    "근속기간과 평균임금 정보를 알려주시면 변호사가 검토 후 안내드립니다.",
  "직장 내 괴롭힘 상담":
    "관련 증거가 있는 경우 산재 신청·민사 청구 등의 절차 검토가 가능합니다. 비대면 상담 가능하니 카카오톡 채널로 연결드릴까요?",
  "퇴사 절차 안내":
    "기본 절차 위임은 199,000원부터 안내드리고 있습니다. 자세한 사항은 위임계약 시 안내드립니다.",
};

const FALLBACK_DEFAULT =
  "메시지 확인했습니다. 정확한 답변을 위해 카카오톡 채널 또는 1660-4452로 변호사와 직접 연결드리겠습니다.";

async function callAiChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userName: string | null
): Promise<string | null> {
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, userName }),
    });
    if (resp.status === 503) {
      // AI not configured — fall back
      return null;
    }
    if (!resp.ok) {
      console.warn("[chat] upstream error", resp.status);
      return null;
    }
    const data = (await resp.json()) as { text?: string };
    return data.text ?? null;
  } catch (e) {
    console.warn("[chat] network error", e);
    return null;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChatModal({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { who: "them", text: "안녕하세요. 법률사무소 청송 김창희 변호사입니다." },
    {
      who: "them",
      text: "퇴사 관련하여 가장 우선적으로 검토가 필요한 사항을 선택해 주시거나, 직접 작성해 주세요. 변호사 비밀유지 의무가 적용됩니다.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [draftLetter, setDraftLetter] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  const [contact, setContact] = useState("");
  const [contactSaved, setContactSaved] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  // 이 모달 인스턴스(=한 대화) 동안 유지되는 세션 ID. 메시지와 상담 건을 묶는다.
  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) sessionIdRef.current = makeSessionId();

  useEffect(() => watchAuth(setUser), []);

  // 의뢰인이 충분히 정보를 제공했는지 추정 (말한 횟수 + 글자 수)
  const userTurnCount = useMemo(
    () => messages.filter((m) => m.who === "me").length,
    [messages]
  );
  const userTotalChars = useMemo(
    () =>
      messages
        .filter((m) => m.who === "me")
        .reduce((sum, m) => sum + m.text.length, 0),
    [messages]
  );
  const showDraftButton =
    !draftSubmitted &&
    !draftLetter &&
    userTurnCount >= 2 &&
    userTotalChars >= 30;

  const requestDraft = async () => {
    setDraftLoading(true);
    try {
      const conversation = messages
        .filter((m) => m.who === "me" || m.who === "them")
        .map((m) => ({
          role: (m.who === "me" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content: m.text,
        }));
      const resp = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversation,
          userName: user?.displayName ?? null,
        }),
      });
      if (!resp.ok) {
        setMessages((m) => [
          ...m,
          {
            who: "them",
            text: "통보문 초안 생성에 일시적인 오류가 있습니다. 잠시 후 다시 시도하시거나 카카오톡 채널로 문의해 주세요.",
          },
        ]);
        return;
      }
      const data = (await resp.json()) as { text?: string };
      const draft = data.text ?? "";
      if (!draft) return;
      setDraftLetter(draft);
      setMessages((m) => [
        ...m,
        {
          who: "them",
          text: "변호사 명의 공식 통보문 1차 초안이 생성되었습니다. 아래에서 내용을 확인하세요. 변호사가 검토·수정 후 발송합니다.",
        },
      ]);
    } catch (e) {
      console.error("[draft]", e);
    } finally {
      setDraftLoading(false);
    }
  };

  const submitDraftForReview = async () => {
    if (!draftLetter) return;
    const conversationLog = messages
      .filter((m) => m.who === "me" || m.who === "them")
      .map((m) => `${m.who === "me" ? "[의뢰인]" : "[챗봇]"} ${m.text}`)
      .join("\n");
    const id = await saveDraftConsultation({
      conversationLog,
      draftLetter,
      userName: user?.displayName ?? null,
      sessionId: sessionIdRef.current,
    });
    setDraftSubmitted(true);
    setMessages((m) => [
      ...m,
      {
        who: "them",
        text: id
          ? `위임 검토 신청이 접수되었습니다. (접수번호: ${id.slice(
              0,
              8
            )})\n변호사 김창희가 통보문을 검토 후 ${
              user?.email ?? "카카오톡"
            }으로 안내드립니다.`
          : "검토 신청 저장에 실패했습니다. 카카오톡 채널로 직접 문의해 주세요.",
      },
    ]);
  };

  const handleKakaoLogin = async () => {
    setSigningIn(true);
    try {
      const u = await signInWithKakao();
      if (u) {
        setMessages((m) => [
          ...m,
          {
            who: "them",
            text: `${u.displayName ?? "의뢰인"}님 본인 확인이 완료되었습니다.\n이후 상담 내용은 변호사가 직접 확인하며, 비밀유지 의무가 적용됩니다.`,
          },
        ]);
      }
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = e?.code ?? "unknown";
      const msg = e?.message ?? String(err);
      const userClosed =
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request";
      setMessages((m) => [
        ...m,
        {
          who: "them",
          text: userClosed
            ? "본인확인 창이 닫혔습니다. 본인 확인 없이도 문의는 진행 가능합니다."
            : `본인확인이 정상적으로 진행되지 않았습니다. 변호사에게 다음 코드를 전달해 주세요.\n[${code}] ${msg}`,
        },
      ]);
      console.error("[kakao-login]", code, msg, err);
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const root = modalRef.current;
    if (!root) return;

    const focusable = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("aria-hidden"));

    const first = focusable()[0];
    if (first) first.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === firstEl || !root.contains(active)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { who: "me", text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setTyping(true);
    void logChatMessage(text, "me", sessionIdRef.current);
    void saveConsultation({
      source: "chat",
      message: text,
      sessionId: sessionIdRef.current,
    });

    // AI 챗봇 호출 (변협 컴플라이언스 system prompt 적용)
    const aiHistory = nextMsgs
      .filter((m) => m.who === "me" || m.who === "them")
      .map(
        (m) =>
          ({
            role: m.who === "me" ? "user" : "assistant",
            content: m.text,
          } as const)
      );
    const aiText = await callAiChat(aiHistory, user?.displayName ?? null);

    setTyping(false);

    let reply: string;
    if (aiText) {
      reply = aiText;
    } else {
      reply = fallbackResponses[text] ?? FALLBACK_DEFAULT;
    }

    setMessages((m) => [...m, { who: "them", text: reply }]);
    void logChatMessage(reply, "them", sessionIdRef.current);
  };

  // 회신받을 연락처 제출 — 이때만 변호사에게 문자 알림이 발송된다.
  const submitContact = async () => {
    const v = contact.trim();
    if (!v || contactSaved) return;
    await saveConsultation({
      source: "chat",
      message: "[연락처 제출] 의뢰인이 회신 연락처를 남겼습니다.",
      contact: v,
      sessionId: sessionIdRef.current,
    });
    setContactSaved(true);
    setMessages((m) => [
      ...m,
      {
        who: "them",
        text: `연락처를 전달했습니다. 변호사 김창희가 영업일 기준으로 ${v} 로 연락드리겠습니다.`,
      },
    ]);
  };

  if (!open) return null;
  return (
    <div
      className="modal-back open"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="김창희 변호사 상담 창"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <div className="modal-head">
          <div className="who">
            <div className="ava">변</div>
            <div>
              <div className="name">김창희 변호사</div>
              <div className="status">
                <span className="dot" />
                지금 답변 가능
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        {user ? (
          <div className="auth-bar verified">
            <span className="auth-check">✓</span>
            <span className="auth-text">
              <strong>{user.displayName ?? "의뢰인"}</strong>님 본인 확인 완료
            </span>
            <button className="auth-out" onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>
        ) : (
          <div className="auth-bar">
            <span className="auth-text">
              <strong>본인 확인 시</strong> 변호사가 정확한 자문을 드릴 수 있습니다
            </span>
            <button
              className="auth-kakao"
              onClick={handleKakaoLogin}
              disabled={signingIn}
            >
              {signingIn ? "로그인 중..." : "카카오 본인확인"}
            </button>
          </div>
        )}
        <div className="modal-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`bubble ${m.who}`}
              style={{ whiteSpace: "pre-line" }}
            >
              {m.text}
            </div>
          ))}
          {typing && (
            <div className="bubble them" style={{ display: "flex", gap: 4 }}>
              <span className="typ" />
              <span className="typ" />
              <span className="typ" />
            </div>
          )}
        </div>
        <div className="quick-replies">
          {replies.map((r) => (
            <button key={r} className="qr" onClick={() => void send(r)}>
              {r}
            </button>
          ))}
        </div>
        {contactSaved ? (
          <div className="chat-contact done">
            ✓ 연락처가 전달되었습니다 — 변호사가 직접 연락드립니다.
          </div>
        ) : (
          <div className="chat-contact">
            <input
              type="tel"
              className="chat-input"
              placeholder="회신받을 연락처 (전화·카톡 ID)"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitContact();
              }}
            />
            <button className="btn" onClick={() => void submitContact()}>
              연락처 남기기
            </button>
          </div>
        )}
        <div className="modal-foot">
          <input
            type="text"
            className="chat-input"
            placeholder="직접 입력하기..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send(input);
            }}
          />
          <button className="btn primary" onClick={() => void send(input)}>
            보내기
          </button>
        </div>
        {showDraftButton && (
          <div className="draft-cta">
            <p className="draft-cta-text">
              지금까지 정보로 <strong>변호사 명의 통보문 1차 초안</strong>을 자동
              생성해드릴 수 있습니다.
              <br />
              <span className="draft-cta-note">
                (변호사 검토·수정 후 발송됩니다 · 베이직 199,000원 패키지)
              </span>
            </p>
            <button
              className="btn primary"
              onClick={() => void requestDraft()}
              disabled={draftLoading}
              style={{ width: "100%" }}
            >
              {draftLoading
                ? "AI가 초안 작성 중..."
                : "📝 통보문 초안 생성하기"}
            </button>
          </div>
        )}

        {draftLetter && !draftSubmitted && (
          <div className="draft-preview">
            <div className="draft-preview-head">
              <strong>변호사 명의 통보문 — AI 1차 초안</strong>
              <span className="draft-tag">검토 대기</span>
            </div>
            <pre className="draft-preview-body">{draftLetter}</pre>
            <p className="draft-preview-note">
              [대괄호] 부분은 의뢰인이 알려주지 않은 정보로, 변호사 검토 시
              채워집니다. 위 내용을 변호사에게 검토 요청하시겠습니까?
            </p>
            <div className="draft-preview-actions">
              <button
                className="btn primary"
                onClick={() => void submitDraftForReview()}
                style={{ flex: 1 }}
              >
                ✓ 변호사 검토 요청
              </button>
              <button
                className="btn"
                onClick={() => setDraftLetter(null)}
                style={{ flex: 0 }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        <div className="modal-kakao-link">
          <a
            href="https://pf.kakao.com/_zkzIX/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="btn yellow"
            style={{ width: "100%", fontSize: 14, padding: "12px 16px" }}
          >
            🟡 카카오톡 채널에서 직접 상담
          </a>
        </div>
        <div className="chat-foot-note">
          🔒 변호사 비밀유지 의무 적용 · AI 응답은 변호사 사후 검토 · 본 사이트는 변호사법 제23조에 따른 광고물입니다
        </div>
      </div>
    </div>
  );
}
