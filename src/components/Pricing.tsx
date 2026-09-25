import { saveConsultation } from "../firebase";
import { Icon } from "./Icon";
import { PAYMENT_COPY } from "../config/payment";
import type { TierId } from "./Situations";

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
    cta: PAYMENT_COPY.cardCta,
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
      "변호사 명의 내용증명 발송 (밀린 임금·퇴직금 청구)",
      "잔여 연차 소진 협상",
      "사용자 측과의 교섭 자문",
      "회사의 손해배상·위약금 협박 대응",
      "노동청 진정 1건 자문 포함",
      "실업급여 절차 안내",
      "퇴사 후 서류 확보 지원 (이직확인서·경력증명서·원천징수)",
    ],
    cta: PAYMENT_COPY.cardCta,
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
      "부당해고·징계 검토, 노동위원회 구제신청 방향 설계",
      "산재 신청 자문",
      "민사 손해배상 청구 검토 (소송 비용 별도)",
      "형사고소 검토",
      "전담 변호사 배정",
    ],
    cta: PAYMENT_COPY.cardCta,
  },
];

// 노동분쟁 정액 상품(임금·퇴직금 회수 88만원, 부당해고 대응 66만원)은 없앴다(2026-09-15 대표 결정).
// 결제 화면이 받지 않는 상품이라 결제할 길이 없었고, 같은 사안에 가격이 두 개씩 보였다.
// 임금·퇴직금은 표준 절차로, 부당해고는 분쟁 대응으로 합쳤다.

type Props = {
  openChat: () => void;
  // 홈 "어떤 상황이세요?"에서 고른 패키지 — 해당 카드를 강조한다
  picked?: TierId | null;
};

// 카드마다 먼저 보이는 혜택 수 — 나머지는 "자세히 보기"로 접는다(홈 줄이기, 2026-09-25)
const PERKS_VISIBLE = 3;

export function Pricing({ openChat, picked = null }: Props) {
  const handleClick = (t: Tier) => {
    void saveConsultation({
      source: "form",
      message: `가격 카드 클릭: ${t.name}`,
      meta: { tier: t.id, price: t.price },
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
            상담 후 사안에 맞는 패키지를 정해 드립니다. 아래 금액은 패키지별로 정해진 보수입니다.
            <br />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              ※ {PAYMENT_COPY.fees}
            </span>
          </p>
        </div>

        <div className="reveal" style={{ textAlign: "center", margin: "0 auto 28px" }}>
          <a
            href="/diagnose"
            className="btn"
            style={{ background: "var(--yellow)", fontWeight: 800, maxWidth: "100%", whiteSpace: "normal" }}
          >
            <Icon name="compass" size={18} /> 어떤 절차가 맞는지 모르겠다면 — 1분 셀프 진단
          </a>
        </div>

        <div className="price-grid reveal">
          {tiers.map((t) => (
            <div
              key={t.id}
              id={`price-${t.id}`}
              className={`price-card ${t.pop ? "pop" : ""} ${picked === t.id ? "picked" : ""}`}
            >
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
                {t.perks.slice(0, PERKS_VISIBLE).map((p, i) => (
                  <li key={i}>
                    <span className="check">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              {t.perks.length > PERKS_VISIBLE && (
                <details className="price-more">
                  <summary>자세히 보기 ({t.perks.length - PERKS_VISIBLE}개 더)</summary>
                  <ul className="price-list">
                    {t.perks.slice(PERKS_VISIBLE).map((p, i) => (
                      <li key={i}>
                        <span className="check">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {/* B안(상담 후 결제) — 카드에서 바로 결제로 보내지 않고 상담으로 잇는다(2026-09-25). */}
              <button
                className="btn primary"
                style={{ width: "100%", marginTop: "auto" }}
                onClick={() => handleClick(t)}
              >
                {t.cta}
              </button>
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
            <span className="foot-key">노동위 구제신청 대리</span>
            <span className="foot-val">착수금 + 위임계약 — 상담 후 견적</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">상담료</span>
            <span className="foot-val">초기 카톡 문의 후 안내</span>
          </div>
          <div className="foot-row">
            <span className="foot-key">결제 방식</span>
            <span className="foot-val">{PAYMENT_COPY.howToPay}</span>
          </div>
          <div className="foot-row" style={{ marginTop: 8, paddingTop: 12, borderTop: "1px dashed var(--ink-2)" }}>
            <span className="foot-val" style={{ fontSize: 12, color: "var(--muted)" }}>
              본 사이트는 변호사법 제23조에 따른 광고물입니다. 표시된 보수액은 패키지별 정액이며, 어떤 패키지로 진행할지는 상담 후 정합니다. 결과를 보장하지 않습니다.
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
