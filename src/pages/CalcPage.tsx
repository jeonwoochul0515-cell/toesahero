import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveNoticeConsultation } from "../firebase";
import { usePageMeta, breadcrumbJsonLd, faqJsonLd } from "../hooks/usePageMeta";
import { PrivacyConsent } from "../components/PrivacyConsent";
import { PAYMENT_COPY } from "../config/payment";
import { Icon } from "../components/Icon";

// 검색·AI 답변엔진용 FAQ — 질문형 제목 + 두괄식 답. 화면과 JSON-LD에 1:1로 쓴다.
const FAQ_ITEMS = [
  {
    q: "퇴직금은 어떻게 계산하나요?",
    a: "퇴직 직전 3개월 평균임금 30일분에 근속연수를 곱해 계산합니다. 4주 평균 주 15시간 이상, 1년 이상 근무했다면 5인 미만 사업장을 포함한 모든 사업장에서 청구할 수 있고, 정기 상여금이 있다면 평균임금에 포함해 더 커질 수 있습니다.",
  },
  {
    q: "회사가 퇴직금을 안 주면 어떻게 하나요?",
    a: "퇴직일부터 14일 안에 지급하지 않으면 연 20%의 지연이자가 붙습니다. 내용증명으로 지급을 요구해 기록을 남기고, 그래도 주지 않으면 노동청 진정이나 민사 청구로 나아갈 수 있습니다.",
  },
  {
    q: "밀린 월급은 언제까지 청구할 수 있나요?",
    a: "임금채권의 소멸시효는 3년입니다. 오래된 체불분부터 순서대로 청구할 수 없게 되므로, 체불이 시작됐다면 미루지 말고 빨리 조치하는 것이 좋습니다.",
  },
  {
    q: "5인 미만 사업장인데 연차수당도 받을 수 있나요?",
    a: "연차수당과 연장근로 가산수당은 상시 5인 이상 사업장에만 적용됩니다. 다만 퇴직금과 밀린 월급, 지연이자, 실제 일한 야근 시간의 기본 임금(1.0배)은 5인 미만 사업장이라도 청구할 수 있습니다.",
  },
];

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
  employed: boolean; // 지금도 재직 중 — 지연이자 기산점과 퇴직금 지연이자 여부가 달라진다
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
  // 1일 평균임금 = 퇴직 전 3개월 임금 총액(월급×3 + 연간상여금×3/12) ÷ 그 기간 총일수(92일로 근사).
  // 퇴직금 = 1일 평균임금 × 30 × 근속연수. 예전 "월급 × 근속연수"는 약간 과대 산정됐다(개선 지시서 4-5).
  // 대략치 표기는 대표 확인(2026-09-25).
  const threeMonthWages = monthlySalary * 3 + ((inputs.annualBonus || 0) * 3) / 12;
  const avgDailyWage = threeMonthWages / 92;
  const severance =
    inputs.severanceUnpaid && totalYears >= 1
      ? Math.round(avgDailyWage * 30 * totalYears)
      : 0;

  // 미사용 연차수당 — 근기법 §60: 상시 5인 이상만. 통상일급 × 미사용일수
  const annualLeave = is5plus ? dailyWage * (inputs.unusedAnnualLeave || 0) : 0;

  // 연장근로수당 — 근기법 §56: 가산분(0.5배)은 상시 5인 이상만. 5인 미만도 실제 일한 시간의
  // 기본 1.0배는 임금이라 청구할 수 있다(개선 지시서 4-3). 통상시급 × 배율 × 시간 × 개월
  // 근거: 시행령 별표1에 §56 없음(가산 미적용), §43 전액 지급은 적용. 노동부 해석 근로기준정책과-2668(2022.8.26)
  //   — 5인 미만도 소정근로시간은 1일 8시간 범위라 그 초과분은 소정근로 밖의 근로다.
  const overtimePerMonth = Math.round(
    hourlyWage * (is5plus ? 1.5 : 1.0) * (inputs.monthlyOvertimeHours || 0)
  );
  const overtimeTotal = overtimePerMonth * (inputs.overtimeMonths || 0);

  // 미지급 임금(체불) — 전 사업장. 월급 × 체불 개월 (임금채권 시효 3년)
  const unpaidSalary = monthlySalary * (inputs.unpaidSalaryMonths || 0);

  // 지연이자(지연손해금) — 근기법 §37, 연 20%. 법제처 원문 확인(2026-09-25).
  // - 밀린 월급·야근수당(정기 임금, §43): 월급날 다음 날부터(§37①2호). 그 뒤 퇴직해도
  //   월급날 기준을 그대로 쓴다(§37②). 2025.10.23 시행, 그 뒤 월급날이 지난 임금부터 적용(부칙 §2).
  // - 퇴직금·퇴직 때 정산하는 연차수당(§36 금품 청산): 퇴직 후 14일이 지난 다음 날부터(§37①1호).
  // - 재직 중이면 퇴직금은 아직 지급 사유가 없어 뺀다. 재직 중 연차수당은 정기 임금으로 본다.
  const elapsedDays = (inputs.delayMonths || 0) * 30;
  const wageBase = unpaidSalary + overtimeTotal + (inputs.employed ? annualLeave : 0);
  const exitBase = inputs.employed ? 0 : severance + annualLeave;
  const delayInterest = Math.round(
    (0.2 / 365) * (wageBase * elapsedDays + exitBase * Math.max(0, elapsedDays - 14))
  );

  // 퇴직금을 체크했지만 1년 미만이라 빠진 경우 (안내용)
  const severanceUnder1y = inputs.severanceUnpaid && totalMonths > 0 && totalYears < 1;

  // 5인 미만이라 제외된 항목이 입력돼 있는지 (안내용)
  const excludedBySize =
    !is5plus &&
    ((inputs.unusedAnnualLeave || 0) > 0 || (inputs.monthlyOvertimeHours || 0) > 0);
  const overtimeBaseOnly = !is5plus && (inputs.monthlyOvertimeHours || 0) > 0;

  return {
    dailyWage,
    hourlyWage,
    totalYears,
    severance,
    annualLeave,
    overtimeTotal,
    unpaidSalary,
    delayInterest,
    severanceUnder1y,
    is5plus,
    excludedBySize,
    overtimeBaseOnly,
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
  // min/max를 실제로 강제한다 — 음수·범위 초과가 합계에 그대로 들어가던 문제(2026-09-25).
  const [error, setError] = useState("");
  const input = (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={value === 0 ? "" : value}
      aria-invalid={error ? true : undefined}
      onChange={(e) => {
        const raw = e.target.value === "" ? 0 : Number(e.target.value);
        let n = Number.isFinite(raw) ? raw : 0;
        let msg = "";
        if (min !== undefined && n < min) {
          n = min;
          msg = `${fmt(min)} 이상으로 입력해 주세요.`;
        } else if (max !== undefined && n > max) {
          n = max;
          msg = `${fmt(max)} 이하로 입력해 주세요.`;
        }
        setError(msg);
        onValue(n);
      }}
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
      {error && <span className="calc-field-err">{error}</span>}
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
      "법률사무소 청송law",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "홈", url: "/" },
        { name: "자동 계산기", url: "/calc" },
      ]),
      faqJsonLd(FAQ_ITEMS),
    ],
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
    employed: false,
    companySize: "under30",
  });
  const [submitting, setSubmitting] = useState(false);
  // id가 null이면 DB 저장은 실패했지만 사무실 문자로 접수가 전달된 경우다.
  const [submitted, setSubmitted] = useState<{ id: string | null } | null>(null);
  // 변호사가 회신할 연락처 — 미수집 시 신청이 들어와도 연락할 방법이 없어 필수로 받는다.
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  // alert는 앱 안 브라우저에서 막히기도 해 "눌러도 반응 없음"이 됐다 — 칸 아래에 적는다.
  const [nameErr, setNameErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const result = useMemo(() => calc(inputs), [inputs]);

  const items: Array<{ id: string; label: string; amount: number; show: boolean }> = [
    {
      id: "severance",
      label: "퇴직금 (대략치)",
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
    // 입력값 검증 — 월급 단위(원) 오입력으로 수십억대 엉터리 합산이 저장되는 것을 차단
    if (inputs.monthlySalary > 100_000_000) {
      alert(
        "월급 입력값을 확인해 주세요. 원 단위로 입력합니다 (예: 월 300만원 → 3000000)."
      );
      return;
    }
    if (total > 1_000_000_000) {
      alert(
        "합산액이 10억원을 넘습니다. 월급·상여금 입력값(원 단위)을 다시 확인해 주세요."
      );
      return;
    }
    const name = applicantName.trim();
    const phone = applicantPhone.replace(/[^0-9]/g, "");
    const nErr = name ? "" : "성함을 입력해 주세요. 변호사 회신에 필요합니다.";
    const pErr = /^01[016789][0-9]{7,8}$/.test(phone)
      ? ""
      : "휴대전화 번호를 확인해 주세요. (예: 010-1234-5678)";
    setNameErr(nErr);
    setPhoneErr(pErr);
    if (nErr || pErr || !privacyAgreed) return;
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
      }개월(지연이자), 재직 여부: ${inputs.employed ? "재직 중" : "퇴직"}, 회사 규모: ${inputs.companySize}`;
      const computedItems = visibleItems.map((i) => ({
        label: i.label,
        amount: i.amount,
      }));

      // 초안 생성이 접수를 막지 않게 한다(2026-09-13).
      // 신호가 나빠 응답이 안 오면 예전에는 "생성 중..."이 무한히 돌고 접수도 못 됐다.
      // 20초가 지나면 초안 없이 접수부터 남긴다.
      let noticeLetter = "";
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        try {
          const noticeResp = await fetch("/api/notice", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ factSummary, items: computedItems }),
            signal: controller.signal,
          });
          if (noticeResp.ok) {
            const data = (await noticeResp.json()) as { text?: string };
            noticeLetter = data.text ?? "";
          }
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        console.warn("[calc] notice draft failed", e);
      }
      if (!noticeLetter) {
        noticeLetter =
          "(자동 초안 생성 실패. 변호사가 사실관계를 직접 확인 후 작성합니다.)\n\n" +
          factSummary +
          "\n\n청구 항목:\n" +
          computedItems.map((i) => `- ${i.label}: ${fmt(i.amount)}원`).join("\n");
      }

      const { id, notified } = await saveNoticeConsultation({
        noticeLetter,
        computedItems,
        computedTotal: total,
        factSummary,
        userName: name,
        contact: phone,
      });
      if (id || notified) {
        // 저장은 실패해도 사무실에 문자가 닿았다면 접수는 살아 있다.
        setSubmitted({ id });
      } else {
        alert(
          "접수를 전달하지 못했습니다. 잠시 후 다시 시도하시거나 카카오톡 채널로 문의해 주세요."
        );
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
              {submitted.id ? (
                <>
                  접수번호: <strong>#{submitted.id.slice(0, 8)}</strong>
                  <br />
                </>
              ) : null}
              변호사 김창희가 사실관계 확인 + 내용증명 1차 초안 검토 후 안내드립니다.
            </p>
            {submitted.id ? null : (
              <p className="calc-note">
                지금 접수 내용은 사무실로 바로 전달됐습니다. 다만 일시적인 문제로
                화면에서 진행 상황을 보시는 기능은 이번 건에 연결되지 않았습니다.
                안내는 적어 주신 번호로 드립니다.
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
              {submitted.id ? (
                <Link to="/my" className="btn primary">
                  내 사건 진행 상황 보기
                </Link>
              ) : null}
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
                max={100000000}
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
                max={500000000}
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
              <label
                className="full"
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={inputs.employed}
                  onChange={(e) => onChange("employed", e.target.checked)}
                  style={{ width: "auto" }}
                />
                지금도 이 회사에 다니고 있다 (지연이자 계산 기준이 달라집니다)
              </label>
            </div>

            <h2>3. 사안 정보</h2>
            <div className="calc-fields">
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
                  <Icon name="warning" size={16} /> <strong>상시 5인 미만 사업장</strong>은 연차수당(근기법 §60)이
                  적용되지 않아 합산에서 뺐습니다.
                  {result.overtimeBaseOnly && (
                    <> 야근수당은 가산분(0.5배) 없이 실제 일한 시간의 기본 임금(1.0배)만 넣었습니다.</>
                  )}
                  <strong> 퇴직금·체불임금은 5인 미만도 청구 가능</strong>합니다.
                </div>
              )}

              {result.severanceUnder1y && (
                <div className="calc-extra" style={{ borderColor: "var(--orange)" }}>
                  <Icon name="warning" size={16} /> 근속이 <strong>1년 미만</strong>이라
                  퇴직금 대상이 아니어서 합산에서 뺐습니다(근퇴법 §4·§8).
                </div>
              )}

              <div className="calc-extra">
                <Icon name="bulb" size={16} /> 실업급여는 회사가 아니라 고용보험에서 받는 돈이라
                여기 합계에 넣지 않습니다.{" "}
                <Link to="/unemployment-calc" style={{ color: "inherit", fontWeight: 800 }}>
                  실업급여 계산기에서 따로 확인하기 →
                </Link>
              </div>

              <div className="calc-fields" style={{ marginTop: 18 }}>
                <label className="full" style={{ color: "var(--cream)" }}>
                  성함 (필수)
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="홍길동"
                    autoComplete="name"
                    aria-invalid={nameErr ? true : undefined}
                  />
                  {nameErr && <span className="calc-field-err">{nameErr}</span>}
                </label>
                <label className="full" style={{ color: "var(--cream)" }}>
                  휴대전화 (필수 · 변호사 회신용)
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    autoComplete="tel"
                    aria-invalid={phoneErr ? true : undefined}
                  />
                  {phoneErr && <span className="calc-field-err">{phoneErr}</span>}
                </label>
              </div>
              <PrivacyConsent checked={privacyAgreed} onChange={setPrivacyAgreed} dark />

              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 12, fontSize: 16, padding: 16 }}
                onClick={() => void requestNotice()}
                disabled={submitting || visibleItems.length === 0 || !privacyAgreed}
              >
                {submitting ? (
                  "1차 초안 생성 중..."
                ) : (
                  <>
                    <Icon name="doc" size={16} /> 변호사 검토 신청 (1차 초안 자동 생성)
                  </>
                )}
              </button>
              <p className="calc-cta-note">
                돈을 받아내는 일은 "표준 절차" 패키지(390,000원)에 해당할 수 있습니다.
                {PAYMENT_COPY.howToPay}
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
                  <strong>퇴직금</strong>: 1일 평균임금(퇴직 전 3개월 임금 총액 ÷ 그 기간
                  일수) × 30 × 근속연수. 근퇴법 §8 — 1년 이상·전 사업장. 여기 금액은 대략치
                </li>
                <li>
                  <strong>지연이자</strong>: <strong>연 20%</strong>. 밀린 월급은 월급날 다음
                  날부터(퇴직한 뒤에도 같음), 퇴직금과 퇴직 때 받을 연차수당은 퇴직 후 14일이 지난
                  다음 날부터 붙습니다(근기법 §37). 월급날 기준은 2025.10.23 이후 밀린 월급부터
                  적용됩니다. 지연이자는 보통 민사(지급명령·소송)로 청구합니다
                </li>
                <li>
                  <strong>연차수당</strong>: 통상일급 × 미사용일수 (일급 = 월급 ÷
                  209 × 8). 근기법 §60 — <strong>5인 이상만</strong>
                </li>
                <li>
                  <strong>야근수당</strong>: 통상시급 × 1.5 × 야근시간. 근기법 §56
                  — 가산(0.5배)은 <strong>5인 이상만</strong>, 5인 미만은 1.0배
                </li>
                <li>
                  <strong>임금체불</strong>: 월급 × 미지급 개월. 임금채권 시효 3년
                </li>
                <li>
                  <strong>5인 미만 사업장</strong>: 연차수당·가산분 미적용 /
                  퇴직금·체불임금·야근 기본임금은 적용
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <section className="calc-aside-info" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>퇴직금·임금체불 자주 묻는 질문</h2>
          {FAQ_ITEMS.map((f) => (
            <div key={f.q} style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{f.q}</h3>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </section>

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/unemployment-calc" className="btn" style={{ padding: "10px 16px", fontSize: 13 }}>
            <Icon name="calc" size={14} /> 실업급여 계산기
          </Link>
          <Link to="/resignation-letter" className="btn" style={{ padding: "10px 16px", fontSize: 13 }}>
            <Icon name="doc" size={14} /> 사직서 양식 받기
          </Link>
        </div>

        <p className="calc-foot">
          <Icon name="lock" size={14} /> 입력하신 정보는 암호화된 서버에 보관되며, 법률사무소 청송law만 열람하고
          변호사 비밀유지 의무에 따라 처리됩니다. 본 사이트는 변호사법 제23조에 따른 광고물이며, 본
          계산기는 일반적 정보 제공이지 법률 자문이 아닙니다.
        </p>
      </main>
    </div>
  );
}
