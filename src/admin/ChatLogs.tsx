// 히로 채팅 로그 — 대화(sessionId) 단위로 묶어 보여준다.
// 예전엔 여러 방문자의 메시지가 시간순으로 뒤섞여 나와 실사용이 어려웠다(2026-08-24 개선).
import { useEffect, useMemo, useState } from "react";
import { watchChatMessages, type ChatMessageDoc } from "../firebase";

function fmtDate(ts: ChatMessageDoc["createdAt"]): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { hour12: false });
}

type Session = {
  key: string;
  sessionId: string | null;
  messages: ChatMessageDoc[]; // 오래된 순 — 대화를 읽는 순서
  lastAt: number;
  userTurns: number;
};

// 메시지 목록(최신순)을 sessionId별 대화로 묶는다. sessionId가 없는 옛 메시지는 한 묶음으로.
function groupMessages(rows: ChatMessageDoc[]): Session[] {
  const map = new Map<string, Session>();
  for (const r of rows) {
    const key = r.sessionId || "(세션 정보 없음)";
    let s = map.get(key);
    if (!s) {
      s = {
        key,
        sessionId: r.sessionId ?? null,
        messages: [],
        lastAt: 0,
        userTurns: 0,
      };
      map.set(key, s);
    }
    s.messages.push(r);
    const at = r.createdAt ? r.createdAt.seconds : 0;
    if (at > s.lastAt) s.lastAt = at;
    if (r.role === "me") s.userTurns += 1;
  }
  const out = [...map.values()];
  for (const s of out) {
    s.messages.sort(
      (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
    );
  }
  return out.sort((a, b) => b.lastAt - a.lastAt);
}

export function ChatLogs() {
  const [rows, setRows] = useState<ChatMessageDoc[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => watchChatMessages(setRows, 300), []);

  const sessions = useMemo(() => groupMessages(rows), [rows]);

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">채팅 로그</h1>
      <p className="admin-sub">
        히로와 나눈 대화를 한 건씩 묶어 최근 순으로 표시합니다. 제목을 누르면
        그 대화 전체가 펼쳐집니다.
      </p>

      {sessions.length === 0 ? (
        <p className="admin-empty">아직 채팅 로그가 없습니다.</p>
      ) : (
        sessions.map((s) => {
          const first = s.messages.find((m) => m.role === "me") ?? s.messages[0];
          const isOpen = openKey === s.key;
          return (
            <div key={s.key} className="chatlog-session">
              <button
                className="chatlog-head"
                onClick={() => setOpenKey(isOpen ? null : s.key)}
              >
                <span className="chatlog-when">
                  {fmtDate(s.messages[s.messages.length - 1]?.createdAt)}
                </span>
                <span className="chatlog-count">
                  메시지 {s.messages.length}건 · 의뢰인 {s.userTurns}회
                </span>
                <span className="chatlog-preview">{first?.text ?? ""}</span>
                <span className="chatlog-toggle">{isOpen ? "닫기" : "펼치기"}</span>
              </button>
              {isOpen && (
                <div className="chatlog-body">
                  <p className="chatlog-sid">
                    세션 {s.sessionId ? s.sessionId.slice(0, 8) : "정보 없음"}
                  </p>
                  {s.messages.map((m) => (
                    <div key={m.id} className={`chatlog-msg role-${m.role}`}>
                      <span className="chatlog-role">
                        {m.role === "me" ? "의뢰인" : "히로"}
                      </span>
                      <pre>{m.text}</pre>
                      <span className="chatlog-time">{fmtDate(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
