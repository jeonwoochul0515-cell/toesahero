import { saveConsultation } from "../firebase";
import { Icon } from "./Icon";

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
      "통보 후 회사·파견업체 연락, 사무소가 대신 응대",
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
      "잔여 연차 소진 협상",
      "사용자 측과의 교섭 자문",
      "회사의 손해배상·위약금 협박 대응",
      "노동청 진정 1건 자문 포함",
      "실업급여 절차 안내",
      "퇴사 후 서류 확보 지원 (이직확인서·경력증명서·원천징수)",
    ],
    cta: "상담 신청",
  },
  {
    id: "max",
    name: "분쟁 대응",
    tag: "FULL",
    price: "790,000",
    sub: "괴롭힘·해고 등 분쟁 대응 (소송 수행은 별도 위임)",
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

// 노동분쟁 정액 상품(성공보수 0) — 퇴사 무관, "당해서 다투는" 고객용. 큰 소송은 상담 후 견적으로 분리.
type LaborProduct = {
  id: string;
  name: string;
  price: string;
  sub: string;
  perks: string[];
  to: string;
};

const laborTiers: LaborProduct[] = [
  {
    id: "wage-recovery",
    name: "임금·퇴직금 회수",
    price: "880,000",
    sub: "밀린 임금·퇴직금 회수 (정액 · 성공보수 0)",
    perks: [
      "변호사 명의 내용증명 발송",
      "고용노동청 진정 대리 자문",
      "근로감독관 조사 대응",
      "체불액 산정·증거 정리",
    ],
    to: "/unpaid-wages",
  },
  // 괴롭힘 전용 상품(66만원)은 없앴다 — 분쟁 대응(79만원) 하나로 통일(2026-09-06 사용자 확정).
  // 두 상품이 모두 괴롭힘을 다뤄 손님이 무엇을 사야 할지 알 수 없었다.
  // /harassment 랜딩은 그대로 두고 가격만 79만원으로 맞췄다.
  {
    id: "dismissal-response",
    name: "부당해고 대응 (자문)",
    price: "660,000",
    sub: "해고 검토·내용증명·전략 (정액)",
    perks: [
      "해고 정당성·절차 검토",
      "서면통지 하자 분석",
      "이의·내용증명 발송",
      "구제신청 방향 설계",
    ],
    to: "/unfair-dismissal",
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
      browseEvent: true,
    });
    openChat();
  };

  const handleLaborClick = (t: LaborProduct) => {
    void saveConsultation({
      source: "form",
      message: `노동분쟁 카드 클릭: ${t.name}`,
      meta: { product: t.id, price: t.price },
      browseEvent: true,
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
          <span className="eyebrow">보수 안내</span>
          <h2 className="h2">
            <span className="mark-hl">서비스 안내</span>
            <br />
            (보수 기준)
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            <strong>노무사·일반 업체가 다룰 수 없는 영역까지 변호사가 직접 처리합니다.</strong>
            <br />
            상담 후 사안에 적합한 절차를 안내드립니다. 아래 금액은 위임계약을 맺을 때 기준이 되는 보수이며, 사안에 따라 변동될 수 있습니다.
            <br />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              ※ 위 보수에는 부가세가 별도로 부과될 수 있습니다.
            </span>
          </p>
        </div>

        <div className="reveal" style={{ textAlign: "center", margin: "0 auto 28px" }}>
          <a
            href="/diagnose"
            className="btn"
            style={{ background: "var(--yellow)", fontWeight: 800 }}
          >
            <Icon name="compass" size={18} /> 어떤 절차가 맞는지 모르겠다면 — 1분 셀프 진단
          </a>
        </div>

        <div
          className="reveal"
          style={{
            maxWidth: 720,
            margin: "0 auto 40px",
            padding: "18px 22px",
            background: "var(--paper)",
            border: "2.5px solid var(--ink)",
            borderRadius: 14,
            boxShadow: "4px 4px 0 0 var(--ink)",
          }}
        >
          <strong style={{ fontSize: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="scale" size={20} /> "퇴사하면 손해배상 청구하겠다"는 협박을 받고 계신가요?
          </strong>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>
            회사의 <strong>손해배상·위약금 협박 대응</strong>은 노무사·일반 업체가
            대리할 수 없는 <strong>변호사 전속 영역</strong>입니다. 위축되지 마세요.
            변호사가 직접 사실관계와 계약서를 검토해 대응합니다.
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
                  <Icon name="calc" size={15} /> 자동 계산기로 견적
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

        <div
          className="reveal"
          style={{ textAlign: "center", maxWidth: 720, margin: "72px auto 40px" }}
        >
          <span className="eyebrow">노동 분쟁 대응</span>
          <h2 className="h2">
            퇴사가 아니라 <span className="mark-hl">'다투는'</span> 분들께
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            이미 해고당했거나, 임금·퇴직금을 못 받았거나, 괴롭힘을 겪고 있다면.
            <br />
            <strong>정액 · 성공보수 0원</strong>으로 변호사가 대신 다툽니다.
          </p>
          {/* 괴롭힘 전용 상품을 없앴으므로 괴롭힘으로 오신 분이 갈 곳을 여기서 이어준다.
              설명에 괴롭힘을 적어 두고 카드가 없으면 그대로 막다른 안내가 된다. */}
          <p className="labor-harassment-note">
            직장 내 괴롭힘은 위 <strong>분쟁 대응(79만원)</strong> 패키지에서 함께
            다룹니다.{" "}
            <a href="/harassment">괴롭힘 대응 자세히 보기 →</a>
          </p>
        </div>

        <div className="price-grid reveal">
          {laborTiers.map((t) => (
            <div key={t.id} className="price-card">
              <div className="price-tag">FLAT</div>
              <h3 className="price-name">{t.name}</h3>
              <p className="price-sub">{t.sub}</p>
              <div className="price-row">
                <span className="price-num">{t.price}</span>
                <span className="price-unit">원</span>
                <span className="price-per">/ 정액</span>
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
                className="btn primary"
                style={{ width: "100%", marginTop: "auto" }}
                onClick={() => handleLaborClick(t)}
              >
                상담 신청
              </button>
              <a
                href={t.to}
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
                자세히 보기 →
              </a>
            </div>
          ))}
        </div>

        <div className="price-foot reveal">
          <div className="foot-row">
            <span className="foot-key">노동위 구제신청 대리</span>
            <span className="foot-val">착수금 + 위임계약 — 상담 후 견적</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">민사·손해배상 소송</span>
            <span className="foot-val">착수금 + 성공보수 별도 (사안별 위임계약 시 안내)</span>
          </div>
          <div className="foot-row" style={{ marginTop: 8, paddingTop: 12, borderTop: "1px dashed var(--ink-2)" }}>
            <span className="foot-val" style={{ fontSize: 12, color: "var(--muted)" }}>
              위 정액 상품에는 부가세가 별도로 부과될 수 있으며, 인지대·송달료 등 실비는 별도입니다. 결과를 보장하지 않습니다.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
