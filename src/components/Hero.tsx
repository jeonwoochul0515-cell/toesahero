import { useEffect, useRef, useState } from "react";
import { Mascot } from "./Mascot";
import { Icon } from "./Icon";
import { BlurText } from "./BlurText";

export type HeroCopy = "boss" | "soft" | "legal";

type Props = {
  heroCopy?: HeroCopy;
  openChat: () => void;
};

const variants: Record<
  HeroCopy,
  { eyebrow: string; h1a: string; h1b: string; h1c: string; sub: string }
> = {
  boss: {
    eyebrow: "법률사무소 청송law · 변호사 직접 운영",
    h1a: "퇴사, 혼자",
    h1b: "결정하지 마세요",
    h1c: "변호사가 옆에서 같이 갑니다",
    sub: "10년간 1,000건. 겁내지 않아도 되는 이유를\n차근차근 알려드릴게요. 퇴사 통보부터 임금체불·부당해고까지 대신 다툽니다.",
  },
  soft: {
    eyebrow: "법률사무소 청송law · 변호사 직접 운영",
    h1a: "퇴사 말 꺼내기,",
    h1b: "많이 망설이셨죠",
    h1c: "이제 변호사와 함께.",
    sub: "받을 권리 하나도 놓치지 않게, 깔끔하게 마무리해드릴게요.\n퇴사부터 임금·연차수당·분쟁 대응까지 한 곳에서 이어갑니다.",
  },
  legal: {
    eyebrow: "법률사무소 청송law · 변호사 직접 운영",
    h1a: "퇴사도 협상입니다.",
    h1b: "협상은",
    h1c: "변호사가 맡을게요.",
    sub: "혼자 감정 소모하지 않으셔도 됩니다. 근로기준법에 근거해\n임금·연차수당·실업급여를 자문하고, 분쟁 시 고소·민사까지 함께합니다.",
  },
};

// 카톡창 스크롤 시퀀스(2026-09-15) — 카톡창이 화면에 붙은 채 스크롤한 만큼 대화가 한 단계씩 진행된다.
// 진행률(0~1)이 각 값을 넘으면 그 단계가 켜진다. 올리면 되감긴다.
// 0 첫 메시지 · 1 왜 안와 · 2 부재중 전화 · 3 손해배상 협박 · 4 느낌표 · 5 변호사 통보+도장 · 6 입력 중 · 7 읽음
// 결말은 "팀장 침묵"이다 — 회사가 물러선다는 결과를 보여 주지 않는다(변호사 광고규정, 결과 보장 금지).
const SEQ = [0, 0.08, 0.2, 0.34, 0.47, 0.6, 0.76, 0.9];
const LAST = SEQ.length - 1;

export function Hero({ heroCopy = "boss", openChat }: Props) {
  const v = variants[heroCopy] ?? variants.boss;
  const artRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const art = artRef.current;
    const pin = pinRef.current;
    const spacer = spacerRef.current;
    if (!art || !pin || !spacer) return;
    // 움직임 줄이기 — 고정 없이 완성된 대화를 바로 보여 준다(고정은 CSS가 푼다)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(LAST);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const pinTop = parseFloat(getComputedStyle(pin).top) || 0;
      // 카톡창이 붙기 전의 원래 자리. 이 자리가 붙는 위치를 지나 올라간 만큼이 진행 거리다.
      const natural = art.getBoundingClientRect().top + (parseFloat(getComputedStyle(art).paddingTop) || 0);
      const travel = spacer.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, (pinTop - natural) / travel));
      let s = 0;
      for (let i = 0; i < SEQ.length; i++) if (p >= SEQ[i]) s = i;
      setStep(s);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const on = (k: number) => (step >= k ? " on" : "");

  return (
    <section style={{ paddingTop: 60, paddingBottom: 100 }}>
      <div className="wrap">
        <div className="hero-grid seq">
          <div className="hero-text">
            <span className="pill" style={{ background: "var(--yellow)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "var(--orange)",
                  display: "inline-block",
                }}
              />
              {v.eyebrow}
            </span>
            <h1 className="h1">
              <span className="h1-line">
                <BlurText text={v.h1a} />
              </span>
              <span className="h1-line h1-highlight">
                <span className="h1-mark">
                  <BlurText text={v.h1b} delay={350} />
                </span>
              </span>
              <span className="h1-line">
                <BlurText text={v.h1c} delay={650} step={90} />
              </span>
            </h1>
            <p className="hero-sub">{v.sub}</p>
            <div className="hero-cta">
              <button
                className="btn primary"
                onClick={openChat}
                style={{ fontSize: 17, padding: "16px 26px" }}
              >
                <Icon name="chat" size={18} /> 카톡으로 문의
              </button>
              <a
                href="#pricing"
                className="btn yellow"
                style={{ fontSize: 17, padding: "16px 26px" }}
              >
                서비스 안내 →
              </a>
            </div>
            <p className="hero-free-note">
              <Icon name="check" size={14} /> 부담 갖지 마세요 — 카톡 문의 후 변호사가 직접 방향을 안내드립니다
            </p>
            <div className="hero-trust">
              <div className="trust-item">
                <strong>10년+</strong>
                <span>변호사 경력</span>
              </div>
              <div className="trust-item">
                <strong>1,000+</strong>
                <span>사건 처리</span>
              </div>
              <div className="trust-item">
                <strong>1660-4452</strong>
                <span>변호사 직통</span>
              </div>
            </div>
          </div>

          <div className="hero-art seq" ref={artRef}>
            <div className="hero-pin" ref={pinRef}>
              <div className="hero-card hero-phone">
                <div className="phone-head">
                  <div className="phone-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>예시 — 통보 메시지 시안</span>
                </div>
                <div className="phone-body">
                  <div className="msg boss seq-item on">
                    <span className="msg-name">팀장 (예시)</span>
                    <div className="msg-bub boss-bub">잠깐 회의실에서 얘기 좀</div>
                  </div>
                  <div className={`msg boss seq-item${on(1)}`}>
                    <div className="msg-bub boss-bub">왜 안와?</div>
                  </div>
                  <div className={`seq-item seq-missed${on(2)}`}>
                    <Icon name="phone" size={13} /> 부재중 전화 3통
                  </div>
                  <div className={`msg boss seq-item${on(3)}`}>
                    <div className="msg-bub boss-bub seq-threat">이렇게 나가면 손해배상 청구한다</div>
                  </div>
                  <div className={`msg boss seq-item${on(4)}`}>
                    <div className="msg-bub boss-bub">!!!!!</div>
                  </div>
                  <div className={`msg me seq-item${on(5)}`}>
                    <div className="msg-bub me-bub seq-notice">
                      <span className="seq-stamp" aria-hidden="true">
                        변호사
                        <br />
                        명의
                      </span>
                      <span style={{ fontWeight: 900 }}>[법률사무소 청송law]</span>
                      <br />
                      의뢰인의 퇴사 의사를 통보드립니다.
                      <br />이후 연락은 본 사무소로 부탁드립니다.
                    </div>
                    <span className={`seq-read${step >= LAST ? " on" : ""}`}>읽음</span>
                  </div>
                  <div className={`msg boss seq-typing${step === LAST - 1 ? " on" : ""}`} aria-hidden="true">
                    <div className="msg-bub boss-bub seq-typing-bub">
                      <span className="typ" />
                      <span className="typ" />
                      <span className="typ" />
                    </div>
                  </div>
                  <div className="msg-status">예시 화면</div>
                </div>
              </div>

              <div className="sticker sticker-1">
                <Mascot size={90} pose="fly" />
              </div>
              <div className="sticker sticker-2">
                <span
                  style={{
                    fontFamily: "var(--font-en)",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  LAW FIRM
                </span>
              </div>
              <div className="sticker sticker-3">
                변호사
                <br />
                운영
              </div>
            </div>
            {/* 이 높이만큼 스크롤하는 동안 카톡창이 붙어 있고 대화가 진행된다 */}
            <div className="seq-spacer" ref={spacerRef} aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
