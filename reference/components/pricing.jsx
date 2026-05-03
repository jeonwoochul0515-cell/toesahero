function Pricing({ openChat }) {
  const tiers = [
    {
      id: "basic",
      name: "기본 퇴사",
      tag: "BASIC",
      price: "199,000",
      sub: "그냥 깔끔하게 나가고 싶을 때",
      pop: false,
      perks: [
        "변호사 명의 공식 통보 1회",
        "회사 연락 차단 + 응대 대행",
        "사직서 작성 가이드",
        "퇴직 절차 체크리스트",
        "카톡 상담 (영업일 24시간)",
      ],
      cta: "이거로 시작",
    },
    {
      id: "pro",
      name: "안전 퇴사",
      tag: "MOST POPULAR",
      price: "390,000",
      sub: "퇴직금·연차수당까지 다 받고 나가기",
      pop: true,
      perks: [
        "기본 퇴사 전체 포함",
        "근로계약서·임금명세서 검토",
        "퇴직금·연차수당·야근수당 산정",
        "사용자 측과 직접 협상",
        "노동청 진정 1건 무료",
        "실업급여 권고사직 협상",
      ],
      cta: "이거 ㄹㅇ 추천",
    },
    {
      id: "max",
      name: "올인원 퇴사",
      tag: "FULL",
      price: "790,000",
      sub: "괴롭힘·임금체불 등 분쟁 케이스",
      pop: false,
      perks: [
        "안전 퇴사 전체 포함",
        "직장 내 괴롭힘 신고 대행",
        "산재 신청 컨설팅",
        "민사 손해배상 청구 (별도)",
        "형사고소 검토",
        "전담 변호사 1:1 배정",
      ],
      cta: "변호사랑 상담",
    },
  ];
  return (
    <section id="pricing" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 48px" }}>
          <span className="eyebrow">Pricing</span>
          <h2 className="h2">
            <span style={{ background: "var(--yellow)", padding: "0 12px", borderRadius: 8, display: "inline-block", transform: "rotate(-1deg)", border: "2.5px solid var(--ink)", boxShadow: "3px 3px 0 0 var(--ink)" }}>가격</span>도<br />
            그냥 다 까놓을게요
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            결제 전 무료 상담 필수임. 진짜 필요한 거만 추천드림.<br />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>※ 1년 미만 근속자 / 학생 / 사회초년생 20% 할인</span>
          </p>
        </div>

        <div className="price-grid reveal">
          {tiers.map((t) => (
            <div key={t.id} className={`price-card ${t.pop ? "pop" : ""}`}>
              {t.pop && <div className="price-pop">★ 90%가 이거 선택함</div>}
              <div className="price-tag">{t.tag}</div>
              <h3 className="price-name">{t.name}</h3>
              <p className="price-sub">{t.sub}</p>
              <div className="price-row">
                <span className="price-num">{t.price}</span>
                <span className="price-unit">원</span>
                <span className="price-per">/ 1건</span>
              </div>
              <ul className="price-list">
                {t.perks.map((p, i) => (
                  <li key={i}><span className="check">✓</span>{p}</li>
                ))}
              </ul>
              <button
                className={`btn ${t.pop ? "primary" : ""}`}
                style={{ width: "100%", marginTop: "auto" }}
                onClick={openChat}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="price-foot reveal">
          <div className="foot-row">
            <span className="foot-key">소송 진행 시</span>
            <span className="foot-val">착수금 + 성공보수 별도 (사건별 안내)</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">결과 안 나오면</span>
            <span className="foot-val" style={{ color: "var(--orange)", fontWeight: 800 }}>50% 환불 보장</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">결제 방식</span>
            <span className="foot-val">카드 · 무통장 · 분할납부 (3개월) 가능</span>
          </div>
        </div>
      </div>
      <style>{`
        .price-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: stretch;
        }
        @media (max-width: 900px) { .price-grid { grid-template-columns: 1fr; } }
        .price-card {
          background: var(--paper);
          border: 2.5px solid var(--ink);
          border-radius: 22px;
          box-shadow: var(--shadow);
          padding: 28px 24px;
          display: flex; flex-direction: column;
          position: relative;
          transition: transform .2s;
        }
        .price-card:hover { transform: translateY(-4px); }
        .price-card.pop {
          background: var(--yellow);
          transform: translateY(-12px) rotate(-.5deg);
          box-shadow: var(--shadow-lg);
        }
        .price-card.pop:hover { transform: translateY(-16px) rotate(-.5deg); }
        .price-pop {
          position: absolute;
          top: -16px; left: 50%;
          transform: translateX(-50%) rotate(-2deg);
          background: var(--orange);
          color: var(--cream);
          padding: 6px 16px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          border: 2.5px solid var(--ink);
          white-space: nowrap;
        }
        .price-tag {
          font-family: var(--font-en);
          font-size: 11px; font-weight: 700;
          letter-spacing: .14em;
          color: var(--orange);
          margin-bottom: 12px;
        }
        .price-name {
          font-size: 28px; font-weight: 900;
          letter-spacing: -.025em;
          margin: 0 0 6px;
        }
        .price-sub { font-size: 13px; color: var(--ink-2); margin: 0 0 22px; line-height: 1.5; }
        .price-row {
          display: flex; align-items: baseline; gap: 4px;
          margin-bottom: 22px;
          padding-bottom: 22px;
          border-bottom: 2px dashed var(--ink-2);
        }
        .price-num {
          font-family: var(--font-en);
          font-size: 44px;
          font-weight: 700;
          letter-spacing: -.03em;
        }
        .price-unit { font-weight: 900; font-size: 18px; }
        .price-per { font-size: 13px; color: var(--muted); margin-left: 6px; }
        .price-list {
          list-style: none; padding: 0; margin: 0 0 24px;
          display: flex; flex-direction: column; gap: 9px;
          font-size: 13.5px;
        }
        .price-list li { display: flex; gap: 8px; align-items: flex-start; line-height: 1.45; }
        .check {
          flex-shrink: 0;
          width: 18px; height: 18px;
          background: var(--ink); color: var(--yellow);
          border-radius: 999px; display: grid; place-items: center;
          font-size: 11px; font-weight: 900;
        }
        .price-card.pop .check { background: var(--orange); color: var(--cream); }
        .price-foot {
          margin-top: 36px;
          background: var(--paper);
          border: 2.5px solid var(--ink);
          border-radius: 16px;
          padding: 18px 22px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .foot-row {
          display: flex; gap: 16px;
          font-size: 14px;
          padding: 4px 0;
          flex-wrap: wrap;
        }
        .foot-key {
          font-weight: 800;
          min-width: 110px;
        }
        .foot-val { color: var(--ink-2); }
      `}</style>
    </section>
  );
}
window.Pricing = Pricing;
