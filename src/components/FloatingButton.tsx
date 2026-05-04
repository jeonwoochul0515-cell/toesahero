type Props = {
  openChat: () => void;
};

export function FloatingButton({ openChat }: Props) {
  return (
    <div className="floater">
      <button className="floater-btn" onClick={openChat} aria-label="카카오톡으로 문의하기">
        <span className="pulse" />
        <span>💬 카톡 문의</span>
      </button>
    </div>
  );
}
