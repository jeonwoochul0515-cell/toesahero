import { useState } from "react";

type Review = {
  tag: string;
  title: string;
  body: string;
  stars: number;
  bg: "yellow" | "orange" | "paper";
};

const reviews: Review[] = [
  {
    tag: "26세 · IT 사원",
    title: "ㄹㅇ 인생 플렉스",
    body: "사장이 전화 30번씩 와서 노이로제 걸릴뻔. 변호사님이 통보 한 번 박으니까 그날부터 연락 끊김. 퇴직금까지 받음. 진작 할걸.",
    stars: 5,
    bg: "yellow",
  },
  {
    tag: "29세 · 디자이너",
    title: "안 받은 야근수당 받음",
    body: "야근비 못 받은게 800만원 정도 됐었음. 노동청 가야하나 했는데 변호사님이 협상으로 한방에. 시간 낭비 안 한게 ㄹㅇ 다행.",
    stars: 5,
    bg: "orange",
  },
  {
    tag: "33세 · 마케터",
    title: "쪼는 분위기에서 해방",
    body: "퇴사하겠다 했더니 갑자기 잘해주는 척 하는데... 진짜 토 나옴. 변호사 끼니까 그런 회유 다 차단됨. 깔끔.",
    stars: 5,
    bg: "paper",
  },
  {
    tag: "24세 · 신입 1년차",
    title: "괴롭힘 산재 처리",
    body: "팀장이 ㄹㅇ 또라이여서 정신과 다님. 산재까지 처리해주셔서 치료비 받음. 혼자였으면 그냥 묻고 갔을듯.",
    stars: 5,
    bg: "yellow",
  },
  {
    tag: "31세 · 영업직",
    title: "실업급여까지 챙겨줌",
    body: "권고사직으로 처리해서 실업급여 받음. 이거 회사가 안 해주려고 했는데 변호사님이 협상으로 받아내심. 진심 감사.",
    stars: 5,
    bg: "orange",
  },
  {
    tag: "27세 · 간호사",
    title: "3교대 빠져나오기",
    body: "병원 그만두기 ㄹㅇ 어렵다는데, 절차 다 챙겨주셔서 깔끔하게 나옴. 카톡으로 다 됨. 비대면 굿굿.",
    stars: 5,
    bg: "paper",
  },
];

export function Reviews() {
  const [paused, setPaused] = useState(false);

  return (
    <section
      id="reviews"
      style={{ background: "var(--paper)", overflow: "hidden" }}
    >
      <div className="wrap">
        <div
          className="reveal"
          style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}
        >
          <span className="eyebrow">Reviews</span>
          <h2 className="h2">
            먼저 나간 <span style={{ color: "var(--orange)" }}>퇴준생들</span>의
            <br />
            ㄹㅇ 후기
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            실제 의뢰인 동의받고 게재함. 회사 정보는 가렸음.
          </p>
        </div>
      </div>
      <div
        className={`rev-marquee ${paused ? "paused" : ""}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="rev-track">
          {[...reviews, ...reviews].map((r, i) => (
            <div key={i} className={`rev-card bg-${r.bg}`}>
              <div className="rev-stars">{"★".repeat(r.stars)}</div>
              <h3 className="rev-title">"{r.title}"</h3>
              <p className="rev-body">{r.body}</p>
              <div className="rev-tag">— {r.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
