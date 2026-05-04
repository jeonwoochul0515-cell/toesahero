import { saveConsultation } from "../firebase";

type Tier = {
  id: string;
  name: string;
  tag: string;
  price: string;
  sub: string;
  pop: boolean;
  perks: string[];
  cta: string;
};

const tiers: Tier[] = [
  {
    id: "basic",
    name: "기본 절차",
    tag: "BASIC",
    price: "199,000",
    sub: "통보·연락 응대 (분쟁 없음 가정)",
    pop: false,
    perks: [
      "변호사 명의 공식 통보 1회",
      "회사 연락 응대 대행",
      "사직서 양식 안내",
      "퇴직 절차 체크리스트",
      "카톡 상담 (영업일 응답)",
    ],
    cta: "상담 신청",
  },
  {
    id: "pro",
    name: "표준 절차",
    tag: "STANDARD",
    price: "390,000",
    sub: "임금·연차수당 청구 통합",
    pop: true,
    perks: [
      "기본 절차 전체 포함",
      "근로계약서·임금명세서 검토",
      "퇴직금·연차수당·야근수당 산정 자문",
      "사용자 측과의 교섭 자문",
      "노동청 진정 1건 자문 포함",
      "실업급여 절차 안내",
    ],
    cta: "상담 신청",
  },
  {
    id: "max",
    name: "분쟁 대응",
    tag: "FULL",
    price: "790,000",
    sub: "고소·민사 등 변호사 전속 사무",
    pop: false,
    perks: [
      "표준 절차 전체 포함",
      "직장 내 괴롭힘 신고 자문",
      "산재 신청 자문",
      "민사 손해배상 청구 검토 (소송 비용 별도)",
      "형사고소 검토",
      "전담 변호사 배정",
    ],
    cta: "변호사 상담",
  },
];

type Props = {
  openChat: () => void;
};

export function Pricing({ openChat }: Props) {
  const handleClick = (t: Tier) => {
    void saveConsultation({
      source: "form",
      message: `가격 카드 클릭: ${t.name}`,
      meta: { tier: t.id, price: t.price },
    });
    openChat();
  };

  return (
    <section id="pricing" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div
          className="reveal"
          style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 48px" }}
        >
          <span className="eyebrow">Service</span>
          <h2 className="h2">
            <span
              style={{
                background: "var(--yellow)",
                padding: "0 12px",
                borderRadius: 8,
                display: "inline-block",
                transform: "rotate(-1deg)",
                border: "2.5px solid var(--ink)",
                boxShadow: "3px 3px 0 0 var(--ink)",
              }}
            >
              서비스 안내
            </span>
            <br />
            (보수 기준)
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            <strong>노무사·일반 업체가 다룰 수 없는 영역까지 변호사가 직접 처리합니다.</strong>
            <br />
            상담 후 사안에 적합한 절차를 안내드립니다. 표시 금액은 위임계약 기준 보수이며, 사안에 따라 변동될 수 있습니다.
            <br />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              ※ 위 보수에는 부가세가 별도로 부과될 수 있습니다.
            </span>
          </p>
        </div>

        <div className="price-grid reveal">
          {tiers.map((t) => (
            <div key={t.id} className={`price-card ${t.pop ? "pop" : ""}`}>
              {t.pop && <div className="price-pop">표준 절차</div>}
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
                  <li key={i}>
                    <span className="check">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${t.pop ? "primary" : ""}`}
                style={{ width: "100%", marginTop: "auto" }}
                onClick={() => handleClick(t)}
              >
                {t.cta}
              </button>
              <a
                href={`/checkout?pkg=${t.id}`}
                className="btn"
                style={{
                  width: "100%",
                  marginTop: 6,
                  fontSize: 12,
                  padding: "9px 14px",
                  background: "var(--gray-1)",
                  color: "var(--ink-2)",
                }}
              >
                위임 진행 / 결제 안내 →
              </a>
              {t.id === "pro" && (
                <a
                  href="/calc"
                  className="btn"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    fontSize: 13,
                    background: "var(--yellow)",
                  }}
                >
                  📊 자동 계산기로 견적
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="price-foot reveal">
          <div className="foot-row">
            <span className="foot-key">소송 진행 시</span>
            <span className="foot-val">착수금 + 성공보수 별도 (사안별 위임계약 시 안내)</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">상담료</span>
            <span className="foot-val">초기 카톡 문의 후 안내</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">결제 방식</span>
            <span className="foot-val">위임계약 시 안내</span>
          </div>
          <div className="foot-row" style={{ marginTop: 8, paddingTop: 12, borderTop: "1px dashed var(--ink-2)" }}>
            <span className="foot-val" style={{ fontSize: 12, color: "var(--muted)" }}>
              본 사이트는 변호사법 제23조에 따른 광고물입니다. 표시된 보수액은 일반적 위임 기준이며, 사안의 난이도·특수성에 따라 협의 후 결정됩니다. 결과를 보장하지 않습니다.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
