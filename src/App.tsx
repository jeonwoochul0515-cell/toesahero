import { useEffect, useState } from "react";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
import { Audience } from "./components/Audience";
import { Calculator } from "./components/Calculator";
import { Process } from "./components/Process";
import { Lawyer } from "./components/Lawyer";
import { Pricing } from "./components/Pricing";
// import { Reviews } from "./components/Reviews"; // 변협 광고규정 검토 후 활성화
import { Footer } from "./components/Footer";
import { ChatModal } from "./components/ChatModal";
import { FloatingButton } from "./components/FloatingButton";

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);

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
      <Nav openChat={openChat} />
      <Hero openChat={openChat} />
      <Marquee />
      <Audience />
      <Calculator />
      <Process />
      <Lawyer />
      <Pricing openChat={openChat} />
      <Footer openChat={openChat} />
      <FloatingButton openChat={openChat} />
      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
