// 홈 화면에서 대화창을 열어 통보문 작성을 요청하게 하는 유도 섹션
import { Icon } from "./Icon";

type Props = {
  openChat: () => void;
};

export function DraftHook({ openChat }: Props) {
  return (
    <section id="draft-hook" style={{ background: "var(--ink)" }}>
      <div className="wrap">
        <div
          className="reveal"
          style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}
        >
          <span className="eyebrow" style={{ color: "var(--yellow)" }}>
            통보문 작성 요청
          </span>
          <h2 className="h2" style={{ color: "var(--cream)" }}>
            지금 상황을 남겨 주시면
            <br />
            담당변호사 김창희가 <span style={{ color: "var(--yellow)" }}>통보문</span>을 작성해 드립니다
          </h2>
          <p className="lead" style={{ color: "var(--gray-2)", margin: "0 auto 28px" }}>
            대화창에 상황을 몇 마디 남겨 주시면 사무실에서 사실관계를 확인한 뒤,
            담당변호사 김창희가 통보문을 작성해 안내해 드립니다.
          </p>
          <button
            className="btn primary"
            onClick={openChat}
            style={{ fontSize: 16, padding: "16px 28px" }}
          >
            <Icon name="doc" size={18} /> 통보문 작성 요청하기
          </button>
          <p
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Icon name="lock" size={12} /> 통보문은 담당변호사 김창희가 검토한 뒤 발송합니다
          </p>
        </div>
      </div>
    </section>
  );
}
