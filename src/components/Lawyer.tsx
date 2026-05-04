import { Mascot } from "./Mascot";

const credentials = [
  "법률사무소 청송 대표 변호사",
  "가맹거래사 (이중 자격)",
  "동아대학교 법학전문대학원 겸임교수",
  "前 부산지방고용노동청 전문위원회 위원",
  "前 부산지방검찰청 형사조정위원",
  "前 부산가정법원 위탁보호위원",
  "공무원연금공단 법률상담변호사",
  "법제처 법제자문관",
];

export function Lawyer() {
  return (
    <section id="lawyer" style={{ background: "var(--paper)" }}>
      <div className="wrap">
        <div className="lawyer-grid reveal">
          <div className="lawyer-portrait">
            <div className="portrait-frame">
              <div className="portrait-bg">
                <span className="portrait-placeholder">
                  <span
                    style={{
                      fontFamily: "var(--font-en)",
                      fontSize: 12,
                      letterSpacing: ".1em",
                    }}
                  >
                    PORTRAIT
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    김창희 변호사 사진
                  </span>
                </span>
              </div>
              <div className="portrait-stamp">
                <Mascot size={70} pose="wink" />
              </div>
              <div className="portrait-tag">10년+ · 1,000건+</div>
            </div>
          </div>

          <div className="lawyer-info">
            <span className="eyebrow">Founder's Note</span>
            <h2 className="h2">
              "퇴사도 협상이고,
              <br />
              <span
                style={{
                  background: "var(--yellow)",
                  padding: "0 10px",
                  borderRadius: 6,
                  border: "2.5px solid var(--ink)",
                  boxShadow: "3px 3px 0 0 var(--ink)",
                  display: "inline-block",
                  transform: "rotate(-1deg)",
                }}
              >
                협상은 변호사 영역입니다.
              </span>
              "
            </h2>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--ink-2)",
              }}
            >
              안녕하세요. 김창희 변호사입니다.
              <br />
              10여 년간 1,000건 이상의 사건을 다루면서{" "}
              <strong>가장 자주 본 패턴은 '혼자 결정 내리시는 분들'</strong>이었습니다.
              특히 퇴사 단계에서는 절차에 대한 이해 없이 진행할 경우 근로자가 보장받을 수 있는 권리를 충분히 검토하지 못한 채 퇴직하게 되는 경우가 적지 않습니다.
              <br />
              <br />
              그래서{" "}
              <strong
                style={{
                  background: "var(--yellow-soft)",
                  padding: "1px 4px",
                }}
              >
                변호사가 처음부터 끝까지 직접 운영하는 퇴사 자문 서비스
              </strong>
              를 시작했습니다. 통보부터 사후 노동법 자문까지, 변호사 비밀유지 의무 하에 진행합니다.
            </p>
            <div className="lawyer-creds">
              {credentials.map((c, i) => (
                <span key={i} className="cred">
                  ✓ {c}
                </span>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://chang-hee.kim"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                변호사 프로필 보기 ↗
              </a>
              <a href="tel:1660-4452" className="btn primary">
                ☎ 1660-4452 직통
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
