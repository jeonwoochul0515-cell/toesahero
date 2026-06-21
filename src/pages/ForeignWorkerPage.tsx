// 외국인 근로자용 영문 랜딩 — 한국 노동법·퇴사 절차를 영어로 안내하고 상담으로 연결
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";

const POINTS = [
  {
    h: "You have the right to resign",
    body: "Under Korean Civil Act Article 660, an employee may resign even if the employer refuses to accept it. The resignation takes effect after a set period once notice reaches the employer.",
  },
  {
    h: "Unpaid wages & severance are protected",
    body: "Minimum wage, unpaid wages, and severance pay (for 1+ year of service) apply to foreign workers the same as Korean nationals. We help you claim what you are owed.",
  },
  {
    h: "A licensed lawyer handles your case",
    body: "Toesahero is run directly by attorney Kim Chang-hee (Law Office Cheongsong). Unlike general agencies, a lawyer can negotiate, claim unpaid money, and represent you in disputes and litigation.",
  },
  {
    h: "Visa & contract concerns",
    body: "Resigning can affect your visa status and the employer may make threats. We review your contract and situation so you can leave safely and lawfully.",
  },
];

export function ForeignWorkerPage() {
  usePageMeta({
    title: "Quit your job in Korea — lawyer-run resignation service | Toesahero",
    description:
      "Foreign worker in Korea wanting to resign? A licensed Korean attorney handles official notice, unpaid wage/severance claims, harassment and disputes. English guidance, consultation in Korean.",
    canonical: "/foreign-workers",
    keywords: [
      "resignation service Korea",
      "quit job Korea foreigner",
      "Korea labor lawyer English",
      "외국인 퇴사대행",
      "foreign worker resignation Korea",
    ],
  });

  return (
    <div className="page-static">
      <header className="page-static-header">
        <Link to="/" className="my-back">← Home</Link>
        <div style={{ fontSize: 44, marginTop: 8 }}>🌏</div>
        <h1 className="page-static-title">Quitting your job in Korea</h1>
        <p className="page-static-sub">
          A licensed Korean attorney handles your resignation — official notice, unpaid wages,
          severance, harassment and disputes.
        </p>
      </header>

      <main className="page-static-main" style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {POINTS.map((p, i) => (
            <div
              key={i}
              style={{
                padding: "18px 20px",
                border: "2.5px solid var(--ink)",
                borderRadius: 14,
                background: "var(--paper)",
                boxShadow: "3px 3px 0 0 var(--ink)",
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px" }}>{p.h}</h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "var(--ink-2)" }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: "14px 18px",
            borderRadius: 12,
            background: "var(--yellow-soft, var(--paper))",
            border: "2px solid var(--ink)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          ℹ️ Consultation and documents are handled in Korean. English questions are welcome via
          the KakaoTalk channel — we will guide you.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <a
            href="https://pf.kakao.com/_zkzIX"
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary"
            style={{ padding: 15, textAlign: "center" }}
          >
            💬 Contact us on KakaoTalk
          </a>
          <a href="tel:1660-4452" className="btn" style={{ padding: 15, textAlign: "center" }}>
            ☎ Call 1660-4452
          </a>
          <Link to="/diagnose" className="btn yellow" style={{ padding: 15, textAlign: "center" }}>
            🧭 1-minute self-diagnosis (Korean)
          </Link>
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20, lineHeight: 1.6 }}>
          This page provides general legal information, not legal advice. Individual cases require
          consultation. This site is advertising under Article 23 of the Attorney-at-Law Act
          (대한변호사협회 등록).
        </p>
      </main>
    </div>
  );
}
