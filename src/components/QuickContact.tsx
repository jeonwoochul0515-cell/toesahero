// 광고 첫 화면용 짧은 연락 칸(이름·전화·한 줄 상황) — 기존 상담 접수 경로(saveConsultationDetailed → /api/notify → 중앙 접수함)로 보낸다
import { useState } from "react";
import { saveConsultationDetailed } from "../firebase";
import { NAVER_CONV, naverConversion } from "../lib/naverWcs";
import { PrivacyConsent } from "./PrivacyConsent";

type Props = {
  // 접수함·문자에서 어느 화면의 빠른 칸인지 알아보는 이름(예: "권고사직 화면")
  pageLabel: string;
  title: string;
  placeholder: string;
};

// 2026-10-15 광고 점검: 광고 방문자가 접수하려면 다른 화면(/diagnose)으로 가서 5문항을 거쳐야 했고,
// 지난주 그 화면으로 넘어간 광고 방문자는 0명이었다. 첫 화면에서 바로 남길 수 있게 한다.
export function QuickContact({ pageLabel, title, placeholder }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [situation, setSituation] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string | null } | null>(null);

  const submit = async () => {
    if (submitting) return;
    const n = name.trim();
    const p = phone.replace(/[^0-9]/g, "");
    if (!n) {
      setError("성함을 입력해 주세요. 변호사 회신에 필요합니다.");
      return;
    }
    if (!/^01[016789][0-9]{7,8}$/.test(p)) {
      setError("휴대전화 번호를 확인해 주세요. (예: 010-1234-5678)");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해 주셔야 접수됩니다.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const s = situation.trim().slice(0, 300);
      const { id, notified } = await saveConsultationDetailed({
        source: "form",
        userName: n,
        contact: p,
        message: `[첫 화면 빠른 상담 · ${pageLabel}] ${s || "(상황 미입력)"}`,
        meta: {
          tool: "quick-contact",
          page: typeof window !== "undefined" ? window.location.pathname : "",
        },
      });
      // 저장(DB)이나 알림(문자·접수함) 중 하나라도 됐을 때만 접수 완료라고 말한다.
      if (id || notified) {
        void naverConversion(NAVER_CONV.lead);
        setDone({ id });
      } else {
        setError("접수가 확인되지 않았습니다. 전화 1660-4452 또는 카카오톡 채널로 연락해 주세요.");
      }
    } catch {
      setError("일시적인 오류가 발생했습니다. 전화 1660-4452 또는 카카오톡 채널로 연락해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="quick-contact" aria-live="polite">
        <p className="quick-contact-title">상담 신청이 접수되었습니다</p>
        <p className="quick-contact-sub">
          {done.id ? <>접수번호 #{done.id.slice(0, 8)} · </> : null}
          법률사무소 청송law 담당변호사 김창희가 확인한 뒤 남겨 주신 번호로 연락드립니다.
          급하시면 <a href="tel:1660-4452">1660-4452</a>로 전화 주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="quick-contact">
      <p className="quick-contact-title">{title}</p>
      <p className="quick-contact-sub">
        성함과 전화번호를 남기시면 법률사무소 청송law 담당변호사 김창희가 연락드립니다.
      </p>
      <div className="quick-contact-row">
        <label>
          성함
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            autoComplete="name"
            maxLength={50}
          />
        </label>
        <label>
          휴대전화
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            autoComplete="tel"
            maxLength={20}
          />
        </label>
      </div>
      <label className="quick-contact-full">
        지금 상황 한 줄 (선택)
        <input
          type="text"
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder={placeholder}
          maxLength={300}
        />
      </label>
      <PrivacyConsent checked={agreed} onChange={setAgreed} />
      {error ? (
        <p className="quick-contact-err" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn primary quick-contact-btn"
        onClick={() => void submit()}
        disabled={submitting}
      >
        {submitting ? "접수 중..." : "변호사에게 연락 요청"}
      </button>
    </section>
  );
}
