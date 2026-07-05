import { Icon } from "./Icon";

type Props = {
  openChat: () => void;
};

export function FloatingButton({ openChat }: Props) {
  return (
    <div className="floater">
      <button className="floater-btn" onClick={openChat} aria-label="카카오톡으로 문의하기">
        <span className="pulse" />
        <span>
          <Icon name="chat" size={16} /> 카톡 문의
        </span>
      </button>
    </div>
  );
}
