// 챗봇 안에 숨어있던 AI 통보문 초안 기능을 홈 화면 전면에 노출하는 훅 섹션
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
            바로 체험해보세요
          </span>
          <h2 className="h2" style={{ color: "var(--cream)" }}>
            지금 상황을 알려주시면
            <br />
            <span style={{ color: "var(--yellow)" }}>통보문 1차 초안</span>을 확인하실 수 있어요
          </h2>
          <p className="lead" style={{ color: "var(--gray-2)", margin: "0 auto 28px" }}>
            카톡으로 상황을 몇 마디 남겨주시면 AI가 통보문 초안을 먼저 만들어드리고,
            김창희 변호사가 검토·수정한 뒤 최종본을 안내합니다.
          </p>
          <button
            className="btn primary"
            onClick={openChat}
            style={{ fontSize: 16, padding: "16px 28px" }}
          >
            <Icon name="doc" size={18} /> 지금 상황 남기고 초안 받아보기
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
            <Icon name="lock" size={12} /> AI 초안은 김창희 변호사가 사후 검토 후 발송됩니다
          </p>
        </div>
      </div>
    </section>
  );
}
