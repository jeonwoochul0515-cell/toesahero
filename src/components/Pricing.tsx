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
          <span className="eyebrow">Pricing</span>
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
              가격
            </span>
            도
            <br />
            그냥 다 까놓을게요
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            결제 전 무료 상담 필수임. 진짜 필요한 거만 추천드림.
            <br />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              ※ 1년 미만 근속자 / 학생 / 사회초년생 20% 할인
            </span>
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
            <span
              className="foot-val"
              style={{ color: "var(--orange)", fontWeight: 800 }}
            >
              50% 환불 보장
            </span>
          </div>
          <div className="foot-row">
            <span className="foot-key">결제 방식</span>
            <span className="foot-val">카드 · 무통장 · 분할납부 (3개월) 가능</span>
          </div>
        </div>
      </div>
    </section>
  );
}
