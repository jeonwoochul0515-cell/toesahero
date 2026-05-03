function Audience() {
  const cases = [
    { tag: "월요병", emoji: "😩", title: "일요일 밤만 되면\n심장이 쿵쾅거림", body: "그거 ㄹㅇ 회사 신호임. 미루지 말자." },
    { tag: "갑질", emoji: "🫥", title: "퇴사 말 꺼내자\n사장이 잠수탐", body: "잠수타도 소용없음. 변호사가 직접 통보함." },
    { tag: "퇴직금", emoji: "💸", title: "받아야 할 돈\n못 받고 나갈까봐", body: "퇴직금·연차·야근수당 다 계산해서 받아드림." },
    { tag: "잔류회유", emoji: "🥲", title: "그만둔다 했더니\n갑자기 잘해줌", body: "그거 페이크임. 마음 굳혔으면 깔끔하게 ㄱㄱ." },
    { tag: "계약위반", emoji: "📑", title: "근로계약서랑\n실제가 다름", body: "그거 위법 가능성 큼. 무료로 검토해드림." },
    { tag: "괴롭힘", emoji: "🚨", title: "직장 내 괴롭힘\n증거 모으는 중", body: "신고부터 산재까지 변호사가 풀세트로 챙김." },
  ];
  return (
    <section id="audience" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal">
          <span className="eyebrow">For You</span>
          <h2 className="h2">
            이런 <span style={{ background: "var(--yellow)", padding: "0 10px", border: "2.5px solid var(--ink)", borderRadius: 6, boxShadow: "3px 3px 0 0 var(--ink)", display: "inline-block", transform: "rotate(-1deg)" }}>퇴준생</span>들에게<br />ㄹㅇ 추천함
          </h2>
          <p className="lead">하나라도 해당되면 그냥 상담받으셈. 무료니까.</p>
        </div>
        <div className="aud-grid reveal">
          {cases.map((c, i) => (
            <div key={i} className="aud-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="aud-tag">#{c.tag}</div>
              <div className="aud-emoji">{c.emoji}</div>
              <h3 className="aud-title">{c.title}</h3>
              <p className="aud-body">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .aud-grid {
          margin-top: 48px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 900px) { .aud-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .aud-grid { grid-template-columns: 1fr; } }
        .aud-card {
          background: var(--paper);
          border: 2.5px solid var(--ink);
          border-radius: 18px;
          padding: 22px;
          box-shadow: var(--shadow-sm);
          transition: transform .2s, box-shadow .2s;
          position: relative;
          overflow: hidden;
        }
        .aud-card:hover {
          transform: translate(-3px, -3px) rotate(-.5deg);
          box-shadow: 7px 7px 0 0 var(--ink);
        }
        .aud-card:nth-child(2n):hover { transform: translate(-3px, -3px) rotate(.5deg); }
        .aud-tag {
          display: inline-block;
          font-family: var(--font-en);
          font-weight: 700;
          font-size: 11px;
          letter-spacing: .04em;
          background: var(--ink);
          color: var(--yellow);
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .aud-emoji { font-size: 44px; line-height: 1; margin-bottom: 14px; }
        .aud-title {
          font-size: 22px;
          font-weight: 900;
          line-height: 1.25;
          margin: 0 0 10px;
          letter-spacing: -.02em;
          white-space: pre-line;
        }
        .aud-body {
          font-size: 14px;
          line-height: 1.55;
          color: var(--ink-2);
          margin: 0;
        }
      `}</style>
    </section>
  );
}
window.Audience = Audience;
