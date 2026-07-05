import { Icon, type IconName } from "./Icon";

type Step = {
  n: string;
  icon: IconName;
  title: string;
  body: string;
  time: string;
  side: string;
};

const steps: Step[] = [
  {
    n: "01",
    icon: "chat",
    title: "카톡으로 문의",
    body: "카톡 채널로 상황을 간단히 보내주세요. 영업일 기준 변호사가 직접 답변드립니다. 변호사 비밀유지 의무 적용.",
    time: "5분",
    side: "초기 문의",
  },
  {
    n: "02",
    icon: "handshake",
    title: "상담·위임 절차",
    body: "퇴사 시점·교섭 방향·법적 쟁점을 변호사가 직접 검토합니다. 위임 절차는 비대면으로 진행 가능합니다.",
    time: "30분~",
    side: "법률 자문",
  },
  {
    n: "03",
    icon: "megaphone",
    title: "법률사무소 명의 통보",
    body: "법률사무소 명의로 사용자에게 공식 통보합니다. 이후 회사 연락은 사무소가 응대합니다.",
    time: "당일~",
    side: "변호사 명의",
  },
  {
    n: "04",
    icon: "coins",
    title: "사후 절차 자문",
    body: "퇴직금·연차수당·실업급여 등 사후 절차에 관한 자문 및 노동청 진정·민사 절차 검토를 진행합니다.",
    time: "사안별",
    side: "사안에 따라 상이",
  },
];

export function Process() {
  return (
    <section id="process" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal">
          <span className="eyebrow">진행 방식</span>
          <h2 className="h2">
            카톡 문의 한 번으로
            <br />
            <span className="mark-hl orange">4단계 절차</span>
          </h2>
          <p className="lead">상담 → 위임 → 통보 → 사후 자문. 사안에 따라 기간은 달라집니다.</p>
        </div>
        <div className="proc-grid reveal">
          {steps.map((s, i) => (
            <div key={i} className="proc-card">
              <div className="proc-top">
                <span className="proc-num">{s.n}</span>
                <span className="proc-time">
                  <Icon name="clock" size={13} /> {s.time}
                </span>
              </div>
              <div className="proc-emoji">
                <Icon name={s.icon} size={34} strokeWidth={2.25} />
              </div>
              <h3 className="proc-title">{s.title}</h3>
              <p className="proc-body">{s.body}</p>
              <div className="proc-side">{s.side}</div>
              {i < steps.length - 1 && <div className="proc-arrow">→</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
