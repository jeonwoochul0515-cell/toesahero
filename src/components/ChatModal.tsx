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
  "사장이 잠수타요 ㅠㅠ",
  "퇴직금 못 받을까봐",
  "괴롭힘 당함",
  "그냥 깔끔하게 나가고 싶음",
];

const responses: Record<string, string> = {
  "사장이 잠수타요 ㅠㅠ":
    "그거 ㄹㅇ 흔한 케이스예요. 변호사 명의로 통보 한 번 보내면 회사가 무시 못해요. 비용은 19.9만~으로 시작합니다 :)",
  "퇴직금 못 받을까봐":
    "근속기간이랑 평균임금만 알려주시면 받을 수 있는 금액 바로 계산해드려요. 못 주면 노동청 진정도 가능합니다!",
  "괴롭힘 당함":
    "정말 힘드셨겠어요... 증거만 있으면 산재 + 위자료까지 가능해요. 비대면으로 무료 상담부터 받아보실래요?",
  "그냥 깔끔하게 나가고 싶음":
    "오케이 그럼 기본 퇴사 패키지(19.9만)면 충분해요. 카톡으로 5분만 얘기하면 바로 진행 가능합니다 👍",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChatModal({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { who: "them", text: "안녕하세요! 김창희 변호사입니다 😊" },
    {
      who: "them",
      text: "퇴사 관련해서 어떤 게 제일 걱정되세요?\n편하게 골라주시거나 직접 적어주셔도 돼요.",
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
            text: `${u.displayName ?? "고객"}님 본인 인증 완료됐어요 ✓\n이제부터 상담 내용은 변호사가 직접 확인합니다.`,
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
            ? "카카오 로그인 창이 닫혔어요. 그냥 진행하셔도 됩니다."
            : `카카오 로그인 실패 — 변호사한테 이 코드 알려주시면 도와드려요\n[${code}] ${msg}`,
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
        "네, 메시지 잘 봤어요. 정확한 답변 드리려면 카카오톡 채널로 연결드릴게요. 아래 버튼으로 이동 가능합니다 🙌";
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
              <strong>{user.displayName ?? "고객"}</strong>님 카카오 인증 완료
            </span>
            <button className="auth-out" onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>
        ) : (
          <div className="auth-bar">
            <span className="auth-text">
              <strong>본인 인증하면</strong> 변호사가 더 정확한 답변 줄 수 있어요
            </span>
            <button
              className="auth-kakao"
              onClick={handleKakaoLogin}
              disabled={signingIn}
            >
              {signingIn ? "로그인 중..." : "카카오로 시작"}
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
          🔒 모든 상담 내용 비밀 보장 · 영업일 24시간 내 답변
        </div>
      </div>
    </div>
  );
}
