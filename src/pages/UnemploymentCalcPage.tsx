// 실업급여(구직급여) 예상액 계산기 — 2026년 기준, 참고용 안내 + 상담 유도
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { saveConsultation } from "../firebase";
import { usePageMeta, breadcrumbJsonLd, faqJsonLd } from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";

// 검색·AI 답변엔진용 FAQ — 질문형 제목 + 두괄식 답. 화면과 JSON-LD에 1:1로 쓴다.
const FAQ_ITEMS = [
  {
    q: "실업급여는 한 달에 얼마나 받나요?",
    a: "1일 평균임금의 60%를 기준으로, 2026년은 하루 상한 68,100원과 하한 66,048원 사이에서 120~270일간 지급됩니다. 월로 환산하면 대략 198만~204만 원 수준이며, 정확한 금액은 월급과 가입기간에 따라 달라집니다.",
  },
  {
    q: "자발적 퇴사도 실업급여를 받을 수 있나요?",
    a: "원칙적으로는 받을 수 없지만, 2개월 이상 임금체불, 직장 내 괴롭힘, 통근 왕복 3시간 이상 등 정당한 이직 사유에 해당하면 자발적 퇴사여도 수급이 인정될 수 있습니다. 퇴사하기 전에 사유를 확인해 두는 것이 유리합니다.",
  },
  {
    q: "권고사직이면 실업급여를 받을 수 있나요?",
    a: "권고사직은 비자발적 이직이라 수급자격이 인정될 가능성이 높습니다. 다만 회사가 이직확인서에 적는 사유 코드에 따라 결과가 달라질 수 있어, 제출 전에 내용을 확인하는 것이 중요합니다.",
  },
  {
    q: "실업급여는 언제까지 신청해야 하나요?",
    a: "이직일 다음 날부터 12개월 안에만 받을 수 있습니다. 늦게 신청하면 남은 지급일수가 있어도 12개월이 지나는 순간 받지 못하므로, 퇴사 후 가능한 한 빨리 고용센터에 수급자격을 신청하는 것이 안전합니다.",
  },
];

// 실업급여를 못 받게 되는 원인은 대개 "내 퇴사 사유"가 아니라 "회사가 적은 사유"다.
// 광고(실업급여 검색)로 들어온 분 중 실제 의뢰인이 되는 분들이 여기 걸린다 — 2026-09-06 추가.
const COMPANY_BLOCKS = [
  { id: "self", label: "회사가 자진퇴사(개인사정)로 처리했다" },
  { id: "paper", label: "이직확인서를 안 주거나 계속 미룬다" },
  { id: "sick", label: "아파서 그만두는데 회사가 협조하지 않는다" },
  { id: "recommend", label: "권고사직인데 자발적 퇴사로 적었다" },
  { id: "bully", label: "괴롭힘 때문에 나왔는데 개인사정이라고 한다" },
];

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
  // 하한액 보정을 먼저 해 버리면 월급 0원에도 금액이 나온다. 값을 안 넣은 상태와
  // 계산한 상태를 구분한다(2026-09-12 점검 — 빈 화면에서 792만원이 나왔다).
  const hasInput = inputs.monthlySalary > 0;
  const dailyBenefit = hasInput
    ? Math.min(UPPER_LIMIT, Math.max(LOWER_LIMIT, rawDailyBenefit))
    : 0;
  const totalMonths = inputs.insuredYears * 12 + inputs.insuredMonths;
  const days = benefitDays(totalMonths, inputs.age);
  const total = dailyBenefit * days;
  // 고용보험 피보험단위기간이 180일에 못 미치면 수급 요건 자체가 서지 않는다.
  // 월 단위 입력이라 정확한 일수는 알 수 없으므로 6개월 미만을 경고 기준으로 쓴다.
  const monthsTooShort = totalMonths < 6;
  // 만 15세 미만·100세 초과는 입력 실수로 보고 계산하지 않는다.
  const ageInvalid = inputs.age < 15 || inputs.age > 100;
  const voluntary = inputs.reason === "voluntary";
  const likelyEligible = hasInput && !voluntary && !monthsTooShort && !ageInvalid;
  return {
    dailyBenefit,
    days,
    total,
    likelyEligible,
    totalMonths,
    hasInput,
    monthsTooShort,
    ageInvalid,
    voluntary,
  };
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
  // 입력한 글자를 그대로 보여 준다 — 0을 치면 빈칸이 되던 문제(2026-09-25).
  // 최댓값만 즉시 자른다. 최솟값은 치는 중간(예: 나이 "3"→"35")에 걸리므로 오류 문구만 띄운다.
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const [error, setError] = useState("");
  const input = (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={text}
      aria-invalid={error ? true : undefined}
      onChange={(e) => {
        const raw = e.target.value;
        let n = raw === "" ? 0 : Number(raw);
        if (!Number.isFinite(n)) n = 0;
        let shown = raw;
        let msg = "";
        if (max !== undefined && n > max) {
          n = max;
          shown = String(max);
          msg = `${fmt(max)} 이하로 입력해 주세요.`;
        } else if (min !== undefined && n < min) {
          if (min <= 0) {
            n = min;
            shown = raw === "" ? "" : String(min);
          }
          msg = `${fmt(min)} 이상으로 입력해 주세요.`;
        }
        setText(shown);
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
      "법률사무소 청송law",
    ],
    jsonLd: [
      breadcrumbJsonLd([
        { name: "홈", url: "/" },
        { name: "실업급여 계산기", url: "/unemployment-calc" },
      ]),
      faqJsonLd(FAQ_ITEMS),
    ],
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
  // 변호사가 회신할 연락처 — 미수집 시 신청이 들어와도 연락할 방법이 없어 필수로 받는다.
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  // 회사 쪽 사정으로 막힌 항목 — 하나라도 있으면 다툴 여지가 있어 상담으로 잇는다
  const [blocks, setBlocks] = useState<string[]>([]);
  const toggleBlock = (id: string) =>
    setBlocks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const result = useMemo(() => calc(inputs), [inputs]);

  const onChange = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const requestConsult = async () => {
    const name = applicantName.trim();
    const phone = applicantPhone.replace(/[^0-9]/g, "");
    if (!name) {
      alert("성함을 입력해 주세요. 변호사 회신에 필요합니다.");
      return;
    }
    if (!/^01[016789][0-9]{7,8}$/.test(phone)) {
      alert("휴대전화 번호를 확인해 주세요. (예: 010-1234-5678)");
      return;
    }
    setSubmitting(true);
    try {
      const id = await saveConsultation({
        source: "form",
        userName: name,
        contact: phone,
        // 회사가 적은 사유 때문에 막힌 분은 사건이 될 가능성이 높아 접수함에서 먼저 보이게 표시한다.
        message: `${blocks.length ? "[사건 후보 · 회사 사유 문제] " : ""}실업급여 계산기 결과: 1일 ${fmt(result.dailyBenefit)}원 × ${result.days}일 = 약 ${fmt(result.total)}원 예상 (퇴사 사유: ${
          { voluntary: "자발적 퇴사", boss_pressure: "권고사직", bullying: "직장 내 괴롭힘", layoff: "정리해고/계약만료", no_pay: "임금 체불" }[inputs.reason]
        })${
          blocks.length
            ? "\n[회사 쪽 사정] " +
              blocks
                .map((b) => COMPANY_BLOCKS.find((x) => x.id === b)?.label)
                .filter(Boolean)
                .join(" / ")
            : ""
        }`,
        estimatedAmount: result.total,
        meta: {
          tool: "unemployment-calc",
          monthlySalary: inputs.monthlySalary,
          age: inputs.age,
          insuredMonths: result.totalMonths,
          reason: inputs.reason,
          companyBlocks: blocks,
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
        {/* 광고로 들어온 첫 화면에 '변호사'가 한 번도 없었다(2026-09-15 점검). 누가 운영하는지 먼저 보인다. */}
        <p className="calc-lead" style={{ marginTop: 6 }}>
          법률사무소 청송law 담당변호사 김창희가 운영합니다. 회사가 퇴사 사유를 불리하게 적어 막히면
          변호사가 직접 확인합니다.{" "}
          <a href="tel:1660-4452">전화 1660-4452</a>
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
                max={100000000}
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
              {result.likelyEligible || !result.hasInput ? (
                <div className="calc-total">
                  {fmt(result.total)}<span>원</span>
                </div>
              ) : (
                <>
                  {/* 수급이 어려운 조건에서 큰 총액을 그대로 보이면 받을 수 있다고 오해한다. */}
                  <div className="calc-total" style={{ fontSize: 26 }}>
                    수급 요건 확인 필요
                  </div>
                  {!result.ageInvalid && (
                    <p className="calc-disclaimer">
                      요건을 갖춘 경우의 예상액: 약 {fmt(result.total)}원
                    </p>
                  )}
                </>
              )}
              {result.ageInvalid && (
                <p className="calc-warn">만 나이를 확인해 주세요(15~100세).</p>
              )}
              {!result.ageInvalid && inputs.age >= 65 && (
                <p className="calc-warn">
                  만 65세가 넘은 뒤 새로 고용된 경우에는 실업급여가 적용되지 않습니다.
                  65세 전부터 계속 일해 왔다면 받을 수 있습니다.
                  {/* TODO(변호사 확인): 고용보험법 §10② 적용 제외 안내 문구 */}
                </p>
              )}
              {!result.hasInput && (
                <p className="calc-warn">
                  월 평균 세전 급여를 넣으시면 예상액이 계산됩니다.
                </p>
              )}
              {result.hasInput && result.monthsTooShort && (
                <p className="calc-warn">
                  고용보험 가입기간이 짧습니다. 퇴직 전 18개월 안에 일한 날이 180일 이상이어야
                  받으실 수 있어, 지금 기간으로는 어려울 수 있습니다. 정확한 판단은 근무 형태와
                  가입 이력을 봐야 하니 1660-4452로 문의해 주십시오.
                </p>
              )}
              <p className="calc-disclaimer">
                ※ 1일 {fmt(result.dailyBenefit)}원 × {result.days}일(소정급여일수) 기준 단순 계산이며,
                실제 지급액과 다를 수 있습니다. 수급 가능 여부는 고용센터가 판단합니다.
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

              {/* 사유 문구는 사유로만 가른다 — 가입기간이 짧을 때 권고사직에도 "자발적 퇴사" 문구가 뜨던 문제. */}
              {!result.voluntary ? (
                <div className="calc-extra">
                  <Icon name="bulb" size={16} /> 입력하신 사유는 <strong>비자발적 이직</strong>에
                  해당할 수 있습니다. 이직확인서 사유 정정 등 확인이 필요합니다.
                </div>
              ) : (
                <div className="calc-extra" style={{ borderColor: "var(--orange)" }}>
                  <Icon name="warning" size={16} /> <strong>자발적 퇴사</strong>는 원칙적으로
                  수급자격이 제한됩니다. 다만 임금체불·괴롭힘·통근곤란 등{" "}
                  <strong>정당한 이직 사유(예외)</strong>에 해당하면 수급이 가능할 수 있고,
                  아직 퇴사 전이라면 퇴사 방식에 따라 결과가 달라질 수 있습니다.
                  <strong> 퇴사하기 전에 확인하는 것이 가장 유리합니다.</strong>
                </div>
              )}

              {/* 회사가 적은 사유 때문에 막힌 분을 여기서 골라낸다.
                  광고로 들어온 실업급여 검색자 중 실제 의뢰인이 되는 분들이다. */}
              <div className="calc-blocks">
                <strong className="calc-blocks-head">
                  회사 때문에 못 받게 되셨나요?
                </strong>
                <p className="calc-blocks-lead">
                  해당하는 것을 눌러 주세요. 이직확인서에 적힌 사유는 나중에 정정을
                  다툴 여지가 있습니다.
                </p>
                {COMPANY_BLOCKS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`calc-block${blocks.includes(b.id) ? " on" : ""}`}
                    onClick={() => toggleBlock(b.id)}
                    aria-pressed={blocks.includes(b.id)}
                  >
                    <span className="calc-block-mark" aria-hidden="true">
                      {blocks.includes(b.id) ? "✓" : ""}
                    </span>
                    {b.label}
                  </button>
                ))}
                {blocks.length > 0 && (
                  <p className="calc-blocks-hit">
                    선택하신 내용은 아래 상담 신청에 함께 전달됩니다. 변호사
                    김창희가 이직확인서 사유부터 확인해 드립니다.
                  </p>
                )}
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
                  />
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
                  />
                </label>
              </div>

              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 12, fontSize: 16, padding: 16 }}
                onClick={() => void requestConsult()}
                disabled={submitting}
              >
                {submitting
                  ? "접수 중..."
                  : blocks.length
                    ? <><Icon name="doc" size={16} /> 변호사에게 퇴사 사유 확인 요청</>
                    : <><Icon name="doc" size={16} /> 수급자격 확인 상담 신청</>}
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

        <section className="calc-aside-info" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>실업급여 자주 묻는 질문</h2>
          {FAQ_ITEMS.map((f) => (
            <div key={f.q} style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{f.q}</h3>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </section>

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
