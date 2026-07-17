import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveNoticeConsultation } from "../firebase";
import { usePageMeta, breadcrumbJsonLd } from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";

const fmt = new Intl.NumberFormat("ko-KR").format;

type Inputs = {
  monthlySalary: number; // 월급 (세전)
  yearsWorked: number; // 근속 연수
  monthsWorked: number; // 추가 개월 (0~11)
  severanceUnpaid: boolean; // 퇴직금 미지급 여부 (근속연수 기반 일시금)
  annualBonus: number; // 연간 상여금 총액 (평균임금 산입 — 퇴직금 정확화)
  unusedAnnualLeave: number; // 미사용 연차일수
  monthlyOvertimeHours: number; // 월 평균 야근시간
  overtimeMonths: number; // 야근수당 미지급 기간(개월)
  unpaidSalaryMonths: number; // 체불(미지급) 월급 개월수
  delayMonths: number; // 미지급 후 경과 개월 (지연이자 §37, 연 20%)
  reason: "voluntary" | "boss_pressure" | "bullying" | "layoff" | "no_pay";
  companySize: "under5" | "under30" | "under300" | "over300";
};

function calc(inputs: Inputs) {
  const { monthlySalary, yearsWorked, monthsWorked, companySize } = inputs;
  // 상시 5인 미만 사업장은 연차수당(근기법 §60)·연장근로 가산수당(§56) 법정 적용 제외
  const is5plus = companySize !== "under5";

  // 통상임금 기준 시급/일급 (월 소정근로 209시간, 1일 8시간)
  const hourlyWage = monthlySalary > 0 ? Math.round(monthlySalary / 209) : 0;
  const dailyWage = monthlySalary > 0 ? Math.round((monthlySalary / 209) * 8) : 0;

  // 근속 총 개월/연수
  const totalMonths = yearsWorked * 12 + monthsWorked;
  const totalYears = totalMonths / 12;

  // 퇴직금 — 근로자퇴직급여 보장법 §8: 1년 이상 근속 시 전 사업장 적용.
  // 평균임금 기준(통상임금 아님). 월급 + 연간상여금 월할(/12)로 평균임금 근사.
  const avgMonthlyWage = monthlySalary + Math.round((inputs.annualBonus || 0) / 12);
  const severance =
    inputs.severanceUnpaid && totalYears >= 1
      ? Math.round(avgMonthlyWage * totalYears)
      : 0;

  // 미사용 연차수당 — 근기법 §60: 상시 5인 이상만. 통상일급 × 미사용일수
  const annualLeave = is5plus ? dailyWage * (inputs.unusedAnnualLeave || 0) : 0;

  // 연장근로 가산수당 — 근기법 §56: 상시 5인 이상만 1.5배 가산. 통상시급 × 1.5 × 시간 × 개월
  const overtimePerMonth = is5plus
    ? Math.round(hourlyWage * 1.5 * (inputs.monthlyOvertimeHours || 0))
    : 0;
  const overtimeTotal = overtimePerMonth * (inputs.overtimeMonths || 0);

  // 미지급 임금(체불) — 전 사업장. 월급 × 체불 개월 (임금채권 시효 3년)
  const unpaidSalary = monthlySalary * (inputs.unpaidSalaryMonths || 0);

  // 지연이자(지연손해금) — 근기법 §37: 미지급 14일 경과분에 연 20%. (퇴직금·체불임금 등)
  const owedBase = unpaidSalary + overtimeTotal + severance + annualLeave;
  const delayDays = Math.max(0, (inputs.delayMonths || 0) * 30 - 14);
  const delayInterest = Math.round(owedBase * 0.2 * (delayDays / 365));

  // 실업급여 — 비자발적 사유(권고사직·괴롭힘·정리해고·2개월+ 체불)
  const eligibleUI =
    inputs.reason === "boss_pressure" ||
    inputs.reason === "bullying" ||
    inputs.reason === "layoff" ||
    inputs.reason === "no_pay";

  // 5인 미만이라 제외된 항목이 입력돼 있는지 (안내용)
  const excludedBySize =
    !is5plus &&
    ((inputs.unusedAnnualLeave || 0) > 0 || (inputs.monthlyOvertimeHours || 0) > 0);

  return {
    dailyWage,
    hourlyWage,
    totalYears,
    severance,
    annualLeave,
    overtimeTotal,
    unpaidSalary,
    delayInterest,
    eligibleUI,
    is5plus,
    excludedBySize,
  };
}

// 숫자 입력 — 0이면 빈칸으로 보여 삭제 시 0이 남지 않게 한다.
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

export function CalcPage() {
  const nav = useNavigate();

  const seo = usePageMeta({
    title: "퇴직금·연차수당 계산기 — 임금 자동 계산",
    description:
      "월급·근속·미사용 연차·야근시간만 입력하면 퇴직금·연차수당·미지급 임금을 자동 산정합니다. 변호사가 검토하는 1차 자료입니다.",
    canonical: "/calc",
    keywords: [
      "퇴직금 계산기",
      "연차수당 계산기",
      "야근수당 계산기",
      "미지급 임금",
      "미지급 임금 계산",
      "통상임금",
      "임금체불",
      "권고사직 실업급여",
      "퇴사대행",
      "변호사 검토",
      "법률사무소 청송",
    ],
    jsonLd: breadcrumbJsonLd([
      { name: "홈", url: "/" },
      { name: "자동 계산기", url: "/calc" },
    ]),
  });
  const [inputs, setInputs] = useState<Inputs>({
    monthlySalary: 3000000,
    yearsWorked: 2,
    monthsWorked: 0,
    severanceUnpaid: true,
    annualBonus: 0,
    unusedAnnualLeave: 5,
    monthlyOvertimeHours: 20,
    overtimeMonths: 0,
    unpaidSalaryMonths: 0,
    delayMonths: 0,
    reason: "voluntary",
    companySize: "under30",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const result = useMemo(() => calc(inputs), [inputs]);

  const items: Array<{ id: string; label: string; amount: number; show: boolean }> = [
    {
      id: "severance",
      label: "퇴직금",
      amount: result.severance,
      show: result.severance > 0,
    },
    {
      id: "annual",
      label: "미사용 연차수당",
      amount: result.annualLeave,
      show: result.annualLeave > 0,
    },
    {
      id: "overtime",
      label: "미지급 야근수당",
      amount: result.overtimeTotal,
      show: result.overtimeTotal > 0,
    },
    {
      id: "unpaid",
      label: "미지급 임금 (체불)",
      amount: result.unpaidSalary,
      show: inputs.unpaidSalaryMonths > 0,
    },
    {
      id: "delay",
      label: "지연이자 (연 20% · 근기법 §37)",
      amount: result.delayInterest,
      show: result.delayInterest > 0,
    },
  ];
  const visibleItems = items.filter((i) => i.show);
  const total = visibleItems.reduce((a, b) => a + b.amount, 0);

  const onChange = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const requestNotice = async () => {
    if (visibleItems.length === 0) {
      alert("청구 항목이 없습니다. 입력값을 확인해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      // AI 내용증명 생성 호출
      const factSummary = `월급 ${fmt(inputs.monthlySalary)}원, 근속 ${
        inputs.yearsWorked
      }년 ${inputs.monthsWorked}개월, 퇴직금 미지급: ${
        inputs.severanceUnpaid ? "예" : "아니오"
      }, 미사용 연차 ${inputs.unusedAnnualLeave}일, 월 평균 야근 ${
        inputs.monthlyOvertimeHours
      }시간 × 미지급 ${inputs.overtimeMonths}개월, 체불 월급 ${
        inputs.unpaidSalaryMonths
      }개월, 연간 상여금 ${fmt(inputs.annualBonus)}원, 미지급 경과 ${
        inputs.delayMonths
      }개월(지연이자), 퇴사 사유: ${inputs.reason}, 회사 규모: ${inputs.companySize}`;
      const computedItems = visibleItems.map((i) => ({
        label: i.label,
        amount: i.amount,
      }));

      const noticeResp = await fetch("/api/notice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ factSummary, items: computedItems }),
      });
      let noticeLetter = "";
      if (noticeResp.ok) {
        const data = (await noticeResp.json()) as { text?: string };
        noticeLetter = data.text ?? "";
      }
      if (!noticeLetter) {
        noticeLetter =
          "(AI 초안 생성 실패. 변호사가 사실관계를 직접 확인 후 작성합니다.)\n\n" +
          factSummary +
          "\n\n청구 항목:\n" +
          computedItems.map((i) => `- ${i.label}: ${fmt(i.amount)}원`).join("\n");
      }

      const id = await saveNoticeConsultation({
        noticeLetter,
        computedItems,
        computedTotal: total,
        factSummary,
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
            <h1 className="my-h1">검토 신청이 접수되었습니다</h1>
            <p>
              접수번호: <strong>#{submitted.slice(0, 8)}</strong>
              <br />
              변호사 김창희가 사실관계 확인 + 내용증명 1차 초안 검토 후 안내드립니다.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
              <Link to="/my" className="btn primary">
                내 사건 진행 상황 보기
              </Link>
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
        <h1 className="calc-title">미지급 항목 자동 계산기</h1>
      </header>

      <main className="calc-main">
        <p className="calc-lead">
          입력하신 정보를 바탕으로 청구 가능성이 있는 항목과 금액을 자동
          합산합니다. <strong>※ 본 합계는 단순 참고용이며 실제 청구
          가능액·결과를 보장하지 않습니다.</strong> 정확한 산정은 변호사
          검토 후 안내됩니다.
        </p>

        <div className="calc-grid-page">
          <section className="calc-form">
            <h2>1. 기본 정보</h2>
            <div className="calc-fields">
              <NumField
                label="월급 (세전 · 통상임금 기준)"
                value={inputs.monthlySalary}
                onValue={(n) => onChange("monthlySalary", n)}
                min={0}
                step={100000}
                unit="원"
              />
              <NumField
                label="근속 (년)"
                value={inputs.yearsWorked}
                onValue={(n) => onChange("yearsWorked", n)}
                min={0}
                max={50}
              />
              <NumField
                label="근속 (개월 추가, 0~11)"
                value={inputs.monthsWorked}
                onValue={(n) => onChange("monthsWorked", n)}
                min={0}
                max={11}
              />
              <label
                className="full"
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={inputs.severanceUnpaid}
                  onChange={(e) => onChange("severanceUnpaid", e.target.checked)}
                  style={{ width: "auto" }}
                />
                퇴직금 미지급 (1년 이상 근속 시 · 근속연수 기반 일시금)
              </label>
              <NumField
                label="연간 상여금 총액 (퇴직금 평균임금 산입 · 선택)"
                value={inputs.annualBonus}
                onValue={(n) => onChange("annualBonus", n)}
                min={0}
                step={100000}
                unit="원"
                full
              />
            </div>

            <h2>2. 청구 가능 항목</h2>
            <div className="calc-fields">
              <NumField
                label="미사용 연차일수"
                value={inputs.unusedAnnualLeave}
                onValue={(n) => onChange("unusedAnnualLeave", n)}
                min={0}
                max={25}
              />
              <NumField
                label="월 평균 야근시간"
                value={inputs.monthlyOvertimeHours}
                onValue={(n) => onChange("monthlyOvertimeHours", n)}
                min={0}
                max={200}
              />
              <NumField
                label="야근수당 미지급 기간 (개월)"
                value={inputs.overtimeMonths}
                onValue={(n) => onChange("overtimeMonths", n)}
                min={0}
                max={36}
              />
              <NumField
                label="체불(미지급) 월급 개월수"
                value={inputs.unpaidSalaryMonths}
                onValue={(n) => onChange("unpaidSalaryMonths", n)}
                min={0}
                max={36}
              />
              <NumField
                label="미지급 후 경과 (개월 · 지연이자)"
                value={inputs.delayMonths}
                onValue={(n) => onChange("delayMonths", n)}
                min={0}
                max={36}
              />
            </div>

            <h2>3. 사안 정보</h2>
            <div className="calc-fields">
              <label className="full">
                퇴사 사유 (실업급여 자격 판단)
                <select
                  value={inputs.reason}
                  onChange={(e) =>
                    onChange("reason", e.target.value as Inputs["reason"])
                  }
                >
                  <option value="voluntary">자발적 퇴사</option>
                  <option value="boss_pressure">권고사직</option>
                  <option value="bullying">직장 내 괴롭힘</option>
                  <option value="layoff">정리해고/계약만료</option>
                  <option value="no_pay">임금 체불 (2개월 이상)</option>
                </select>
              </label>
              <label className="full">
                회사 규모
                <select
                  value={inputs.companySize}
                  onChange={(e) =>
                    onChange(
                      "companySize",
                      e.target.value as Inputs["companySize"]
                    )
                  }
                >
                  <option value="under5">5인 미만</option>
                  <option value="under30">5~30인</option>
                  <option value="under300">30~300인</option>
                  <option value="over300">300인 이상</option>
                </select>
              </label>
            </div>
          </section>

          <aside className="calc-result">
            <div className="calc-result-card">
              <h3>검토 가능 항목 합산</h3>
              <div className="calc-total">
                {fmt(total)}<span>원</span>
              </div>
              <p className="calc-disclaimer">
                ※ 단순 참고용 합계입니다. 실제 청구 가능액·결과를 보장하지
                않습니다. 변호사가 사실관계 + 근로계약서·임금명세서 검토 후
                정확한 액수를 안내합니다.
              </p>

              <ul className="calc-items">
                {visibleItems.length === 0 ? (
                  <li className="calc-empty">
                    입력 정보로는 청구 가능 항목이 없습니다.
                  </li>
                ) : (
                  visibleItems.map((it) => (
                    <li key={it.id}>
                      <span>{it.label}</span>
                      <strong>+{fmt(it.amount)}원</strong>
                    </li>
                  ))
                )}
              </ul>

              {result.excludedBySize && (
                <div className="calc-extra" style={{ borderColor: "var(--orange)" }}>
                  <Icon name="warning" size={16} /> <strong>상시 5인 미만 사업장</strong>은 연차수당(근기법 §60)·
                  연장근로 가산수당(§56)이 법정 적용되지 않아 합산에서 제외했습니다.
                  <strong> 퇴직금·체불임금은 5인 미만도 청구 가능</strong>합니다.
                </div>
              )}

              {result.eligibleUI && (
                <div className="calc-extra">
                  <Icon name="bulb" size={16} /> 입력하신 사유로 <strong>실업급여 신청 가능성</strong>이
                  있습니다. 권고사직 처리·이직확인서 사유 정정 등 변호사
                  자문이 필요합니다.
                </div>
              )}

              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 18, fontSize: 16, padding: 16 }}
                onClick={() => void requestNotice()}
                disabled={submitting || visibleItems.length === 0}
              >
                {submitting ? (
                  "AI 1차 초안 생성 중..."
                ) : (
                  <>
                    <Icon name="doc" size={16} /> 변호사 검토 신청 (AI 1차 초안 자동 생성)
                  </>
                )}
              </button>
              <p className="calc-cta-note">
                "표준 절차" 패키지(390,000원) 위임은 변호사 검토 후 안내됩니다.
              </p>
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
              <h4>참고 산정 기준 (근로기준법·근퇴법)</h4>
              <ul>
                <li>
                  <strong>퇴직금</strong>: 30일분 <strong>평균임금</strong>(월급+상여
                  월할) × 근속연수. 근퇴법 §8 — 1년 이상·전 사업장
                </li>
                <li>
                  <strong>지연이자</strong>: 미지급 14일 경과분에 <strong>연 20%</strong>.
                  근기법 §37 (2025.10 재직 중 정기임금까지 확대)
                </li>
                <li>
                  <strong>연차수당</strong>: 통상일급 × 미사용일수 (일급 = 월급 ÷
                  209 × 8). 근기법 §60 — <strong>5인 이상만</strong>
                </li>
                <li>
                  <strong>야근수당</strong>: 통상시급 × 1.5 × 야근시간. 근기법 §56
                  — <strong>5인 이상만</strong> 가산
                </li>
                <li>
                  <strong>임금체불</strong>: 월급 × 미지급 개월. 임금채권 시효 3년
                </li>
                <li>
                  <strong>5인 미만 사업장</strong>: 연차수당·가산수당 미적용 /
                  퇴직금·체불임금은 적용
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/unemployment-calc" className="btn" style={{ padding: "10px 16px", fontSize: 13 }}>
            <Icon name="calc" size={14} /> 실업급여 계산기
          </Link>
          <Link to="/resignation-letter" className="btn" style={{ padding: "10px 16px", fontSize: 13 }}>
            <Icon name="doc" size={14} /> 사직서 양식 받기
          </Link>
        </div>

        <p className="calc-foot">
          <Icon name="lock" size={14} /> 입력하신 정보는 Firebase에 안전하게 저장되며, 변호사 비밀유지 의무
          하에 처리됩니다. 본 사이트는 변호사법 제23조에 따른 광고물이며, 본
          계산기는 일반적 정보 제공이지 법률 자문이 아닙니다.
        </p>
      </main>
    </div>
  );
}
