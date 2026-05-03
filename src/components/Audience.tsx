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
    title: "일요일 밤만 되면\n심장이 쿵쾅거림",
    body: "그거 ㄹㅇ 회사 신호임. 미루지 말자.",
  },
  {
    tag: "갑질",
    emoji: "🫥",
    title: "퇴사 말 꺼내자\n사장이 잠수탐",
    body: "잠수타도 소용없음. 변호사가 직접 통보함.",
  },
  {
    tag: "퇴직금",
    emoji: "💸",
    title: "받아야 할 돈\n못 받고 나갈까봐",
    body: "퇴직금·연차·야근수당 다 계산해서 받아드림.",
  },
  {
    tag: "잔류회유",
    emoji: "🥲",
    title: "그만둔다 했더니\n갑자기 잘해줌",
    body: "그거 페이크임. 마음 굳혔으면 깔끔하게 ㄱㄱ.",
  },
  {
    tag: "계약위반",
    emoji: "📑",
    title: "근로계약서랑\n실제가 다름",
    body: "그거 위법 가능성 큼. 무료로 검토해드림.",
  },
  {
    tag: "괴롭힘",
    emoji: "🚨",
    title: "직장 내 괴롭힘\n증거 모으는 중",
    body: "신고부터 산재까지 변호사가 풀세트로 챙김.",
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
              퇴준생
            </span>
            들에게
            <br />
            ㄹㅇ 추천함
          </h2>
          <p className="lead">하나라도 해당되면 그냥 상담받으셈. 무료니까.</p>
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
