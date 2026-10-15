// 자동 발행 글의 주소(slug)를 정한다 — AI가 낸 영문 키워드를 검사하고 겹치면 번호를 붙인다(2026-10-15 네이버 점검 T5)

// AI가 낸 slug를 주소로 쓸 수 있는지 검사하고, 겹치면 -2, -3을 붙인다.
// 못 쓰면 날짜 주소(column-YYYYMMDD)로 대신한다. auto- 로 시작하는 주소는 새로 만들지 않는다.
export function pickSlug(raw, existingSlugs, now = new Date()) {
  let base = String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(auto-)+/, "");
  const words = base.split("-").filter(Boolean);
  // 56자까지만 받는다 — 겹쳐서 -2, -3을 붙여도 60자를 넘지 않게(2026-10-15 독립 검토 지적)
  if (words.length < 2 || base.length > 56) {
    const d = now.toISOString().slice(0, 10).replace(/-/g, "");
    base = `column-${d}`;
  }
  // 번호가 몇 자리가 되든 60자를 넘지 않게, 번호 길이만큼 앞을 줄여 붙인다(2026-10-15 독립 검토 2차 지적)
  let slug = base;
  for (let n = 2; existingSlugs.has(slug); n++) {
    const suffix = `-${n}`;
    slug = base.slice(0, 60 - suffix.length).replace(/-+$/, "") + suffix;
  }
  return slug;
}
