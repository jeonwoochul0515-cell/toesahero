// 혼자 진행 vs 노무사·대행업체 vs 변호사 직접 운영 비교표 — 전환 유도용 섹션
import { Icon } from "./Icon";

type Level = "yes" | "warn" | "no";

type Row = {
  label: string;
  self: { level: Level; text: string };
  agent: { level: Level; text: string };
  lawyer: { level: Level; text: string };
};

const rows: Row[] = [
  {
    label: "회사에 통보",
    self: { level: "warn", text: "본인이 직접" },
    agent: { level: "warn", text: "업체 명의 (법적 효력 불분명)" },
    lawyer: { level: "yes", text: "법률사무소 명의 공식 통보" },
  },
  {
    label: "회사와 협상·교섭",
    self: { level: "no", text: "혼자 부담" },
    agent: { level: "no", text: "원칙적으로 불가 (변호사법 §109)" },
    lawyer: { level: "yes", text: "가능 (변호사 전속 사무)" },
  },
  {
    label: "손해배상·위약금 협박 대응",
    self: { level: "no", text: "대응 어려움" },
    agent: { level: "no", text: "대응 불가" },
    lawyer: { level: "yes", text: "계약서·사실관계 검토 후 대응" },
  },
  {
    label: "임금·퇴직금 체불 대응",
    self: { level: "warn", text: "노동청 직접 신고" },
    agent: { level: "warn", text: "진정서 작성만 가능, 소송 대리 불가" },
    lawyer: { level: "yes", text: "진정 자문 + 민사소송 대리 가능" },
  },
  {
    label: "분쟁 격화 시 고소·형사 대응",
    self: { level: "no", text: "불가" },
    agent: { level: "no", text: "불가 (위반 시 처벌 대상)" },
    lawyer: { level: "yes", text: "가능" },
  },
  {
    label: "분쟁 커지면 담당자 교체",
    self: { level: "warn", text: "해당 사항 없음" },
    agent: { level: "no", text: "변호사에게 재위임 필요 (이중 비용·시간)" },
    lawyer: { level: "yes", text: "처음부터 끝까지 같은 사무소" },
  },
];

function Cell({ level, text }: { level: Level; text: string }) {
  const iconName = level === "yes" ? "check" : level === "warn" ? "warning" : "x";
  return (
    <div className={`cmp-cell cmp-${level}`}>
      <Icon name={iconName} size={15} strokeWidth={3} />
      <span>{text}</span>
    </div>
  );
}

export function Compare() {
  return (
    <section id="compare" style={{ background: "var(--paper)" }}>
      <div className="wrap">
        <div className="reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 40px" }}>
          <span className="eyebrow">비교해보세요</span>
          <h2 className="h2">
            혼자 vs 노무사 vs{" "}
            <span className="mark-hl orange">변호사 직접 운영</span>
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            분쟁이 격화될수록 대리·교섭·고소는 변호사 전속 사무입니다 (변호사법 §109).
          </p>
        </div>

        <div className="cmp-table reveal">
          <div className="cmp-row cmp-head">
            <div className="cmp-label" />
            <div className="cmp-col-head">혼자 진행</div>
            <div className="cmp-col-head">노무사 · 일반 대행업체</div>
            <div className="cmp-col-head cmp-col-pop">
              법률사무소 청송
              <span>변호사 직접</span>
            </div>
          </div>
          {rows.map((r, i) => (
            <div className="cmp-row" key={i}>
              <div className="cmp-label">{r.label}</div>
              <Cell {...r.self} />
              <Cell {...r.agent} />
              <div className="cmp-cell-pop">
                <Cell {...r.lawyer} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
