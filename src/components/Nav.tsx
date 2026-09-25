import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";
import { Icon } from "./Icon";

type Props = {
  openChat: () => void;
};

export function Nav({ openChat }: Props) {
  // 1000px 이하에서는 링크 줄이 숨겨지므로 메뉴 버튼으로 펼친다.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header>
    <nav className="top">
      <div className="inner">
        <a
          href="#top"
          className="logo"
          style={{ color: "var(--ink)", textDecoration: "none" }}
        >
          <Mascot size={32} pose="stand" />
          <span>퇴사히어로</span>
          <span className="badge-byvar">by 변호사</span>
        </a>
        <div
          id="nav-links"
          className={menuOpen ? "links open" : "links"}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
          }}
        >
          <a href="#labor">노동분쟁</a>
          <a href="/calc">계산기</a>
          <a href="/blog">칼럼</a>
          <a href="/faq">FAQ</a>
          <a href="#pricing">서비스 안내</a>
          <a href="/my">마이페이지</a>
        </div>
        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="nav-links"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <button
          className="btn primary"
          style={{ padding: "10px 18px", fontSize: 14 }}
          onClick={openChat}
        >
          <Icon name="chat" size={16} /> 카톡 문의
        </button>
      </div>
    </nav>
    </header>
  );
}
