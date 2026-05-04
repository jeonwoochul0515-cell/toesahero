import { useEffect, useState } from "react";
import { watchChatMessages, type ChatMessageDoc } from "../firebase";

function fmtDate(ts: ChatMessageDoc["createdAt"]): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { hour12: false });
}

export function ChatLogs() {
  const [rows, setRows] = useState<ChatMessageDoc[]>([]);

  useEffect(() => watchChatMessages(setRows, 300), []);

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">채팅 로그</h1>
      <p className="admin-sub">
        실시간 채팅 모달 메시지. 사용자(me) 와 봇(them) 응답을 시간 역순으로 표시.
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 160 }}>일시</th>
            <th style={{ width: 100 }}>역할</th>
            <th style={{ width: 130 }}>UID</th>
            <th>내용</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="admin-empty">
                아직 채팅 로그가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.createdAt)}</td>
                <td>
                  <span className={`admin-tag role-${r.role}`}>
                    {r.role === "me" ? "의뢰인" : "변호사/봇"}
                  </span>
                </td>
                <td>
                  {r.uid ? (
                    <code className="admin-uid">{r.uid.slice(0, 10)}...</code>
                  ) : (
                    <span className="admin-anon">익명</span>
                  )}
                </td>
                <td className="admin-msg-cell">
                  <pre>{r.text}</pre>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
