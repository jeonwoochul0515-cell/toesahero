// 어드민이 입력한 실적/신뢰 지표를 노출하는 밴드. 값이 없으면 렌더링하지 않음(허위 표기 방지)
import { useEffect, useState } from "react";
import { fetchSiteStats, type SiteStat } from "../firebase";

export function StatsBand() {
  const [stats, setStats] = useState<SiteStat[]>([]);

  useEffect(() => {
    let cancel = false;
    void fetchSiteStats().then((s) => {
      if (!cancel) setStats(s);
    });
    return () => {
      cancel = true;
    };
  }, []);

  if (stats.length === 0) return null;

  return (
    <section className="stats-band">
      <div className="wrap">
        <div className="stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="stats-item">
              <div className="stats-value">{s.value}</div>
              <div className="stats-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
