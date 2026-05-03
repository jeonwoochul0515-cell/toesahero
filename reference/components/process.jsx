function Process() {
  const steps = [
    { n: "01", emoji: "💬", title: "카톡으로 톡 ㄱㄱ", body: "카톡 채널 추가하고 상황 한 줄만. 변호사가 답변 (24시간 내). 비밀 보장 ㄹㅇ.", time: "5분", side: "무료" },
    { n: "02", emoji: "🤝", title: "전략 짜고 위임장 ㅇㅋ", body: "퇴사 시점 · 협상 카드 · 받을 돈까지 변호사가 직접 컨설팅. 위임장은 비대면으로.", time: "30분", side: "유료 시작" },
    { n: "03", emoji: "📣", title: "사장한테 우리가 통보", body: "법률사무소 명의로 공식 통보. 그 다음부터 회사는 우리한테만 연락 가능함.", time: "당일", side: "후련함 ☑" },
    { n: "04", emoji: "💰", title: "받을 돈 받고 끝", body: "퇴직금·연차수당·실업급여까지 챙겨드림. 안 주면 노동청 진정·가압류·소송까지.", time: "2~6주", side: "케이스마다 다름" },
  ];
  return (
    <section id="process" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal">
          <span className="eyebrow">How it works</span>
          <h2 className="h2">
            전화 한 통이면<br />
            <span style={{ background: "var(--orange)", color: "var(--cream)", padding: "0 12px", borderRadius: 8, display: "inline-block", transform: "rotate(-1deg)", border: "2.5px solid var(--ink)", boxShadow: "4px 4px 0 0 var(--ink)" }}>퇴사 끝남</span>
          </h2>
          <p className="lead">진짜로 4단계임. 길어야 한 달. 짧으면 당일.</p>
        </div>
        <div className="proc-grid reveal">
          {steps.map((s, i) => (
            <div key={i} className="proc-card">
              <div className="proc-top">
                <span className="proc-num">{s.n}</span>
                <span className="proc-time">⏱ {s.time}</span>
              </div>
              <div className="proc-emoji">{s.emoji}</div>
              <h3 className="proc-title">{s.title}</h3>
              <p className="proc-body">{s.body}</p>
              <div className="proc-side">{s.side}</div>
              {i < steps.length - 1 && <div className="proc-arrow">→</div>}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .proc-grid {
          margin-top: 48px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1000px) { .proc-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .proc-grid { grid-template-columns: 1fr; } }
        .proc-card {
          position: relative;
          background: var(--paper);
          border: 2.5px solid var(--ink);
          border-radius: 18px;
          padding: 22px;
          box-shadow: var(--shadow-sm);
          transition: all .25s;
        }
        .proc-card:hover {
          background: var(--yellow);
          transform: translate(-4px, -4px);
          box-shadow: 8px 8px 0 0 var(--ink);
        }
        .proc-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .proc-num {
          font-family: var(--font-en);
          font-size: 42px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -.04em;
          color: var(--ink);
        }
        .proc-card:hover .proc-num { color: var(--orange); }
        .proc-time {
          font-size: 11px;
          font-weight: 700;
          background: var(--gray-1);
          padding: 5px 10px;
          border-radius: 999px;
          border: 2px solid var(--ink);
        }
        .proc-emoji { font-size: 36px; margin-bottom: 12px; }
        .proc-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -.015em;
          margin: 0 0 8px;
        }
        .proc-body {
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink-2);
          margin: 0 0 14px;
        }
        .proc-side {
          font-family: var(--font-en);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          color: var(--orange);
          padding-top: 10px;
          border-top: 2px dashed var(--ink-2);
        }
        .proc-arrow {
          position: absolute;
          right: -22px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 28px;
          font-weight: 900;
          color: var(--orange);
          z-index: 2;
          background: var(--cream);
          padding: 0 4px;
        }
        @media (max-width: 1000px) { .proc-arrow { display: none; } }
      `}</style>
    </section>
  );
}
window.Process = Process;
