// 자동 발행 글 주소(pickSlug) 시험 — auto- 주소를 새로 만들지 않고, 겹치면 번호를 붙이는지
import { describe, expect, it } from "vitest";
import { pickSlug } from "./blog-slug.mjs";

const NOW = new Date("2026-10-15T00:10:00Z");

describe("pickSlug", () => {
  it("AI가 낸 영문 키워드를 그대로 쓴다", () => {
    expect(pickSlug("parental-leave-return-refusal", new Set(), NOW)).toBe("parental-leave-return-refusal");
  });

  it("대문자·공백·기호를 소문자 하이픈 주소로 바꾼다", () => {
    expect(pickSlug("  Parental Leave: Return_Refusal! ", new Set(), NOW)).toBe("parental-leave-return-refusal");
  });

  it("auto- 로 시작하면 그 머리를 뗀다", () => {
    expect(pickSlug("auto-auto-severance-pay-delay", new Set(), NOW)).toBe("severance-pay-delay");
  });

  it("이미 있는 주소면 -2, -3을 붙인다", () => {
    const used = new Set(["severance-pay-delay", "severance-pay-delay-2"]);
    expect(pickSlug("severance-pay-delay", used, NOW)).toBe("severance-pay-delay-3");
  });

  it("비었거나 한 단어·한글뿐·너무 길면 날짜 주소로 대신한다", () => {
    for (const bad of [undefined, "", "퇴직금", "severance", "a-".repeat(40) + "b"]) {
      const s = pickSlug(bad, new Set(), NOW);
      expect(s).toBe("column-20261015");
      expect(s.startsWith("auto-")).toBe(false);
    }
  });

  it("겹쳐서 번호를 붙여도 60자를 넘지 않는다", () => {
    const long = "a".repeat(54) + "-b"; // 56자
    expect(pickSlug(long, new Set(), NOW)).toBe(long);
    expect(pickSlug(long, new Set([long]), NOW).length).toBeLessThanOrEqual(60);
    expect(pickSlug("a".repeat(55) + "-b", new Set(), NOW)).toBe("column-20261015"); // 57자는 받지 않는다
  });

  it("겹친 주소가 1000개를 넘어도 60자를 넘지 않는다", () => {
    const long = "a".repeat(54) + "-b";
    const used = new Set([long]);
    for (let n = 2; n <= 999; n++) used.add(pickSlug(long, used, NOW));
    const s = pickSlug(long, used, NOW);
    expect(s.endsWith("-1000")).toBe(true);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(used.has(s)).toBe(false);
  });

  it("날짜 주소도 겹치면 번호를 붙인다", () => {
    expect(pickSlug("", new Set(["column-20261015"]), NOW)).toBe("column-20261015-2");
  });
});
