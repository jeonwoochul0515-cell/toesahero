import { Mascot } from "./Mascot";
import { Icon } from "./Icon";

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
              <div className="portrait-photo">
                <img
                  src="/lawyer-changhee.webp"
                  alt="법률사무소 청송 김창희 변호사"
                  width={480}
                  height={600}
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="portrait-stamp">
                <Mascot size={70} pose="wink" />
              </div>
              <div className="portrait-tag">10년+ 변호사 경력</div>
            </div>
          </div>

          <div className="lawyer-info">
            <span className="eyebrow">변호사 인사말</span>
            <h2 className="h2">
              "퇴사도 협상이고,
              <br />
              <span className="mark-hl">협상은 변호사 영역입니다.</span>"
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
              를 시작했습니다. <strong>노무사·일반 업체가 「변호사법 제109조」에 따라 다룰 수 없는 분쟁 영역(고소·민사 청구·형사 검토)</strong>까지 변호사가 직접 책임지는 것이 본 서비스의 핵심입니다. 변호사 비밀유지 의무 적용.
            </p>
            <div className="lawyer-creds">
              {credentials.map((c, i) => (
                <span key={i} className="cred">
                  <Icon name="check" size={13} /> {c}
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
                rel="me noopener noreferrer"
                className="btn"
              >
                변호사 프로필 보기 <Icon name="external" size={16} />
              </a>
              <a href="tel:1660-4452" className="btn primary">
                <Icon name="phone" size={16} /> 1660-4452 직통
              </a>
              <a
                href="https://www.klaw.or.kr/search"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: "var(--gray-1)", color: "var(--ink-2)" }}
              >
                <Icon name="shield" size={16} /> 대한변협 등록 변호사 직접 조회 <Icon name="external" size={14} />
              </a>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
              대한변호사협회가 운영하는 '나의 변호사'에서 "김창희"로 검색하면 등록 여부를 직접 확인하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
