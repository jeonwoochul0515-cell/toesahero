function Calculator() {
  const items = [
    { id: "salary", label: "월급 못 받음", emoji: "💰", value: 2400000, desc: "체불임금 청구", example: "한 달치 평균" },
    { id: "severance", label: "퇴직금 못 받음", emoji: "🏦", value: 3500000, desc: "근로기준법 §34 미지급분", example: "1년 이상 근무" },
    { id: "annual", label: "연차수당 미지급", emoji: "🌴", value: 850000, desc: "사용 못한 연차 환산", example: "10일 기준" },
    { id: "overtime", label: "야근수당 떼임", emoji: "🌙", value: 1200000, desc: "통상임금 1.5배 청구", example: "월 평균 30시간" },
    { id: "harass", label: "직장 내 괴롭힘", emoji: "🚨", value: 5000000, desc: "위자료 + 산재 신청", example: "사례별 차이" },
    { id: "ui", label: "실업급여 받기", emoji: "📨", value: 3200000, desc: "권고사직 처리 협상", example: "120일 기준" },
  ];
  const [picked, setPicked] = React.useState(new Set(["severance", "annual"]));

  const toggle = (id) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const total = items.filter((i) => picked.has(i.id)).reduce((a, b) => a + b.value, 0);
  const fmt = new Intl.NumberFormat("ko-KR").format;

  return (
    <section id="calc" style={{ background: "var(--ink)", color: "var(--cream)" }}>
      <div className="wrap">
        <div className="calc-grid">
          <div>
            <span className="eyebrow" style={{ color: "var(--yellow)" }}>Calculator</span>
            <h2 className="h2" style={{ color: "var(--cream)" }}>
              나도 모르게<br />
              <span style={{ color: "var(--yellow)" }}>떼이고 있던 돈</span><br />
              계산기
            </h2>
            <p className="lead" style={{ color: "var(--gray-2)" }}>
              해당되는 거 체크만 하면 끝. 진짜 받을 수 있는지는 변호사가 무료로 봐드림.
            </p>
            <div className="calc-total">
              <div className="calc-total-label">예상 청구액</div>
              <div className="calc-total-value">
                <span className="amount-num">{fmt(total)}</span>
                <span className="amount-unit">원</span>
              </div>
              <div className="calc-total-note">
                <span className="dot-warn"></span>
                실제 결과는 사안에 따라 달라짐. 그래도 일단 받을 수 있는 건 받아야지.
              </div>
              <button className="btn yellow" style={{ marginTop: 20, width: "100%", fontSize: 16 }} onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}>
                💬 이거 받을 수 있는지 물어보기
              </button>
            </div>
          </div>

          <div className="calc-list">
            {items.map((it) => {
              const on = picked.has(it.id);
              return (
                <button key={it.id} className={`calc-item ${on ? "on" : ""}`} onClick={() => toggle(it.id)}>
                  <div className="calc-check">
                    {on ? "✓" : ""}
                  </div>
                  <div className="calc-emoji">{it.emoji}</div>
                  <div className="calc-info">
                    <div className="calc-label">{it.label}</div>
                    <div className="calc-desc">{it.desc} · {it.example}</div>
                  </div>
                  <div className="calc-value">+{fmt(it.value)}원</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        .calc-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 60px;
          align-items: start;
        }
        @media (max-width: 900px) { .calc-grid { grid-template-columns: 1fr; gap: 40px; } }
        .calc-total {
          margin-top: 32px;
          background: var(--paper);
          color: var(--ink);
          border-radius: 20px;
          padding: 24px;
          border: 2.5px solid var(--ink);
        }
        .calc-total-label {
          font-family: var(--font-en);
          font-weight: 700;
          font-size: 12px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .calc-total-value {
          display: flex; align-items: baseline; gap: 6px;
          margin: 8px 0 14px;
        }
        .amount-num {
          font-family: var(--font-en);
          font-weight: 700;
          font-size: clamp(40px, 6vw, 60px);
          letter-spacing: -.03em;
          color: var(--orange);
        }
        .amount-unit { font-size: 22px; font-weight: 900; }
        .calc-total-note {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 12px; color: var(--muted); line-height: 1.5;
        }
        .dot-warn {
          display: inline-block; width: 8px; height: 8px;
          background: var(--orange); border-radius: 999px;
          margin-top: 5px; flex-shrink: 0;
        }
        .calc-list { display: flex; flex-direction: column; gap: 10px; }
        .calc-item {
          display: grid;
          grid-template-columns: auto auto 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: var(--paper);
          color: var(--ink);
          border: 2.5px solid var(--ink);
          border-radius: 14px;
          cursor: pointer;
          font-family: var(--font-kr);
          text-align: left;
          transition: all .15s;
        }
        .calc-item:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 0 var(--cream); }
        .calc-item.on {
          background: var(--yellow);
          box-shadow: 4px 4px 0 0 var(--orange);
          transform: translate(-2px, -2px);
        }
        .calc-check {
          width: 26px; height: 26px;
          border: 2.5px solid var(--ink);
          border-radius: 8px;
          background: var(--cream);
          display: grid; place-items: center;
          font-weight: 900; font-size: 16px;
        }
        .calc-item.on .calc-check { background: var(--ink); color: var(--yellow); }
        .calc-emoji { font-size: 24px; }
        .calc-label { font-weight: 800; font-size: 15px; }
        .calc-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .calc-item.on .calc-desc { color: var(--ink-2); }
        .calc-value {
          font-family: var(--font-en);
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
window.Calculator = Calculator;
