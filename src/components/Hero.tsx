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
    eyebrow: "변호사가 직접 운영함 · 24시 대응",
    h1a: "사장님 얼굴",
    h1b: "보기 싫어서",
    h1c: "ㄹㅇ 못 나가는 중?",
    sub: "괜찮음. 우리가 대신 말해줌.\n변호사가 처음부터 끝까지 챙기는 진짜 퇴사대행.",
  },
  soft: {
    eyebrow: "변호사가 직접 운영함 · 24시 대응",
    h1a: "퇴사 말 꺼내기",
    h1b: "너무 힘들었지?",
    h1c: "이제 대신 해줄게.",
    sub: "혼자 끙끙대지 말고. 변호사가 옆에서 같이 가요.\n퇴사부터 못 받은 돈 받는 것까지.",
  },
  legal: {
    eyebrow: "변호사가 직접 운영함 · 24시 대응",
    h1a: "퇴사도 협상이다.",
    h1b: "근데 협상은",
    h1c: "변호사가 잘함.",
    sub: "감정 빼고, 법대로. 퇴직금·연차수당·실업급여까지\n받을 수 있는 거 다 받고 나갈 수 있게 도와드림.",
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
                💬 카톡으로 무료상담
              </button>
              <a
                href="#pricing"
                className="btn yellow"
                style={{ fontSize: 17, padding: "16px 26px" }}
              >
                얼마인지 보기 →
              </a>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <strong>4,200+</strong>
                <span>퇴사 도와드림</span>
              </div>
              <div className="trust-item">
                <strong>98%</strong>
                <span>당일 연락 끊김</span>
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
                <span>회사 단톡방</span>
              </div>
              <div className="phone-body">
                <div className="msg boss">
                  <span className="msg-name">팀장님</span>
                  <div className="msg-bub boss-bub">잠깐 회의실에서 얘기 좀 ㄱㄱ</div>
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
                    의뢰인 OOO님의 퇴사 의사를 통보드립니다.
                    <br />이후 모든 연락은 본 사무소로...
                  </div>
                </div>
                <div className="msg-status">전송됨 · 읽음 1</div>
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
                CASE CLOSED
              </span>
            </div>
            <div className="sticker sticker-3">
              합법
              <br />
              ㄹㅇ
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
