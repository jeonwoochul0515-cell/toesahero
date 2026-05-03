function Hero({ heroCopy = "boss", openChat }) {
  const variants = {
    boss: {
      eyebrow: "변호사가 직접 운영함 · 24시 대응",
      h1a: "사장님 얼굴",
      h1b: "보기 싫어서",
      h1c: "ㄹㅇ 못 나가는 중?",
      sub: "괜찮음. 우리가 대신 말해줌.\n변호사가 처음부터 끝까지 챙기는 진짜 퇴사대행.",
    },
    soft: {
      eyebrow: "변호사가 직접 운영함 · 24시 대응",
      h1a: "퇴사 말 꺼내기",
      h1b: "너무 힘들었지?",
      h1c: "이제 대신 해줄게.",
      sub: "혼자 끙끙대지 말고. 변호사가 옆에서 같이 가요.\n퇴사부터 못 받은 돈 받는 것까지.",
    },
    legal: {
      eyebrow: "변호사가 직접 운영함 · 24시 대응",
      h1a: "퇴사도 협상이다.",
      h1b: "근데 협상은",
      h1c: "변호사가 잘함.",
      sub: "감정 빼고, 법대로. 퇴직금·연차수당·실업급여까지\n받을 수 있는 거 다 받고 나갈 수 있게 도와드림.",
    },
  };
  const v = variants[heroCopy] || variants.boss;

  return (
    <section style={{ paddingTop: 60, paddingBottom: 100 }}>
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-text">
            <span className="pill" style={{ background: "var(--yellow)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--orange)", display: "inline-block" }}></span>
              {v.eyebrow}
            </span>
            <h1 className="h1">
              <span className="h1-line">{v.h1a}</span>
              <span className="h1-line h1-highlight">
                <span className="h1-mark">{v.h1b}</span>
              </span>
              <span className="h1-line">{v.h1c}</span>
            </h1>
            <p className="hero-sub">{v.sub}</p>
            <div className="hero-cta">
              <button className="btn primary" onClick={openChat} style={{ fontSize: 17, padding: "16px 26px" }}>
                💬 카톡으로 무료상담
              </button>
              <a href="#pricing" className="btn yellow" style={{ fontSize: 17, padding: "16px 26px" }}>
                얼마인지 보기 →
              </a>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <strong>4,200+</strong>
                <span>퇴사 도와드림</span>
              </div>
              <div className="trust-item">
                <strong>98%</strong>
                <span>당일 연락 끊김</span>
              </div>
              <div className="trust-item">
                <strong>1660-4452</strong>
                <span>변호사 직통</span>
              </div>
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-card hero-phone">
              <div className="phone-head">
                <div className="phone-dots"><i></i><i></i><i></i></div>
                <span>회사 단톡방</span>
              </div>
              <div className="phone-body">
                <div className="msg boss">
                  <span className="msg-name">팀장님</span>
                  <div className="msg-bub boss-bub">잠깐 회의실에서 얘기 좀 ㄱㄱ</div>
                </div>
                <div className="msg boss">
                  <div className="msg-bub boss-bub">왜 안와?</div>
                </div>
                <div className="msg boss">
                  <div className="msg-bub boss-bub">!!!!!</div>
                </div>
                <div className="msg me">
                  <div className="msg-bub me-bub">
                    <span style={{ fontWeight: 900 }}>[법률사무소 청송]</span>
                    <br />
                    의뢰인 OOO님의 퇴사 의사를 통보드립니다.
                    <br />이후 모든 연락은 본 사무소로...
                  </div>
                </div>
                <div className="msg-status">전송됨 · 읽음 1</div>
              </div>
            </div>

            <div className="sticker sticker-1">
              <Mascot size={90} pose="fly" />
            </div>
            <div className="sticker sticker-2">
              <span style={{ fontFamily: "var(--font-en)", fontWeight: 700, fontSize: 14 }}>
                CASE CLOSED
              </span>
            </div>
            <div className="sticker sticker-3">
              합법<br />ㄹㅇ
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        @media (max-width: 1050px) {
          .hero-grid { grid-template-columns: 1fr; gap: 50px; }
        }
        .h1 {
          font-size: clamp(40px, 7vw, 78px);
          font-weight: 900; line-height: 1.32;
          letter-spacing: -.035em; margin: 22px 0 24px;
        }
        .h1-line { display: block; margin-block: 0.08em; }
        .h1-line.h1-highlight { padding-bottom: 6px; }
        .h1-highlight { color: var(--ink); }
        .h1-mark {
          background: var(--yellow);
          padding: 0 12px;
          box-shadow: 4px 4px 0 0 var(--ink);
          display: inline-block;
          transform: rotate(-1deg);
          border: 2.5px solid var(--ink);
          border-radius: 6px;
        }
        .hero-sub {
          font-size: clamp(16px, 1.5vw, 19px);
          line-height: 1.6;
          color: var(--ink-2);
          margin: 0 0 32px;
          white-space: pre-line;
          max-width: 36ch;
        }
        .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
        .hero-trust {
          display: flex; gap: 28px;
          margin-top: 36px;
          padding-top: 28px;
          border-top: 2px dashed var(--ink-2);
          flex-wrap: wrap;
        }
        .trust-item { display: flex; flex-direction: column; }
        .trust-item strong {
          font-family: var(--font-en);
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -.02em;
          color: var(--ink);
        }
        .trust-item span { font-size: 12px; color: var(--muted); margin-top: 2px; }

        .hero-art {
          position: relative;
          padding: 20px;
        }
        .hero-card {
          background: var(--paper);
          border: 2.5px solid var(--ink);
          border-radius: 22px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          transform: rotate(2deg);
        }
        .phone-head {
          background: var(--ink);
          color: var(--cream);
          padding: 14px 18px;
          display: flex; align-items: center; justify-content: space-between;
          font-weight: 700;
          font-size: 14px;
        }
        .phone-dots { display: flex; gap: 6px; }
        .phone-dots i {
          width: 10px; height: 10px; border-radius: 999px;
          background: var(--orange); display: block;
        }
        .phone-dots i:nth-child(2) { background: var(--yellow); }
        .phone-dots i:nth-child(3) { background: var(--green); }
        .phone-body {
          padding: 18px 16px 20px;
          background: var(--gray-1);
          min-height: 320px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .msg { display: flex; flex-direction: column; }
        .msg.boss { align-items: flex-start; }
        .msg.me { align-items: flex-end; margin-top: 12px; }
        .msg-name { font-size: 11px; color: var(--muted); margin-bottom: 4px; font-weight: 700; }
        .msg-bub {
          padding: 10px 13px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.45;
          max-width: 80%;
          border: 2px solid var(--ink);
          white-space: nowrap;
        }
        .msg.me .msg-bub { white-space: normal; }
        .boss-bub {
          background: var(--paper);
          border-bottom-left-radius: 4px;
        }
        .me-bub {
          background: var(--yellow);
          font-weight: 600;
          border-bottom-right-radius: 4px;
        }
        .msg-status { font-size: 10px; color: var(--muted); align-self: flex-end; margin-top: 4px; }

        .sticker {
          position: absolute;
          background: var(--paper);
          border: 2.5px solid var(--ink);
          padding: 10px 14px;
          font-weight: 900;
          box-shadow: var(--shadow-sm);
          font-size: 14px;
          line-height: 1.1;
          text-align: center;
        }
        .sticker-1 {
          top: -10px; left: -10px;
          background: transparent;
          border: none;
          padding: 0;
          box-shadow: none;
          transform: rotate(-12deg);
          animation: bob 3s ease-in-out infinite;
        }
        .sticker-2 {
          bottom: 10px; left: -20px;
          background: var(--orange);
          color: var(--cream);
          transform: rotate(-8deg);
          border-radius: 8px;
          padding: 8px 14px;
        }
        .sticker-3 {
          top: 30%; right: -18px;
          background: var(--yellow);
          transform: rotate(10deg);
          border-radius: 999px;
          width: 64px; height: 64px;
          display: grid; place-items: center;
          font-size: 14px;
        }
        @keyframes bob {
          0%, 100% { transform: rotate(-12deg) translateY(0); }
          50% { transform: rotate(-8deg) translateY(-8px); }
        }
        @media (max-width: 700px) {
          .sticker-1 { left: 0; top: -20px; }
          .sticker-3 { right: 0; }
        }
      `}</style>
    </section>
  );
}

window.Hero = Hero;
