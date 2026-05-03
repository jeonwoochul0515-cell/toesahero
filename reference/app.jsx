const { useState, useEffect, useRef } = React;

function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS || {
    palette: "sunny", heroCopy: "boss", dark: false, mascot: true,
  });
  const [chatOpen, setChatOpen] = useState(false);

  // apply body data attrs from tweaks
  useEffect(() => {
    document.body.dataset.palette = tweaks.palette;
    document.body.dataset.dark = String(!!tweaks.dark);
    document.body.dataset.mascot = String(!!tweaks.mascot);
  }, [tweaks.palette, tweaks.dark, tweaks.mascot]);

  // scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // open chat from anywhere
  useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []);

  // mock notification toast
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const cities = ["서울", "부산", "대전", "광주", "인천", "수원", "울산"];
    const names = ["김**", "이**", "박**", "최**", "정**"];
    const ages = ["25세", "27세", "29세", "31세", "26세"];
    const roles = ["IT 사원", "디자이너", "마케터", "간호사", "영업직", "신입 1년차"];
    const t = setInterval(() => {
      const c = cities[Math.floor(Math.random() * cities.length)];
      const n = names[Math.floor(Math.random() * names.length)];
      const a = ages[Math.floor(Math.random() * ages.length)];
      const r = roles[Math.floor(Math.random() * roles.length)];
      setToast({ id: Date.now(), city: c, name: n, age: a, role: r });
      setTimeout(() => setToast(null), 4500);
    }, 9000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <nav className="top">
        <div className="inner">
          <a href="#top" className="logo" style={{ color: "var(--ink)", textDecoration: "none" }}>
            {tweaks.mascot && <Mascot size={32} pose="stand" />}
            <span>퇴사히어로</span>
            <span className="badge-byvar">by 변호사</span>
          </a>
          <div className="links">
            <a href="#audience">이런 분에게</a>
            <a href="#process">프로세스</a>
            <a href="#lawyer">변호사</a>
            <a href="#pricing">가격</a>
            <a href="#reviews">후기</a>
          </div>
          <button className="btn primary" style={{ padding: "10px 18px", fontSize: 14 }} onClick={() => setChatOpen(true)}>
            💬 무료 상담
          </button>
        </div>
      </nav>

      <Hero heroCopy={tweaks.heroCopy} openChat={() => setChatOpen(true)} />

      <div className="marquee">
        <div className="marquee-track">
          <span>
            <em>변호사 직접 운영</em><span className="star">★</span>
            <em>비밀 보장 ㄹㅇ</em><span className="star">★</span>
            <em>당일 통보 가능</em><span className="star">★</span>
            <em>퇴직금 못 받으면 환불</em><span className="star">★</span>
            <em>4,200+ 케이스</em><span className="star">★</span>
            <em>변호사 직접 운영</em><span className="star">★</span>
            <em>비밀 보장 ㄹㅇ</em><span className="star">★</span>
            <em>당일 통보 가능</em><span className="star">★</span>
            <em>퇴직금 못 받으면 환불</em><span className="star">★</span>
            <em>4,200+ 케이스</em><span className="star">★</span>
          </span>
        </div>
      </div>

      <Audience />
      <Calculator />
      <Process />
      <Lawyer />
      <Pricing openChat={() => setChatOpen(true)} />
      <Reviews />
      <Footer openChat={() => setChatOpen(true)} />

      {/* floating emergency button */}
      <div className="floater">
        {toast && (
          <div className="toast">
            <span className="pulse" style={{ background: "var(--green)" }}></span>
            <div>
              <strong>{toast.city} {toast.name}</strong>님이<br />
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{toast.age} {toast.role} · 방금</span><br />
              상담 시작했어요 ✨
            </div>
          </div>
        )}
        <button className="floater-btn" onClick={() => setChatOpen(true)}>
          <span className="pulse"></span>
          <span>💬 긴급 상담</span>
        </button>
      </div>

      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="컬러 팔레트">
          <TweakRadio
            value={tweaks.palette}
            onChange={(v) => setTweak("palette", v)}
            options={[
              { value: "sunny", label: "써니" },
              { value: "mint", label: "민트" },
              { value: "peach", label: "피치" },
              { value: "lilac", label: "라일락" },
            ]}
          />
        </TweakSection>
        <TweakSection title="히어로 카피">
          <TweakRadio
            value={tweaks.heroCopy}
            onChange={(v) => setTweak("heroCopy", v)}
            options={[
              { value: "boss", label: "사장님" },
              { value: "soft", label: "위로형" },
              { value: "legal", label: "법률형" },
            ]}
          />
        </TweakSection>
        <TweakSection title="모드">
          <TweakToggle
            label="다크모드"
            value={tweaks.dark}
            onChange={(v) => setTweak("dark", v)}
          />
          <TweakToggle
            label="히어로 마스코트"
            value={tweaks.mascot}
            onChange={(v) => setTweak("mascot", v)}
          />
        </TweakSection>
      </TweaksPanel>

      <style>{`
        .badge-byvar {
          font-size: 10px;
          font-weight: 700;
          background: var(--orange);
          color: var(--cream);
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: .04em;
          margin-left: 4px;
          border: 1.5px solid var(--ink);
          transform: rotate(-3deg);
        }
        .marquee-track em {
          font-style: normal;
          display: inline-flex; align-items: center;
        }
        .toast {
          background: var(--paper);
          border: 2.5px solid var(--ink);
          border-radius: 14px;
          padding: 10px 14px;
          box-shadow: var(--shadow-sm);
          font-size: 12px;
          line-height: 1.4;
          display: flex; gap: 10px; align-items: center;
          max-width: 240px;
          animation: toast-in .3s ease-out;
        }
        .toast strong { font-size: 13px; }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
