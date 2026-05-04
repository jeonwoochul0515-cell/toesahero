import { useEffect, useState } from "react";
import { fetchPublicReviews, type ReviewDoc } from "../firebase";

export function Reviews() {
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancel = false;
    void fetchPublicReviews().then((list) => {
      if (cancel) return;
      setReviews(list);
      setLoaded(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  // 게재 후기가 없으면 섹션 자체를 렌더링하지 않음 (변협 규정 안전)
  if (loaded && reviews.length === 0) {
    return null;
  }
  if (!loaded) {
    return null;
  }

  // 마퀴를 위해 최소 6개로 보충 — 부족하면 반복
  const display =
    reviews.length >= 6 ? reviews : [...reviews, ...reviews, ...reviews].slice(0, 6);
  const looped = [...display, ...display];

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
            의뢰인 동의를 받고 게재한 후기
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            결과·금액에 관한 언급은 변호사 광고규정에 따라 제외했습니다.
            <br />
            모든 후기는 의뢰인의 명시적 동의 하에 게재됩니다.
          </p>
        </div>
      </div>
      <div
        className={`rev-marquee ${paused ? "paused" : ""}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="rev-track">
          {looped.map((r, i) => (
            <div key={`${r.id}-${i}`} className={`rev-card bg-${r.bg ?? "paper"}`}>
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
