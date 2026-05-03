function ChatModal({ open, onClose }) {
  const [messages, setMessages] = React.useState([
    { who: "them", text: "안녕하세요! 김창희 변호사입니다 😊" },
    { who: "them", text: "퇴사 관련해서 어떤 게 제일 걱정되세요?\n편하게 골라주시거나 직접 적어주셔도 돼요." },
  ]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const bodyRef = React.useRef(null);

  const replies = [
    "사장이 잠수타요 ㅠㅠ",
    "퇴직금 못 받을까봐",
    "괴롭힘 당함",
    "그냥 깔끔하게 나가고 싶음",
  ];

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  const send = (text) => {
    if (!text.trim()) return;
    const userMsg = { who: "me", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const responses = {
        "사장이 잠수타요 ㅠㅠ": "그거 ㄹㅇ 흔한 케이스예요. 변호사 명의로 통보 한 번 보내면 회사가 무시 못해요. 비용은 19.9만~으로 시작합니다 :)",
        "퇴직금 못 받을까봐": "근속기간이랑 평균임금만 알려주시면 받을 수 있는 금액 바로 계산해드려요. 못 주면 노동청 진정도 가능합니다!",
        "괴롭힘 당함": "정말 힘드셨겠어요... 증거만 있으면 산재 + 위자료까지 가능해요. 비대면으로 무료 상담부터 받아보실래요?",
        "그냥 깔끔하게 나가고 싶음": "오케이 그럼 기본 퇴사 패키지(19.9만)면 충분해요. 카톡으로 5분만 얘기하면 바로 진행 가능합니다 👍",
      };
      const reply = responses[text] || "네, 메시지 잘 봤어요. 정확한 답변 드리려면 카카오톡 채널로 연결드릴게요. 아래 버튼으로 이동 가능합니다 🙌";
      setMessages((m) => [...m, { who: "them", text: reply }]);
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
              <div className="status"><span className="dot"></span>지금 답변 가능</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className="modal-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.who}`} style={{ whiteSpace: "pre-line" }}>
              {m.text}
            </div>
          ))}
          {typing && (
            <div className="bubble them" style={{ display: "flex", gap: 4 }}>
              <span className="typ"></span>
              <span className="typ"></span>
              <span className="typ"></span>
            </div>
          )}
        </div>
        <div className="quick-replies">
          {replies.map((r) => (
            <button key={r} className="qr" onClick={() => send(r)}>{r}</button>
          ))}
        </div>
        <div className="modal-foot">
          <input
            type="text"
            className="chat-input"
            placeholder="직접 입력하기..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
            style={{
              flex: 1, padding: "12px 14px", border: "2px solid var(--ink)",
              borderRadius: 10, fontSize: 14, fontFamily: "var(--font-kr)",
              background: "var(--paper)", color: "var(--ink)",
            }}
          />
          <button className="btn primary" onClick={() => send(input)}>보내기</button>
        </div>
        <div style={{ padding: "12px 22px 16px", textAlign: "center", fontSize: 11, color: "var(--muted)", borderTop: "2px dashed var(--gray-2)", background: "var(--paper)" }}>
          🔒 모든 상담 내용 비밀 보장 · 영업일 24시간 내 답변
        </div>
      </div>
      <style>{`
        .typ {
          width: 8px; height: 8px; border-radius: 999px;
          background: var(--muted);
          animation: typ 1.2s infinite;
        }
        .typ:nth-child(2) { animation-delay: .15s; }
        .typ:nth-child(3) { animation-delay: .3s; }
        @keyframes typ {
          0%, 60%, 100% { opacity: .3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
window.ChatModal = ChatModal;
