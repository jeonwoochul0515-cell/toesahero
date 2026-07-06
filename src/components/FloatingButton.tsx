import { Icon } from "./Icon";

type Props = {
  openChat: () => void;
};

export function FloatingButton({ openChat }: Props) {
  return (
    <div className="floater">
      <a href="tel:1660-4452" className="floater-btn floater-btn-call" aria-label="전화로 상담하기">
        <Icon name="phone" size={16} /> 전화 상담
      </a>
      <button className="floater-btn" onClick={openChat} aria-label="카카오톡으로 문의하기">
        <span className="pulse" />
        <span>
          <Icon name="chat" size={16} /> 카톡 문의
        </span>
      </button>
    </div>
  );
}
