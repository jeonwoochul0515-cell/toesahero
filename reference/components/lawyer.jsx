function Lawyer() {
  const credentials = [
    "법률사무소 청송 대표 변호사",
    "가맹거래사 (이중 자격)",
    "동아대학교 법학전문대학원 겸임교수",
    "前 부산지방고용노동청 전문위원회 위원",
    "前 부산지방검찰청 형사조정위원",
    "前 부산가정법원 위탁보호위원",
    "공무원연금공단 법률상담변호사",
    "법제처 법제자문관",
  ];
  return (
    <section id="lawyer" style={{ background: "var(--paper)" }}>
      <div className="wrap">
        <div className="lawyer-grid reveal">
          <div className="lawyer-portrait">
            <div className="portrait-frame">
              <div className="portrait-bg">
                <span className="portrait-placeholder">
                  <span style={{ fontFamily: "var(--font-en)", fontSize: 12, letterSpacing: ".1em" }}>PORTRAIT</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>김창희 변호사 사진</span>
                </span>
              </div>
              <div className="portrait-stamp">
                <Mascot size={70} pose="wink" />
              </div>
              <div className="portrait-tag">10년+ · 1,000건+</div>
            </div>
          </div>

          <div className="lawyer-info">
            <span className="eyebrow">Founder's Note</span>
            <h2 className="h2">
              "혼자 끙끙대지 말고<br />
              <span style={{ background: "var(--yellow)", padding: "0 10px", borderRadius: 6, border: "2.5px solid var(--ink)", boxShadow: "3px 3px 0 0 var(--ink)", display: "inline-block", transform: "rotate(-1deg)" }}>변호사한테 떠넘겨요.</span>"
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)" }}>
              안녕하세요. 김창희 변호사입니다.<br />
              10년간 1,000건 넘게 사건을 다루면서, <strong>가장 안타까웠던 게 '혼자 결정 내리는 사람들'</strong>이었어요. 특히 퇴사는요... 말 한 번 잘못 꺼내면 받을 돈도 못 받고 나오게 됨. ㄹㅇ로요.<br /><br />
              그래서 만들었습니다. <strong style={{ background: "var(--yellow-soft)", padding: "1px 4px" }}>변호사가 처음부터 끝까지 책임지는 퇴사대행</strong>. 다른 곳처럼 메시지만 대신 보내주고 끝내지 않습니다. 받을 돈 받는 것까지 — 그게 진짜 퇴사니까요.
            </p>
            <div className="lawyer-creds">
              {credentials.map((c, i) => (
                <span key={i} className="cred">✓ {c}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <a href="https://chang-hee.kim" target="_blank" rel="noopener" className="btn">
                변호사 프로필 보기 ↗
              </a>
              <a href="tel:1660-4452" className="btn primary">
                ☎ 1660-4452 직통
              </a>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .lawyer-grid {
          display: grid;
          grid-template-columns: 0.85fr 1.1fr;
          gap: 60px;
          align-items: center;
        }
        @media (max-width: 900px) { .lawyer-grid { grid-template-columns: 1fr; gap: 40px; } }
        .lawyer-portrait { position: relative; }
        .portrait-frame {
          position: relative;
          background: var(--yellow);
          border: 2.5px solid var(--ink);
          border-radius: 24px;
          box-shadow: var(--shadow-lg);
          padding: 24px;
          transform: rotate(-2deg);
        }
        .portrait-bg {
          aspect-ratio: 4/5;
          border: 2px dashed var(--ink-2);
          border-radius: 14px;
          background:
            repeating-linear-gradient(45deg, var(--gray-1) 0 8px, var(--gray-2) 8px 16px);
          display: grid; place-items: center;
        }
        .portrait-placeholder {
          background: var(--paper);
          border: 2px solid var(--ink);
          padding: 12px 16px; border-radius: 8px;
          display: flex; flex-direction: column; align-items: center;
          font-weight: 700;
        }
        .portrait-stamp {
          position: absolute;
          top: -22px; right: -22px;
          background: var(--paper);
          border-radius: 999px;
          border: 2.5px solid var(--ink);
          padding: 6px;
          box-shadow: var(--shadow-sm);
          transform: rotate(15deg);
        }
        .portrait-tag {
          position: absolute;
          bottom: -16px; left: 50%;
          transform: translateX(-50%) rotate(2deg);
          background: var(--ink);
          color: var(--cream);
          font-family: var(--font-en);
          font-weight: 700;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: 999px;
          letter-spacing: .04em;
          border: 2.5px solid var(--ink);
          white-space: nowrap;
        }
        .lawyer-creds {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
        }
        .cred {
          background: var(--gray-1);
          border: 2px solid var(--ink);
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
        }
      `}</style>
    </section>
  );
}
window.Lawyer = Lawyer;
