import { useEffect, useRef, useState } from "react";
import {
  logChatMessage,
  saveConsultation,
  signInWithKakao,
  signOut,
  watchAuth,
  type AppUser,
} from "../firebase";

type Msg = { who: "me" | "them"; text: string };

const replies = [
  "사장과 연락이 안 됩니다",
  "퇴직금 관련 문의",
  "직장 내 괴롭힘 상담",
  "퇴사 절차 안내",
];

const responses: Record<string, string> = {
  "사장과 연락이 안 됩니다":
    "변호사 명의로 공식 통보를 진행하는 절차가 있습니다. 사안에 따라 적합한 절차를 변호사가 안내드립니다.",
  "퇴직금 관련 문의":
    "근속기간과 평균임금 정보를 알려주시면 변호사가 검토 후 안내드립니다. 사안에 따라 노동청 진정 등 후속 절차 자문이 가능합니다.",
  "직장 내 괴롭힘 상담":
    "관련 증거가 있는 경우 산재 신청·민사 청구 등의 절차 검토가 가능합니다. 비대면 상담 가능하니 카카오톡 채널로 연결드릴까요?",
  "퇴사 절차 안내":
    "기본 절차 위임은 199,000원부터 안내드리고 있습니다 (사안별 협의). 자세한 사항은 위임계약 시 안내드립니다.",
};

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
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => watchAuth(setUser), []);

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

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { who: "me", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    void logChatMessage(text, "me");
    void saveConsultation({
      source: "chat",
      message: text,
    });
    setTimeout(() => {
      setTyping(false);
      const reply =
        responses[text] ??
        "메시지 확인했습니다. 정확한 답변을 위해 카카오톡 채널 또는 변호사 직통으로 연결드릴 수 있습니다. 영업일 기준 변호사가 직접 답변드립니다.";
      setMessages((m) => [...m, { who: "them", text: reply }]);
      void logChatMessage(reply, "them");
    }, 1100);
  };

  if (!open) return null;
  return (
    <div className="modal-back open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
            <button key={r} className="qr" onClick={() => send(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="modal-foot">
          <input
            type="text"
            className="chat-input"
            placeholder="직접 입력하기..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
          />
          <button className="btn primary" onClick={() => send(input)}>
            보내기
          </button>
        </div>
        <div className="chat-foot-note">
          🔒 변호사 비밀유지 의무 적용 · 영업일 기준 변호사 직접 응답 · 본 사이트는 변호사법 제23조에 따른 광고물입니다
        </div>
      </div>
    </div>
  );
}
