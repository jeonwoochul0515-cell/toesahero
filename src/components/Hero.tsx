import { Mascot } from "./Mascot";

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
    eyebrow: "법률사무소 청송 · 변호사 직접 운영",
    h1a: "사장님 얼굴",
    h1b: "보기 싫어서",
    h1c: "못 나가는 중?",
    sub: "변호사가 처음부터 끝까지 챙기는 퇴사대행.\n법률사무소 청송 김창희 변호사 운영.",
  },
  soft: {
    eyebrow: "법률사무소 청송 · 변호사 직접 운영",
    h1a: "퇴사 말 꺼내기",
    h1b: "어려우셨다면",
    h1c: "변호사와 함께.",
    sub: "혼자 결정 내리지 마세요. 변호사가 옆에서 같이 갑니다.\n퇴사부터 노동법 자문까지.",
  },
  legal: {
    eyebrow: "법률사무소 청송 · 변호사 직접 운영",
    h1a: "퇴사도 협상이다.",
    h1b: "협상은",
    h1c: "변호사 영역.",
    sub: "감정 빼고, 법대로. 근로기준법에 근거한\n퇴직금·연차수당·실업급여 자문까지.",
  },
};

export function Hero({ heroCopy = "boss", openChat }: Props) {
  const v = variants[heroCopy] ?? variants.boss;

  return (
    <section style={{ paddingTop: 60, paddingBottom: 100 }}>
      <div className="wrap">
        <div className="hero-grid">
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
              <span className="h1-line">{v.h1a}</span>
              <span className="h1-line h1-highlight">
                <span className="h1-mark">{v.h1b}</span>
              </span>
              <span className="h1-line">{v.h1c}</span>
            </h1>
            <p className="hero-sub">{v.sub}</p>
            <div className="hero-cta">
              <button
                className="btn primary"
                onClick={openChat}
                style={{ fontSize: 17, padding: "16px 26px" }}
              >
                💬 카톡으로 문의
              </button>
              <a
                href="#pricing"
                className="btn yellow"
                style={{ fontSize: 17, padding: "16px 26px" }}
              >
                서비스 안내 →
              </a>
            </div>
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

          <div className="hero-art">
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
                <div className="msg boss">
                  <span className="msg-name">팀장 (예시)</span>
                  <div className="msg-bub boss-bub">잠깐 회의실에서 얘기 좀</div>
                </div>
                <div className="msg boss">
                  <div className="msg-bub boss-bub">왜 안와?</div>
                </div>
                <div className="msg boss">
                  <div className="msg-bub boss-bub">!!!!!</div>
                </div>
                <div className="msg me">
                  <div className="msg-bub me-bub">
                    <span style={{ fontWeight: 900 }}>[법률사무소 청송]</span>
                    <br />
                    의뢰인의 퇴사 의사를 통보드립니다.
                    <br />이후 연락은 본 사무소로 부탁드립니다.
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
        </div>
      </div>
    </section>
  );
}
