// 사이트 실적/신뢰 지표를 변호사가 직접 입력·관리하는 어드민 화면 (허위·과장 금지)
import { useEffect, useState } from "react";
import { fetchSiteStats, saveSiteStats, type SiteStat } from "../firebase";

export function StatsAdmin() {
  const [items, setItems] = useState<SiteStat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    void fetchSiteStats().then((s) => {
      setItems(s.length ? s : [{ label: "", value: "" }]);
      setLoaded(true);
    });
  }, []);

  const update = (i: number, key: keyof SiteStat, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const add = () => setItems((arr) => [...arr, { label: "", value: "" }]);
  const remove = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const clean = items.filter((s) => s.label.trim() && s.value.trim());
      await saveSiteStats(clean);
      setItems(clean.length ? clean : [{ label: "", value: "" }]);
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      alert("저장 실패: " + ((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="admin-dash"><p className="my-loading">로딩 중...</p></div>;

  return (
    <div className="admin-dash">
      <h1 className="admin-h1">실적 / 신뢰 지표</h1>
      <p className="admin-sub">
        홈 상단에 노출됩니다. <strong>실제로 사실인 값만</strong> 입력하세요(변협 광고규정 — 허위·과장 금지).
        값이 하나도 없으면 밴드 자체가 표시되지 않습니다. 예: 라벨 "누적 상담", 값 "1,200+건".
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560, marginTop: 16 }}>
        {items.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input
              className="admin-input"
              style={{ flex: 2 }}
              placeholder="라벨 (예: 누적 상담)"
              value={s.label}
              onChange={(e) => update(i, "label", e.target.value)}
            />
            <input
              className="admin-input"
              style={{ flex: 1 }}
              placeholder="값 (예: 1,200+건)"
              value={s.value}
              onChange={(e) => update(i, "value", e.target.value)}
            />
            <button className="btn" onClick={() => remove(i)} aria-label="삭제">✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={add}>＋ 항목 추가</button>
          <button className="btn primary" onClick={() => void save()} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          {savedAt && <span className="admin-saved">✓ {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
