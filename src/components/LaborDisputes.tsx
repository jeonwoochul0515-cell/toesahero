// 홈 노동분쟁 허브 섹션 — 퇴사대행과 나란히 놓는 형제 카테고리 진입로(부당해고/임금체불/퇴직금/괴롭힘)
import { Link } from "react-router-dom";
import { Icon, type IconName } from "./Icon";

type Card = {
  to: string;
  icon: IconName;
  title: string;
  desc: string;
};

const CARDS: Card[] = [
  {
    to: "/unfair-dismissal",
    icon: "gavel",
    title: "부당해고",
    desc: "정당한 이유·서면 없이 잘렸다면. 해고일부터 3개월이 기한입니다.",
  },
  {
    to: "/unpaid-wages",
    icon: "coins",
    title: "임금체불",
    desc: "밀린 월급·수당은 명백한 법 위반. 진정부터 지급까지 대신 받아냅니다.",
  },
  {
    to: "/severance-pay",
    icon: "bank",
    title: "퇴직금 미지급",
    desc: "1년 이상 일했으면 당연한 권리. 5인 미만도, 알바도 예외 아닙니다.",
  },
  {
    to: "/harassment",
    icon: "shield",
    title: "직장 내 괴롭힘",
    desc: "혼자 버티지 마세요. 신고부터 민사·형사까지 변호사가 대응합니다.",
  },
];

export function LaborDisputes() {
  return (
    <section className="wrap reveal" style={{ padding: "72px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 800,
            padding: "6px 14px",
            border: "2px solid var(--ink)",
            borderRadius: 999,
            background: "var(--paper)",
          }}
        >
          <Icon name="scale" size={14} /> 노동 분쟁 대응
        </span>
      </div>
      <h2
        style={{
          fontSize: "clamp(26px, 4.5vw, 40px)",
          fontWeight: 900,
          letterSpacing: "-.03em",
          lineHeight: 1.15,
          textAlign: "center",
          margin: "0 0 10px",
        }}
      >
        당하고 참지 마세요.
        <br />
        <span className="mark-hl">당신 대신 변호사가 다툽니다.</span>
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--muted)",
          textAlign: "center",
          maxWidth: 520,
          margin: "0 auto 32px",
          lineHeight: 1.6,
        }}
      >
        퇴사만 대행하는 게 아닙니다. 사장·회사와 직접 부딪히기 싫은 노동 분쟁까지,
        변호사가 대신 맡습니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="labor-card"
            style={{
              display: "block",
              padding: "22px 20px",
              border: "2.5px solid var(--ink)",
              borderRadius: 16,
              background: "var(--paper)",
              boxShadow: "4px 4px 0 0 var(--ink)",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <Icon name={card.icon} size={30} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px" }}>
              {card.title}
            </h3>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--ink-2)",
              }}
            >
              {card.desc}
            </p>
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              자세히 보기 <Icon name="arrow" size={13} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
