// 3~5문항 셀프 진단으로 사안을 분류해 패키지를 자동 추천하고 결제/상담으로 연결하는 페이지
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveConsultation } from "../firebase";
import { usePageMeta } from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";

type Tier = "basic" | "pro" | "max";

const PKG: Record<Tier, { name: string; price: number; desc: string }> = {
  basic: { name: "기본 절차", price: 199000, desc: "통보·연락 응대 (분쟁 없음 가정)" },
  pro: { name: "표준 절차", price: 390000, desc: "임금·퇴직금·연차수당 청구 통합" },
  max: { name: "분쟁 대응", price: 790000, desc: "괴롭힘·부당해고·손배 등 변호사 전속 사무" },
};

type Q = { key: string; label: string; options: { value: string; label: string }[] };

const QUESTIONS: Q[] = [
  {
    key: "status",
    label: "1. 현재 상태가 어떻게 되시나요?",
    options: [
      { value: "working", label: "아직 재직 중" },
      { value: "left", label: "이미 퇴사함" },
    ],
  },
  {
    key: "issue",
    label: "2. 가장 가까운 상황을 골라주세요.",
    options: [
      { value: "notice", label: "통보·연락이 어렵다 (분쟁은 없음)" },
      { value: "unpaid", label: "임금·퇴직금·수당을 못 받았다" },
      { value: "harass", label: "직장 내 괴롭힘을 겪고 있다" },
      { value: "unfair", label: "부당해고·권고사직 압박을 받는다" },
      { value: "damage", label: "회사가 손해배상·위약금으로 협박한다" },
    ],
  },
  {
    key: "money",
    label: "3. 못 받은 임금·퇴직금·수당이 있나요?",
    options: [
      { value: "yes", label: "있다" },
      { value: "no", label: "없다" },
      { value: "unknown", label: "잘 모르겠다" },
    ],
  },
  {
    key: "react",
    label: "4. 회사의 반응은 어떤가요?",
    options: [
      { value: "ok", label: "원만히 수리하는 분위기" },
      { value: "refuse", label: "회유하거나 거부한다" },
      { value: "ghost", label: "연락이 닿지 않는다" },
      { value: "threat", label: "위협·압박을 한다" },
    ],
  },
  {
    key: "urgency",
    label: "5. 얼마나 급하신가요?",
    options: [
      { value: "now", label: "당장 (며칠 내)" },
      { value: "soon", label: "2주 내" },
      { value: "flex", label: "여유 있음" },
    ],
  },
];

function recommend(a: Record<string, string>): { tier: Tier; reason: string; damageThreat: boolean } {
  const damageThreat = a.issue === "damage";
  // 분쟁(변호사 전속) 신호 우선
  if (["harass", "unfair", "damage"].includes(a.issue) || a.react === "threat") {
    return {
      tier: "max",
      reason:
        "괴롭힘·부당해고·손해배상 협박 등은 노무사·일반 업체가 대리할 수 없는 변호사 전속 영역입니다. 사실관계·증거를 변호사가 직접 검토해 대응합니다.",
      damageThreat,
    };
  }
  // 미지급 금원 → 표준
  if (a.money === "yes" || a.issue === "unpaid") {
    return {
      tier: "pro",
      reason:
        "미지급 임금·퇴직금·수당 청구가 필요한 사안입니다. 서류 검토·금액 산정·교섭·노동청 진정까지 통합 대응합니다.",
      damageThreat,
    };
  }
  // 단순 통보
  return {
    tier: "basic",
    reason:
      "분쟁 없이 퇴직 의사 통보와 회사 응대가 핵심인 사안입니다. 변호사 명의 공식 통보로 마무리합니다.",
    damageThreat,
  };
}

export function DiagnosePage() {
  const nav = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof recommend> | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const seo = usePageMeta({
    title: "셀프 진단 — 내 사안에 맞는 퇴사대행 패키지 찾기",
    description:
      "몇 가지 질문에 답하면 통보·임금청구·분쟁대응 중 내 상황에 맞는 절차를 변호사 기준으로 안내해 드립니다.",
    canonical: "/diagnose",
    keywords: [
      "퇴사대행 진단",
      "퇴사대행 비용",
      "퇴사 절차 진단",
      "변호사 퇴사대행",
      "퇴사대행",
      "권고사직",
      "부당해고",
      "임금체불",
    ],
  });

  const allAnswered = QUESTIONS.every((q) => answers[q.key]);

  const submit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    const r = recommend(answers);
    const pickedItems = QUESTIONS.map((q) => {
      const opt = q.options.find((o) => o.value === answers[q.key]);
      return `${q.label.replace(/^\d+\.\s*/, "")} → ${opt?.label ?? ""}`;
    });
    try {
      const id = await saveConsultation({
        source: "form",
        message: `셀프 진단 결과: ${PKG[r.tier].name} 추천`,
        pickedItems,
        meta: { recommendedTier: r.tier, urgency: answers.urgency },
        ...(r.damageThreat ? { damageThreat: true } : {}),
      });
      setCaseId(id);
    } catch {
      // 저장 실패해도 결과는 보여준다
    }
    setResult(r);
    setSubmitting(false);
  };

  const goCheckout = () => {
    if (!result) return;
    const path = caseId
      ? `/checkout/${caseId}?pkg=${result.tier}`
      : `/checkout?pkg=${result.tier}`;
    nav(path);
  };

  return (
    <div className="page-static">
      {seo}
      <header className="page-static-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="page-static-title">셀프 진단</h1>
        <p className="page-static-sub">
          몇 가지 질문에 답하시면 변호사 기준으로 맞는 절차를 안내해 드립니다.
        </p>
      </header>

      <main className="page-static-main" style={{ maxWidth: 640 }}>
        {!result ? (
          <>
            {QUESTIONS.map((q) => (
              <div key={q.key} style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 800, marginBottom: 10 }}>{q.label}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((o) => {
                    const active = answers[q.key] === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setAnswers((s) => ({ ...s, [q.key]: o.value }))}
                        style={{
                          textAlign: "left",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "2px solid var(--ink)",
                          background: active ? "var(--yellow)" : "var(--paper)",
                          fontWeight: active ? 800 : 500,
                          cursor: "pointer",
                          boxShadow: active ? "3px 3px 0 0 var(--ink)" : "none",
                        }}
                      >
                        {active ? "✓ " : ""}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              className="btn primary"
              style={{ width: "100%", padding: 16, fontSize: 16, marginTop: 8 }}
              onClick={() => void submit()}
              disabled={!allAnswered || submitting}
            >
              {submitting ? "분석 중..." : allAnswered ? "진단 결과 보기" : "모든 항목을 선택해 주세요"}
            </button>
          </>
        ) : (
          <div className="reveal in">
            <div
              style={{
                padding: "22px",
                border: "2.5px solid var(--ink)",
                borderRadius: 14,
                background: "var(--paper)",
                boxShadow: "4px 4px 0 0 var(--ink)",
              }}
            >
              <span className="eyebrow">추천 절차</span>
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: "6px 0 4px" }}>
                {PKG[result.tier].name}
              </h2>
              <p style={{ color: "var(--muted)", margin: "0 0 12px" }}>
                {PKG[result.tier].desc}
              </p>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 14 }}>
                {PKG[result.tier].price.toLocaleString("ko-KR")}원
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}> / 1건</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{result.reason}</p>
              {result.damageThreat && (
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                  <Icon name="scale" size={14} /> 손해배상·위약금 협박 대응은 변호사 전속 영역입니다. 위축되지 마세요.
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
              <button className="btn primary" style={{ padding: 15 }} onClick={goCheckout}>
                이 절차로 위임 진행 / 결제 안내 →
              </button>
              <a
                href="https://pf.kakao.com/_zkzIX"
                target="_blank"
                rel="noopener noreferrer"
                className="btn yellow"
                style={{ padding: 15, textAlign: "center" }}
              >
                <Icon name="chat" size={16} /> 카톡으로 먼저 상담하기
              </a>
              <button
                className="btn"
                style={{ padding: 12 }}
                onClick={() => {
                  setResult(null);
                  setCaseId(null);
                }}
              >
                다시 진단하기
              </button>
            </div>

            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18, lineHeight: 1.6 }}>
              본 진단은 일반적 정보 제공이며 법률 자문이 아닙니다. 정확한 안내는 변호사 상담이
              필요합니다. 본 사이트는 변호사법 제23조에 따른 광고물입니다.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
