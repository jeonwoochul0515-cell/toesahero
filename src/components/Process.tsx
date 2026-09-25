import { Icon } from "./Icon";

// 홈 줄이기(2026-09-25) — 카드 4장을 한 줄씩 4단계로 줄였다.
type Step = {
  n: string;
  title: string;
  line: string;
  time: string;
};

const steps: Step[] = [
  { n: "01", title: "상담 신청", line: "상황을 남기시면 영업일 기준 24시간 이내 변호사가 직접 답변", time: "5분" },
  { n: "02", title: "절차 안내·위임", line: "변호사가 맞는 절차를 정하고 결제 링크 발송(비대면)", time: "30분~" },
  { n: "03", title: "변호사 명의 통보", line: "회사에 공식 통보, 이후 회사 연락은 사무소가 응대", time: "당일~" },
  { n: "04", title: "사후 자문", line: "퇴직금·연차수당·실업급여, 노동청 진정·민사 검토", time: "사안별" },
];

export function Process() {
  return (
    <section id="process" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal">
          <span className="eyebrow">진행 방식</span>
          <h2 className="h2">
            퇴사대행은
            <br />
            <span className="mark-hl orange">어떻게 진행되나요?</span>
          </h2>
          <p className="lead">퇴사대행(퇴직대행)은 상담 → 위임 → 통보 → 사후 자문 순으로 진행됩니다. 사안에 따라 기간은 달라집니다.</p>
        </div>
        <ol className="proc-line reveal">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="proc-num">{s.n}</span>
              <span className="proc-line-text">
                <strong>{s.title}</strong> {s.line}
              </span>
              <span className="proc-time">
                <Icon name="clock" size={13} /> {s.time}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
