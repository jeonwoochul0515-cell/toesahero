// 계약서 무서운 조항 점검 페이지 — 홈에 있던 #contract-check 구역을 홈 줄이기(2026-09-25) 때 옮겼다
import { Link } from "react-router-dom";
import { usePageMeta, breadcrumbJsonLd } from "../hooks/usePageMeta";
import { useReveal } from "../hooks/useReveal";
import { ContractClauses } from "../components/ContractClauses";

export function ContractCheckPage() {
  useReveal();
  const seo = usePageMeta({
    title: "계약서 퇴사 조항 점검 (30일 통보·지급보류·손해배상)",
    description:
      "\"30일 전 통보 후 승인\", \"무단결근 처리·급여 지급보류\", \"손해 전액 배상\" 같은 근로계약서 조항이 실제로 효력이 있는지 변호사가 일반론으로 짚어 드립니다. 개별 조항은 계약서를 봐야 정확합니다.",
    canonical: "/contract-check",
    keywords: [
      "근로계약서 퇴사 조항",
      "퇴사 30일 전 통보",
      "사직서 수리 거부",
      "급여 지급보류",
      "퇴사 손해배상",
      "위약금 약정",
    ],
    jsonLd: breadcrumbJsonLd([
      { name: "홈", url: "/" },
      { name: "계약서 조항 점검", url: "/contract-check" },
    ]),
  });
  const openChat = () => window.dispatchEvent(new CustomEvent("open-chat"));

  return (
    <div className="page-static">
      {seo}
      <header className="page-static-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="page-static-title">계약서 퇴사 조항 점검</h1>
        <p className="page-static-sub">
          겁주는 조항이 실제로 효력이 있는지, 변호사가 일반론으로 먼저 짚어 드립니다.
        </p>
      </header>

      <ContractClauses openChat={openChat} />

      <footer className="page-static-foot">
        본 페이지는 일반적 정보 제공을 위한 것이며, 구체적 사안에 대한 법률 자문이 아닙니다.
        개별 조항의 효력은 계약서와 사실관계를 봐야 정확합니다. 본 사이트는 「변호사법」 제23조에 따른
        광고물입니다. 법률사무소 청송law · 변호사 김창희.
      </footer>
    </div>
  );
}
