// 세그먼트별 랜딩(직장 내 괴롭힘 / 5인 미만 사업장) — SEO·전환용. 설정 기반 단일 컴포넌트
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";

type Seg = "harassment" | "small-business";

type Point = { h: string; body: string };
type Config = {
  emoji: string;
  title: string;
  sub: string;
  metaTitle: string;
  metaDesc: string;
  keywords: string[];
  canonical: string;
  points: Point[];
};

const CONFIG: Record<Seg, Config> = {
  harassment: {
    emoji: "🛡️",
    title: "직장 내 괴롭힘, 혼자 버티지 마세요",
    sub: "근로기준법이 금지하는 직장 내 괴롭힘 — 신고부터 민사·형사까지 변호사가 직접 검토·대응합니다.",
    metaTitle: "직장 내 괴롭힘 퇴사대행 — 변호사 직접 대응 | 퇴사히어로",
    metaDesc:
      "직장 내 괴롭힘(근로기준법 제76조의2)으로 퇴사를 고민 중이라면, 증거 보존부터 신고·민사·형사 대응까지 변호사가 직접 검토합니다.",
    keywords: ["직장 내 괴롭힘 퇴사", "직장 내 괴롭힘 신고", "괴롭힘 변호사", "괴롭힘 퇴사대행"],
    canonical: "/harassment",
    points: [
      {
        h: "법이 금지하는 행위입니다",
        body: "근로기준법 제76조의2는 직장 내 괴롭힘을 명문으로 금지하고, 제76조의3은 사용자에게 신고 접수 시 조사·조치 의무를 부과합니다. 참고 견딜 일이 아니라 법적으로 다툴 수 있는 사안입니다.",
      },
      {
        h: "증거가 가장 중요합니다",
        body: "녹취·메시지·이메일·메모·목격자 진술을 시간순으로 보존하세요. 본인 사건 페이지에 증거를 안전하게 보관할 수 있고, 변호사만 열람합니다.",
      },
      {
        h: "신고를 넘어선 대응은 변호사 전속",
        body: "사내 신고로 끝나지 않고 민사 손해배상·형사고소까지 가는 경우, 이는 변호사법상 변호사의 전속 사무입니다. 노무사·일반 업체는 대리할 수 없습니다.",
      },
      {
        h: "회사의 역공도 방어합니다",
        body: "신고 후 회사가 명예훼손·손해배상을 들어 역으로 압박하는 경우가 있습니다. 이 대응 역시 변호사가 직접 맡습니다.",
      },
    ],
  },
  "small-business": {
    emoji: "🏢",
    title: "5인 미만 사업장 퇴사, 무엇이 다른가",
    sub: "근로기준법 일부가 적용되지 않아 권리 판단이 까다롭습니다. 무엇이 적용되는지부터 변호사가 정확히 확인합니다.",
    metaTitle: "5인 미만 사업장 퇴사대행 — 변호사 검토 | 퇴사히어로",
    metaDesc:
      "5인 미만 사업장은 부당해고 구제·가산수당 등 일부 규정이 적용되지 않지만, 퇴직금·임금·최저임금 등은 적용됩니다. 사안별 권리를 변호사가 확인합니다.",
    keywords: ["5인 미만 사업장 퇴사", "5인 미만 퇴직금", "소규모 사업장 퇴사대행"],
    canonical: "/small-business",
    points: [
      {
        h: "적용되지 않는 규정이 있습니다",
        body: "5인 미만 사업장은 부당해고 구제신청, 연장·야간·휴일 가산수당, 연차유급휴가 등 일부 근로기준법 조항의 적용에서 제외됩니다.",
      },
      {
        h: "그래도 보장되는 권리는 많습니다",
        body: "퇴직금(계속근로 1년 이상), 최저임금, 임금 체불 구제, 주휴수당 등은 5인 미만 사업장에도 적용됩니다. '5인 미만이라 아무것도 안 된다'는 오해입니다.",
      },
      {
        h: "그래서 사안별 판단이 핵심",
        body: "무엇이 적용되고 무엇이 제외되는지는 사업장 규모·근무 형태에 따라 갈립니다. 잘못 판단하면 받을 수 있는 권리를 놓칩니다. 변호사가 정확히 확인합니다.",
      },
    ],
  },
};

export function SegmentLandingPage({ seg }: { seg: Seg }) {
  const c = CONFIG[seg];

  usePageMeta({
    title: c.metaTitle,
    description: c.metaDesc,
    canonical: c.canonical,
    keywords: c.keywords,
  });

  return (
    <div className="page-static">
      <header className="page-static-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <div style={{ fontSize: 44, marginTop: 8 }}>{c.emoji}</div>
        <h1 className="page-static-title">{c.title}</h1>
        <p className="page-static-sub">{c.sub}</p>
      </header>

      <main className="page-static-main" style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {c.points.map((p, i) => (
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

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <Link to="/diagnose" className="btn primary" style={{ padding: 15, textAlign: "center" }}>
            🧭 내 사안 1분 진단하기
          </Link>
          <a
            href="https://pf.kakao.com/_zkzIX"
            target="_blank"
            rel="noopener noreferrer"
            className="btn yellow"
            style={{ padding: 15, textAlign: "center" }}
          >
            🟡 카톡으로 상담하기
          </a>
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20, lineHeight: 1.6 }}>
          본 페이지는 일반적 법률 정보 제공이며 법률 자문이 아닙니다. 개별 사안은 상담을 통해
          확인이 필요합니다. 본 사이트는 변호사법 제23조에 따른 광고물입니다.
        </p>
      </main>
    </div>
  );
}
