import { useEffect, useState } from "react";
import { Nav } from "./components/Nav";
import { usePageMeta } from "./hooks/usePageMeta";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
import { StatsBand } from "./components/StatsBand";
import { Audience } from "./components/Audience";
import { Calculator } from "./components/Calculator";
import { Process } from "./components/Process";
import { Lawyer } from "./components/Lawyer";
import { Pricing } from "./components/Pricing";
import { Reviews } from "./components/Reviews";
import { Footer } from "./components/Footer";
import { ChatModal } from "./components/ChatModal";
import { FloatingButton } from "./components/FloatingButton";

export function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  const seo = usePageMeta({
    title: "퇴사히어로 — 변호사가 직접 운영하는 퇴사대행",
    description:
      "법률사무소 청송 김창희 변호사가 직접 운영하는 퇴사대행. 통보부터 임금 회수·괴롭힘·부당해고 분쟁까지 — 노무사가 다룰 수 없는 영역까지 변호사가 직접 처리합니다.",
    canonical: "/",
    keywords: [
      "퇴사대행",
      "변호사 퇴사대행",
      "법률사무소 청송",
      "김창희 변호사",
      "퇴직금",
      "직장 내 괴롭힘",
      "노동법 자문",
      "변호사법 109조",
      "권고사직",
      "부당해고",
      "임금 체불",
    ],
  });

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []);

  const openChat = () => setChatOpen(true);

  return (
    <>
      {seo}
      <Nav openChat={openChat} />
      <Hero openChat={openChat} />
      <Marquee />
      <StatsBand />
      <Audience />
      <Calculator />
      <Process />
      <Lawyer />
      <Pricing openChat={openChat} />
      <Reviews />
      <Footer openChat={openChat} />
      <FloatingButton openChat={openChat} />
      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
