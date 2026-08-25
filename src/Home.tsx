import { Nav } from "./components/Nav";
import { usePageMeta } from "./hooks/usePageMeta";
import { useReveal } from "./hooks/useReveal";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
import { StatsBand } from "./components/StatsBand";
import { Audience } from "./components/Audience";
import { LaborDisputes } from "./components/LaborDisputes";
import { ContractClauses } from "./components/ContractClauses";
import { DraftHook } from "./components/DraftHook";
import { Calculator } from "./components/Calculator";
import { Process } from "./components/Process";
import { Compare } from "./components/Compare";
import { Lawyer } from "./components/Lawyer";
import { Assurance } from "./components/Assurance";
import { Pricing } from "./components/Pricing";
import { Reviews } from "./components/Reviews";
import { Footer } from "./components/Footer";

export function Home() {
  const seo = usePageMeta({
    title: "퇴사대행(퇴직대행) 변호사 — 퇴사히어로",
    description:
      "법률사무소 청송 김창희 변호사가 직접 운영하는 퇴사대행(퇴직대행). 임금체불·퇴직금·직장 내 괴롭힘·부당해고까지 변호사가 직접 처리합니다.",
    canonical: "/",
    keywords: [
      "퇴사대행",
      "퇴직대행",
      "퇴사대행 변호사",
      "변호사 퇴사대행",
      "법률사무소 청송",
      "김창희 변호사",
      "퇴직금",
      "퇴직금 미지급",
      "임금체불",
      "직장 내 괴롭힘",
      "노동법 자문",
      "변호사법 109조",
      "권고사직",
      "권고사직 실업급여",
      "부당해고",
      "부당해고 구제신청",
      "부당전보",
      "사직서 거부",
      "퇴사 절차",
    ],
  });

  useReveal();

  // 대화창(히로)은 App 루트에 전역 마운트되어 있다 — 여기서는 열기 이벤트만 쏜다
  const openChat = () => window.dispatchEvent(new CustomEvent("open-chat"));

  return (
    <>
      {seo}
      <Nav openChat={openChat} />
      <Hero openChat={openChat} />
      <Marquee />
      <StatsBand />
      <Audience />
      <LaborDisputes />
      <ContractClauses openChat={openChat} />
      <DraftHook openChat={openChat} />
      <Calculator />
      <Process />
      <Compare />
      <Lawyer />
      <Assurance />
      <Pricing openChat={openChat} />
      <Reviews />
      <Footer openChat={openChat} />
    </>
  );
}
