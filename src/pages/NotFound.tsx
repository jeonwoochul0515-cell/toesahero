import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";

export function NotFound() {
  // 네이버 가이드: 잘못된 URL 페이지는 noindex 처리하여 소프트 404 회피
  const seo = usePageMeta({
    title: "페이지를 찾을 수 없습니다",
    description:
      "요청하신 페이지를 찾을 수 없습니다. 주소가 정확한지 확인해 주세요.",
    canonical: "/",
    noIndex: true,
  });

  return (
    <div className="page-static">
      {seo}
      <header className="page-static-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="page-static-title">404 — 페이지를 찾을 수 없습니다</h1>
        <p className="page-static-sub">
          요청하신 주소의 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
      </header>

      <main className="page-static-main">
        <div className="not-found-grid">
          <div className="not-found-card">
            <div className="not-found-icon">⚖️</div>
            <h2>찾으시는 정보가 있다면</h2>
            <ul>
              <li>
                <Link to="/">🏠 홈 — 서비스 안내·변호사 소개·가격</Link>
              </li>
              <li>
                <Link to="/blog">📝 법률 칼럼 — 변호사 본인 작성 정보</Link>
              </li>
              <li>
                <Link to="/faq">❓ 자주 묻는 질문 — 12문항</Link>
              </li>
              <li>
                <Link to="/calc">📊 임금·연차 자동 계산기</Link>
              </li>
              <li>
                <Link to="/terms">📋 이용약관</Link>
              </li>
              <li>
                <Link to="/privacy">🔒 개인정보처리방침</Link>
              </li>
            </ul>
          </div>
          <div className="not-found-card">
            <div className="not-found-icon">💬</div>
            <h2>변호사와 직접 상담</h2>
            <p>
              사안이 시급하시면 카카오톡 채널 또는 전화로 직접 문의해 주세요.
              영업일 기준 변호사가 직접 답변드립니다.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href="https://pf.kakao.com/_zkzIX"
                target="_blank"
                rel="noopener noreferrer"
                className="btn yellow"
              >
                🟡 카카오톡 채널
              </a>
              <a href="tel:1660-4452" className="btn primary">
                ☎ 1660-4452
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="page-static-foot">
        본 사이트는 「변호사법」 제23조에 따른 광고물입니다. 법률사무소 청송 ·
        변호사 김창희.
      </footer>
    </div>
  );
}
