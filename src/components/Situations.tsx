// 홈 "어떤 상황이세요?" — 예전 대상 카드 9개(#audience)와 노동분쟁 카드 4개(#labor)를 선택지 3개로 합친 구역(2026-09-25)
import { Icon, type IconName } from "./Icon";

export type TierId = "basic" | "pro" | "max";

const SITUATIONS: Array<{
  tier: TierId;
  icon: IconName;
  title: string;
  body: string;
  pkg: string;
}> = [
  {
    tier: "basic",
    icon: "megaphone",
    title: "그냥 그만두고 싶어요",
    body: "회사에 말 꺼내기가 힘들고, 퇴사 뒤 연락도 받기 싫어요.",
    pkg: "기본 절차 199,000원",
  },
  {
    tier: "pro",
    icon: "coins",
    title: "못 받은 돈이 있어요",
    body: "월급·퇴직금·연차수당·야근수당이 밀렸거나 덜 나왔어요.",
    pkg: "표준 절차 390,000원",
  },
  {
    tier: "max",
    icon: "scale",
    title: "괴롭힘·해고·손해배상 협박을 받았어요",
    body: "노무사·일반 업체는 대리할 수 없는 분쟁이라 변호사가 직접 맡습니다.",
    pkg: "분쟁 대응 790,000원",
  },
];

// 사안별 자세한 안내 페이지 — 예전 #labor 카드가 걸던 링크를 그대로 둔다
const TOPICS = [
  { to: "/unfair-dismissal", label: "부당해고" },
  { to: "/unpaid-wages", label: "임금체불" },
  { to: "/severance-pay", label: "퇴직금 미지급" },
  { to: "/harassment", label: "직장 내 괴롭힘" },
  { to: "/small-business", label: "5인 미만 사업장" },
  { to: "/foreign-workers", label: "외국인 근로자(English)" },
];

type Props = {
  picked: TierId | null;
  onPick: (tier: TierId) => void;
};

export function Situations({ picked, onPick }: Props) {
  return (
    <section id="audience" style={{ background: "var(--paper)" }}>
      {/* 예전 #labor 앵커로 들어오는 링크(상단 메뉴·광고)를 받는다 */}
      <div id="labor" className="wrap">
        <div className="reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 28px" }}>
          <span className="eyebrow">내 상황 고르기</span>
          <h2 className="h2">
            어떤 <span className="mark-hl">상황이세요?</span>
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            고르시면 맞는 절차를 바로 아래 요금표에서 보여 드립니다.
          </p>
        </div>

        <div className="situ-grid reveal">
          {SITUATIONS.map((s) => (
            <button
              key={s.tier}
              type="button"
              className={`situ-card ${picked === s.tier ? "on" : ""}`}
              aria-pressed={picked === s.tier}
              onClick={() => onPick(s.tier)}
            >
              <span className="situ-icon">
                <Icon name={s.icon} size={24} strokeWidth={2.25} />
              </span>
              <span className="situ-title">{s.title}</span>
              <span className="situ-body">{s.body}</span>
              <span className="situ-pkg">
                {s.pkg} <Icon name="arrow" size={14} />
              </span>
            </button>
          ))}
        </div>

        <nav className="situ-topics reveal" aria-label="사안별 안내">
          <span>사안별 자세한 안내</span>
          {TOPICS.map((t) => (
            <a key={t.to} href={t.to}>
              {t.label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
