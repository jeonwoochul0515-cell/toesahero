function Footer({ openChat }) {
  return (
    <>
      <section style={{ background: "var(--ink)", color: "var(--cream)", padding: "100px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <Mascot size={120} pose="wave" />
          </div>
          <h2 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.05, margin: "0 0 18px" }}>
            진짜 마지막 출근,<br />
            <span style={{ background: "var(--yellow)", color: "var(--ink)", padding: "2px 14px", borderRadius: 8, display: "inline-block", transform: "rotate(-1deg)" }}>
              우리가 같이 함.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--gray-2)", margin: "0 auto 36px", maxWidth: 480, lineHeight: 1.6 }}>
            카톡 한 번이면 시작. 무료 상담임. 비밀 보장 ㄹㅇ.
          </p>
          <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn yellow" style={{ fontSize: 17, padding: "16px 28px" }} onClick={openChat}>
              💬 지금 카톡 상담
            </button>
            <a href="tel:1660-4452" className="btn" style={{ fontSize: 17, padding: "16px 28px", background: "var(--paper)" }}>
              ☎ 1660-4452
            </a>
          </div>
        </div>
        {/* big bg word */}
        <div style={{
          position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--font-en)", fontWeight: 700,
          fontSize: "clamp(120px, 20vw, 300px)",
          color: "rgba(255, 214, 10, 0.06)",
          letterSpacing: "-.05em",
          lineHeight: 1, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 1,
        }}>
          GOODBYE
        </div>
      </section>

      <footer style={{ background: "var(--cream)", borderTop: "2.5px solid var(--ink)", padding: "40px 0 30px" }}>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Mascot size={32} pose="stand" />
                <strong style={{ fontSize: 18, fontWeight: 900 }}>퇴사히어로</strong>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
                변호사가 직접 운영하는<br />합법 퇴사대행 서비스
              </p>
            </div>
            <div>
              <strong className="foot-h">서비스</strong>
              <a href="#audience">이런 분들에게</a>
              <a href="#process">서비스 프로세스</a>
              <a href="#pricing">가격 / 패키지</a>
              <a href="#reviews">후기</a>
            </div>
            <div>
              <strong className="foot-h">법률사무소 청송</strong>
              <a href="https://chang-hee.kim" target="_blank" rel="noopener">변호사 김창희 ↗</a>
              <a href="tel:1660-4452">☎ 1660-4452</a>
              <a href="mailto:lawchungsong@daum.net">lawchungsong@daum.net</a>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>부산 연제구 법원남로15번길 10, 202호</span>
            </div>
            <div>
              <strong className="foot-h">법적 고지</strong>
              <a href="#">이용약관</a>
              <a href="#">개인정보처리방침</a>
              <a href="#">변호사 광고 심의기준 준수</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 법률사무소 청송. 변호사 김창희. 대한변호사협회 등록.</span>
            <span>이 사이트는 변호사법에 따른 광고물입니다.</span>
          </div>
        </div>
        <style>{`
          .foot-grid {
            display: grid;
            grid-template-columns: 1.3fr 1fr 1.4fr 1fr;
            gap: 32px;
            padding-bottom: 30px;
            border-bottom: 2px dashed var(--ink-2);
          }
          @media (max-width: 800px) { .foot-grid { grid-template-columns: 1fr 1fr; gap: 24px; } }
          @media (max-width: 500px) { .foot-grid { grid-template-columns: 1fr; } }
          .foot-grid > div { display: flex; flex-direction: column; gap: 8px; }
          .foot-h {
            font-family: var(--font-en);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: var(--orange);
            margin-bottom: 6px;
          }
          .foot-grid a {
            color: var(--ink-2);
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
          }
          .foot-grid a:hover { color: var(--ink); text-decoration: underline; }
          .foot-bottom {
            display: flex;
            justify-content: space-between;
            padding-top: 20px;
            font-size: 11px;
            color: var(--muted);
            flex-wrap: wrap;
            gap: 10px;
          }
        `}</style>
      </footer>
    </>
  );
}
window.Footer = Footer;
