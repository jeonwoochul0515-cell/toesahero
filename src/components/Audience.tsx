type AudCase = {
  tag: string;
  emoji: string;
  title: string;
  body: string;
};

const cases: AudCase[] = [
  {
    tag: "월요병",
    emoji: "😩",
    title: "일요일 밤만 되면\n심장이 쿵쾅",
    body: "회사가 보내는 신호일 수 있어요. 변호사와 상의해보세요.",
  },
  {
    tag: "갑질",
    emoji: "🫥",
    title: "퇴사 말 꺼내자\n사장이 잠수",
    body: "변호사가 법률사무소 명의로 직접 통보합니다.",
  },
  {
    tag: "퇴직금",
    emoji: "💸",
    title: "받아야 할 돈\n못 받고 나갈까봐",
    body: "퇴직금·연차·야근수당 산정 자문 가능합니다.",
  },
  {
    tag: "잔류회유",
    emoji: "🥲",
    title: "그만둔다 했더니\n갑자기 잘해줌",
    body: "마음이 정해졌다면 깔끔한 절차로 진행합니다.",
  },
  {
    tag: "계약위반",
    emoji: "📑",
    title: "근로계약서와\n실제가 다름",
    body: "근로기준법 위반 여부 검토 자문이 가능합니다.",
  },
  {
    tag: "괴롭힘",
    emoji: "🚨",
    title: "직장 내 괴롭힘\n증거 정리 중",
    body: "신고 절차부터 산재 신청까지 변호사 자문.",
  },
];

export function Audience() {
  return (
    <section id="audience" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal">
          <span className="eyebrow">For You</span>
          <h2 className="h2">
            이런{" "}
            <span
              style={{
                background: "var(--yellow)",
                padding: "0 10px",
                border: "2.5px solid var(--ink)",
                borderRadius: 6,
                boxShadow: "3px 3px 0 0 var(--ink)",
                display: "inline-block",
                transform: "rotate(-1deg)",
              }}
            >
              상황
            </span>
            이라면
            <br />
            변호사와 상의하세요
          </h2>
          <p className="lead">하나라도 해당되면 카톡으로 문의 주세요.</p>
        </div>
        <div className="aud-grid reveal">
          {cases.map((c, i) => (
            <div key={i} className="aud-card">
              <div className="aud-tag">#{c.tag}</div>
              <div className="aud-emoji">{c.emoji}</div>
              <h3 className="aud-title">{c.title}</h3>
              <p className="aud-body">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
