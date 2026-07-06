import { useState } from "react";
import { saveConsultation } from "../firebase";
import { Icon, type IconName } from "./Icon";

type CalcItem = {
  id: string;
  label: string;
  icon: IconName;
  value: number;
  desc: string;
  example: string;
};

const items: CalcItem[] = [
  {
    id: "salary",
    label: "월급 못 받음",
    icon: "coins",
    value: 2_400_000,
    desc: "체불임금 청구",
    example: "한 달치 평균",
  },
  {
    id: "severance",
    label: "퇴직금 못 받음",
    icon: "bank",
    value: 3_500_000,
    desc: "근로기준법 §34 미지급분",
    example: "1년 이상 근무",
  },
  {
    id: "annual",
    label: "연차수당 미지급",
    icon: "palm",
    value: 850_000,
    desc: "사용 못한 연차 환산",
    example: "10일 기준",
  },
  {
    id: "overtime",
    label: "야근수당 떼임",
    icon: "moon",
    value: 1_200_000,
    desc: "통상임금 1.5배 청구",
    example: "월 평균 30시간",
  },
  {
    id: "harass",
    label: "직장 내 괴롭힘",
    icon: "siren",
    value: 5_000_000,
    desc: "위자료 + 산재 신청",
    example: "사례별 차이",
  },
  {
    id: "ui",
    label: "실업급여 받기",
    icon: "mail",
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
      message: "체크리스트 기반 상담 요청",
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
              놓친 돈 체크
            </span>
            <h2 className="h2" style={{ color: "var(--cream)" }}>
              놓치고 있을 수 있는
              <br />
              <span style={{ color: "var(--yellow)" }}>청구 항목</span>
              <br />
              체크리스트
            </h2>
            <p className="lead" style={{ color: "var(--gray-2)" }}>
              간단 체크리스트로 놓친 청구 항목을 빠르게 확인하세요.{" "}
              <strong style={{ color: "var(--yellow)" }}>
                정확한 금액은 아래 '자동 계산기'에서
              </strong>{" "}
              월급·근속·지연이자까지 반영해 산정됩니다.
              <strong style={{ display: "block", marginTop: 8, color: "var(--yellow)", fontWeight: 800 }}>
                ※ 본 합산은 일반 예시값 기반 참고용이며 실제 청구액·결과를 보장하지 않습니다.
              </strong>
            </p>
            <div className="calc-total">
              <div className="calc-total-label">선택 항목 단순 합산 (참고용)</div>
              <div className="calc-total-value">
                <span className="amount-num">{fmt(total)}</span>
                <span className="amount-unit">원</span>
              </div>
              <div className="calc-total-note">
                <span className="dot-warn" />
                위 금액은 항목별 일반 예시값을 단순 합산한 참고 수치이며, 실제 청구 가능액은 사안별로 변호사 검토가 필요합니다.
              </div>
              <div className="calc-total-note">
                <Icon name="clock" size={13} />
                임금·퇴직금 청구권은 <strong style={{ color: "var(--ink)" }}>3년이 지나면 시효로 소멸</strong>합니다 (근로기준법 §49, 근로자퇴직급여보장법 §10).
              </div>
              <a
                href="/calc"
                className="btn"
                style={{
                  marginTop: 20,
                  width: "100%",
                  fontSize: 16,
                  display: "block",
                  textAlign: "center",
                  boxSizing: "border-box",
                  background: "var(--yellow)",
                  color: "var(--ink)",
                }}
              >
                <Icon name="calc" size={16} /> 정확한 금액 자동 계산하기{" "}
                <Icon name="arrow" size={16} />
              </a>
              <button
                className="btn"
                style={{
                  marginTop: 10,
                  width: "100%",
                  fontSize: 15,
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
                onClick={handleAsk}
              >
                <Icon name="chat" size={16} /> 변호사에게 상담 요청
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
                  <div className="calc-check">
                    {on ? <Icon name="check" size={16} /> : ""}
                  </div>
                  <div className="calc-emoji">
                    <Icon name={it.icon} size={24} strokeWidth={2.25} />
                  </div>
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
