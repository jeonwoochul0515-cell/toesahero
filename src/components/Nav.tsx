import { Mascot } from "./Mascot";

type Props = {
  openChat: () => void;
};

export function Nav({ openChat }: Props) {
  return (
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
        <div className="links">
          <a href="#audience">이런 분에게</a>
          <a href="#process">프로세스</a>
          <a href="#lawyer">변호사</a>
          <a href="#pricing">가격</a>
          <a href="#reviews">후기</a>
        </div>
        <button
          className="btn primary"
          style={{ padding: "10px 18px", fontSize: 14 }}
          onClick={openChat}
        >
          💬 무료 상담
        </button>
      </div>
    </nav>
  );
}
