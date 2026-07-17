// 실업급여(구직급여) 예상액 계산기 — 2026년 기준, 참고용 안내 + 상담 유도
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { saveConsultation } from "../firebase";
import { usePageMeta, breadcrumbJsonLd } from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";

const fmt = new Intl.NumberFormat("ko-KR").format;

// 2026년 기준 (고용노동부 고시) — 매년 최저임금 변동에 따라 바뀌므로 다음 시즌 갱신 필요
const UPPER_LIMIT = 68100; // 1일 상한액
const LOWER_LIMIT = 66048; // 1일 하한액 (2026년 최저임금 10,320원 × 80% × 8시간)

type Reason = "voluntary" | "boss_pressure" | "bullying" | "layoff" | "no_pay";

type Inputs = {
  monthlySalary: number;
  age: number;
  insuredYears: number;
  insuredMonths: number;
  reason: Reason;
};

// 소정급여일수 — 고용보험법 §50 별표1 (가입기간 × 연령)
function benefitDays(totalMonths: number, age: number): number {
  const is50plus = age >= 50;
  if (totalMonths < 12) return 120;
  if (totalMonths < 36) return is50plus ? 180 : 150;
  if (totalMonths < 60) return is50plus ? 210 : 180;
  if (totalMonths < 120) return is50plus ? 240 : 210;
  return is50plus ? 270 : 240;
}

function calc(inputs: Inputs) {
  const dailyWage = inputs.monthlySalary / 30;
  const rawDailyBenefit = Math.round(dailyWage * 0.6);
  const dailyBenefit = Math.min(UPPER_LIMIT, Math.max(LOWER_LIMIT, rawDailyBenefit));
  const totalMonths = inputs.insuredYears * 12 + inputs.insuredMonths;
  const days = benefitDays(totalMonths, inputs.age);
  const total = dailyBenefit * days;
  const likelyEligible = inputs.reason !== "voluntary";
  return { dailyBenefit, days, total, likelyEligible, totalMonths };
}

function NumField({
  label,
  value,
  onValue,
  min,
  max,
  step,
  unit,
  full,
}: {
  label: string;
  value: number;
  onValue: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  full?: boolean;
}) {
  const input = (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={value === 0 ? "" : value}
      onChange={(e) => onValue(e.target.value === "" ? 0 : Number(e.target.value))}
    />
  );
  return (
    <label className={full ? "full" : undefined}>
      {label}
      {unit ? (
        <div className="calc-input-with-unit">
          {input}
          <span>{unit}</span>
        </div>
      ) : (
        input
      )}
    </label>
  );
}

export function UnemploymentCalcPage() {
  const seo = usePageMeta({
    title: "실업급여 계산기 — 2026년 구직급여 예상액 조회",
    description:
      "월급·나이·고용보험 가입기간만 입력하면 2026년 기준 실업급여(구직급여) 예상액을 바로 확인합니다. 참고용 계산이며 정확한 수급자격은 변호사 상담으로 확인하세요.",
    canonical: "/unemployment-calc",
    keywords: [
      "실업급여계산기",
      "실업급여 계산기",
      "구직급여 계산기",
      "실업급여 조건",
      "실업급여 신청방법",
      "권고사직 실업급여",
      "퇴사대행",
      "법률사무소 청송",
    ],
    jsonLd: breadcrumbJsonLd([
      { name: "홈", url: "/" },
      { name: "실업급여 계산기", url: "/unemployment-calc" },
    ]),
  });

  const [inputs, setInputs] = useState<Inputs>({
    monthlySalary: 3000000,
    age: 35,
    insuredYears: 3,
    insuredMonths: 0,
    reason: "boss_pressure",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const result = useMemo(() => calc(inputs), [inputs]);

  const onChange = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const requestConsult = async () => {
    setSubmitting(true);
    try {
      const id = await saveConsultation({
        source: "form",
        message: `실업급여 계산기 결과: 1일 ${fmt(result.dailyBenefit)}원 × ${result.days}일 = 약 ${fmt(result.total)}원 예상`,
        estimatedAmount: result.total,
        meta: {
          tool: "unemployment-calc",
          monthlySalary: inputs.monthlySalary,
          age: inputs.age,
          insuredMonths: result.totalMonths,
          reason: inputs.reason,
        },
      });
      if (id) {
        setSubmitted(id);
      } else {
        alert("저장에 실패했습니다. 카카오톡 채널로 직접 문의해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("일시적인 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="calc-page">
        <header className="calc-header">
          <Link to="/" className="my-back">← 홈으로</Link>
        </header>
        <main className="calc-main">
          <div className="calc-success">
            <div className="calc-success-icon">✓</div>
            <h1 className="my-h1">상담 신청이 접수되었습니다</h1>
            <p>
              접수번호: <strong>#{submitted.slice(0, 8)}</strong>
              <br />
              변호사 김창희가 수급자격·이직확인서 처리 방향을 확인 후 안내드립니다.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
              <Link to="/my" className="btn primary">내 사건 진행 상황 보기</Link>
              <Link to="/" className="btn">홈으로</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="calc-page">
      {seo}
      <header className="calc-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="calc-title">실업급여 계산기</h1>
      </header>

      <main className="calc-main">
        <p className="calc-lead">
          월급·나이·고용보험 가입기간을 입력하면 2026년 기준 실업급여(구직급여) 예상액을 계산합니다.{" "}
          <strong>※ 실제 수급액·자격은 고용센터 심사로 최종 결정되며, 본 계산은 단순 참고용입니다.</strong>
        </p>

        <div className="calc-grid-page">
          <section className="calc-form">
            <h2>1. 기본 정보</h2>
            <div className="calc-fields">
              <NumField
                label="월급 (세전 · 이직 전 평균)"
                value={inputs.monthlySalary}
                onValue={(n) => onChange("monthlySalary", n)}
                min={0}
                step={100000}
                unit="원"
              />
              <NumField
                label="만 나이"
                value={inputs.age}
                onValue={(n) => onChange("age", n)}
                min={15}
                max={100}
              />
              <NumField
                label="고용보험 가입기간 (년)"
                value={inputs.insuredYears}
                onValue={(n) => onChange("insuredYears", n)}
                min={0}
                max={50}
              />
              <NumField
                label="가입기간 (개월 추가, 0~11)"
                value={inputs.insuredMonths}
                onValue={(n) => onChange("insuredMonths", n)}
                min={0}
                max={11}
              />
            </div>

            <h2>2. 퇴사 사유 (수급자격 판단)</h2>
            <div className="calc-fields">
              <label className="full">
                퇴사 사유
                <select
                  value={inputs.reason}
                  onChange={(e) => onChange("reason", e.target.value as Reason)}
                >
                  <option value="boss_pressure">권고사직</option>
                  <option value="bullying">직장 내 괴롭힘</option>
                  <option value="layoff">정리해고/계약만료</option>
                  <option value="no_pay">임금 체불 (2개월 이상)</option>
                  <option value="voluntary">자발적 퇴사</option>
                </select>
              </label>
            </div>
          </section>

          <aside className="calc-result">
            <div className="calc-result-card">
              <h3>예상 실업급여 총액</h3>
              <div className="calc-total">
                {fmt(result.total)}<span>원</span>
              </div>
              <p className="calc-disclaimer">
                ※ 1일 {fmt(result.dailyBenefit)}원 × {result.days}일(소정급여일수) 기준 단순 계산이며,
                실제 지급액과 다를 수 있습니다.
              </p>

              <ul className="calc-items">
                <li>
                  <span>1일 구직급여액</span>
                  <strong>{fmt(result.dailyBenefit)}원</strong>
                </li>
                <li>
                  <span>소정급여일수</span>
                  <strong>{result.days}일</strong>
                </li>
              </ul>

              {result.likelyEligible ? (
                <div className="calc-extra">
                  <Icon name="bulb" size={16} /> 입력하신 사유는 <strong>비자발적 이직</strong>에
                  해당해 수급자격 가능성이 있습니다. 이직확인서 사유 정정 등 확인이 필요합니다.
                </div>
              ) : (
                <div className="calc-extra" style={{ borderColor: "var(--orange)" }}>
                  <Icon name="warning" size={16} /> <strong>자발적 퇴사</strong>는 원칙적으로
                  수급자격이 제한됩니다. 정당한 이직 사유(예외)에 해당하는지 확인이 필요합니다.
                </div>
              )}

              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 18, fontSize: 16, padding: 16 }}
                onClick={() => void requestConsult()}
                disabled={submitting}
              >
                {submitting ? "접수 중..." : <><Icon name="doc" size={16} /> 수급자격 확인 상담 신청</>}
              </button>
              <div className="calc-fallback-cta">
                <a
                  href="https://pf.kakao.com/_zkzIX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn yellow"
                  style={{ width: "100%" }}
                >
                  <Icon name="chat" size={16} /> 카카오톡 채널에서 바로 상담
                </a>
              </div>
            </div>

            <div className="calc-aside-info">
              <h4>참고 산정 기준 (2026년)</h4>
              <ul>
                <li><strong>구직급여일액</strong>: 1일 평균임금(월급÷30) × 60%</li>
                <li><strong>상한액</strong>: 1일 68,100원</li>
                <li><strong>하한액</strong>: 1일 66,048원 (2026년 최저임금 기준)</li>
                <li><strong>소정급여일수</strong>: 가입기간·연령별 120~270일 (고용보험법 §50)</li>
                <li><strong>수급자격</strong>: 원칙적으로 비자발적 이직만 해당</li>
              </ul>
            </div>
          </aside>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/calc" className="btn" style={{ padding: "10px 16px", fontSize: 13 }}>
            <Icon name="calc" size={14} /> 퇴직금·연차수당 계산기
          </Link>
          <Link to="/resignation-letter" className="btn" style={{ padding: "10px 16px", fontSize: 13 }}>
            <Icon name="doc" size={14} /> 사직서 양식 받기
          </Link>
        </div>

        <div
          className="calc-foot"
          style={{ border: "3px solid var(--orange)", background: "var(--paper)", textAlign: "left" }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="warning" size={16} /> 이 계산 결과는 예상 참고치이며, 실제 수급액을 보장하지 않습니다
          </p>
          <p style={{ margin: 0 }}>
            실업급여(구직급여)의 실제 지급액과 수급 여부는 이직 사유·피보험단위기간·나이 등
            개인 사정을 고용센터가 최종 심사하여 결정합니다. 위 금액은 통상적인 계산식을 적용한
            단순 참고용 추정치이며, 실제 신청 결과·지급액과 차이가 있을 수 있습니다. 정확한 수급자격
            판단은 변호사 상담을 통해 확인하시기 바랍니다. 본 사이트는 변호사법 제23조에 따른
            광고물이며, 본 계산기는 일반적 정보 제공이지 법률 자문이 아닙니다.
          </p>
        </div>
      </main>
    </div>
  );
}
