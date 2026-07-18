import { Mascot } from "./Mascot";
import { Icon } from "./Icon";

type Props = {
  openChat: () => void;
};

export function Footer({ openChat }: Props) {
  return (
    <>
      <section
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          padding: "100px 0",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Mascot size={120} pose="wave" />
          </div>
          <h2
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 900,
              letterSpacing: "-.03em",
              lineHeight: 1.05,
              margin: "0 0 18px",
            }}
          >
            퇴사 절차,
            <br />
            <span className="mark-hl">변호사와 함께.</span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--gray-2)",
              margin: "0 auto 36px",
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            카톡으로 문의 주시면 영업일 기준 변호사가 직접 답변드립니다.
            <br />
            권리 행사부터 분쟁 대응까지 변호사 비밀유지 의무 하에 진행합니다.
          </p>
          <div
            style={{
              display: "inline-flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              className="btn yellow"
              style={{ fontSize: 17, padding: "16px 28px" }}
              onClick={openChat}
            >
              <Icon name="chat" size={18} /> 카톡으로 문의
            </button>
            <a
              href="tel:1660-4452"
              className="btn"
              style={{
                fontSize: 17,
                padding: "16px 28px",
                background: "var(--paper)",
              }}
            >
              <Icon name="phone" size={18} /> 1660-4452
            </a>
          </div>
        </div>
        <div className="bg-goodbye">GOODBYE</div>
      </section>

      <footer
        style={{
          background: "var(--cream)",
          borderTop: "2.5px solid var(--ink)",
          padding: "40px 0 30px",
        }}
      >
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <Mascot size={32} pose="stand" />
                <strong style={{ fontSize: 18, fontWeight: 900 }}>퇴사히어로</strong>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                변호사가 직접 운영하는
                <br />
                합법 퇴사대행 서비스
              </p>
            </div>
            <div>
              <strong className="foot-h">서비스</strong>
              <a href="/diagnose">셀프 진단</a>
              <a href="#pricing">서비스 안내 (보수)</a>
              <a href="/harassment">직장 내 괴롭힘</a>
              <a href="/small-business">5인 미만 사업장</a>
              <a href="/foreign-workers">For foreign workers</a>
              <a href="#lawyer">변호사 소개</a>
            </div>
            <div>
              <strong className="foot-h">법률사무소 청송</strong>
              <a
                href="https://chang-hee.kim"
                target="_blank"
                rel="me noopener noreferrer"
                title="법률사무소 청송 김창희 변호사 공식 홈페이지"
              >
                공식 홈페이지 (chang-hee.kim) ↗
              </a>
              <a
                href="https://pf.kakao.com/_zkzIX"
                target="_blank"
                rel="noopener noreferrer"
                title="카카오톡 채널 상담"
              >
                카카오톡 채널 ↗
              </a>
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                title="GA4 대시보드 바로가기"
              >
                GA4 바로가기 ↗
              </a>
              <a href="tel:1660-4452">
                <Icon name="phone" size={13} /> 1660-4452
              </a>
              <a href="mailto:lawchungsong@daum.net">lawchungsong@daum.net</a>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                부산 연제구 법원남로15번길 10, 202호
              </span>
            </div>
            <div>
              <strong className="foot-h">법적 고지</strong>
              <a href="/terms">이용약관</a>
              <a href="/privacy">개인정보처리방침</a>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                변호사법 제23조에 따른 광고물
              </span>
            </div>
          </div>
          <div className="foot-bottom">
            <span>
              © 2026 법률사무소 청송. 변호사 김창희. 대한변호사협회 등록.
            </span>
            <span>
              본 서비스는 법률사무소 청송(
              <a
                href="https://chang-hee.kim"
                target="_blank"
                rel="me noopener noreferrer"
              >
                chang-hee.kim
              </a>
              )이 운영합니다.
            </span>
            <span>이 사이트는 변호사법에 따른 광고물입니다.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
