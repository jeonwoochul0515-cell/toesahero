import { useState } from "react";
import { saveConsultation } from "../firebase";

type CalcItem = {
  id: string;
  label: string;
  emoji: string;
  value: number;
  desc: string;
  example: string;
};

const items: CalcItem[] = [
  {
    id: "salary",
    label: "월급 못 받음",
    emoji: "💰",
    value: 2_400_000,
    desc: "체불임금 청구",
    example: "한 달치 평균",
  },
  {
    id: "severance",
    label: "퇴직금 못 받음",
    emoji: "🏦",
    value: 3_500_000,
    desc: "근로기준법 §34 미지급분",
    example: "1년 이상 근무",
  },
  {
    id: "annual",
    label: "연차수당 미지급",
    emoji: "🌴",
    value: 850_000,
    desc: "사용 못한 연차 환산",
    example: "10일 기준",
  },
  {
    id: "overtime",
    label: "야근수당 떼임",
    emoji: "🌙",
    value: 1_200_000,
    desc: "통상임금 1.5배 청구",
    example: "월 평균 30시간",
  },
  {
    id: "harass",
    label: "직장 내 괴롭힘",
    emoji: "🚨",
    value: 5_000_000,
    desc: "위자료 + 산재 신청",
    example: "사례별 차이",
  },
  {
    id: "ui",
    label: "실업급여 받기",
    emoji: "📨",
    value: 3_200_000,
    desc: "권고사직 처리 협상",
    example: "120일 기준",
  },
];

const fmt = new Intl.NumberFormat("ko-KR").format;

export function Calculator() {
  const [picked, setPicked] = useState<Set<string>>(
    new Set(["severance", "annual"])
  );

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total = items
    .filter((i) => picked.has(i.id))
    .reduce((a, b) => a + b.value, 0);

  const handleAsk = async () => {
    const pickedItems = items.filter((i) => picked.has(i.id)).map((i) => i.label);
    void saveConsultation({
      source: "form",
      message: "계산기에서 받을 수 있는지 문의",
      pickedItems,
      estimatedAmount: total,
    });
    window.dispatchEvent(new CustomEvent("open-chat"));
  };

  return (
    <section id="calc" style={{ background: "var(--ink)", color: "var(--cream)" }}>
      <div className="wrap">
        <div className="calc-grid">
          <div>
            <span className="eyebrow" style={{ color: "var(--yellow)" }}>
              Calculator
            </span>
            <h2 className="h2" style={{ color: "var(--cream)" }}>
              나도 모르게
              <br />
              <span style={{ color: "var(--yellow)" }}>떼이고 있던 돈</span>
              <br />
              계산기
            </h2>
            <p className="lead" style={{ color: "var(--gray-2)" }}>
              해당되는 거 체크만 하면 끝. 진짜 받을 수 있는지는 변호사가 무료로 봐드림.
            </p>
            <div className="calc-total">
              <div className="calc-total-label">예상 청구액</div>
              <div className="calc-total-value">
                <span className="amount-num">{fmt(total)}</span>
                <span className="amount-unit">원</span>
              </div>
              <div className="calc-total-note">
                <span className="dot-warn" />
                실제 결과는 사안에 따라 달라짐. 그래도 일단 받을 수 있는 건 받아야지.
              </div>
              <button
                className="btn yellow"
                style={{ marginTop: 20, width: "100%", fontSize: 16 }}
                onClick={handleAsk}
              >
                💬 이거 받을 수 있는지 물어보기
              </button>
            </div>
          </div>

          <div className="calc-list">
            {items.map((it) => {
              const on = picked.has(it.id);
              return (
                <button
                  key={it.id}
                  className={`calc-item ${on ? "on" : ""}`}
                  onClick={() => toggle(it.id)}
                >
                  <div className="calc-check">{on ? "✓" : ""}</div>
                  <div className="calc-emoji">{it.emoji}</div>
                  <div className="calc-info">
                    <div className="calc-label">{it.label}</div>
                    <div className="calc-desc">
                      {it.desc} · {it.example}
                    </div>
                  </div>
                  <div className="calc-value">+{fmt(it.value)}원</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
