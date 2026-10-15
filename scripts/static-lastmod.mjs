// 고정 페이지별 실제 수정일(그 화면 소스의 git 마지막 커밋 시각)을 functions/_staticLastmod.ts 로 떨어뜨린다 — sitemap.xml lastmod용
// 빌드할 때마다 돈다(npm run build 맨 앞). 생성물은 커밋하지 않는다(.gitignore).
// 얕은 복제(GitHub Actions 기본 checkout)면 모든 파일이 같은 커밋 시각을 받아 거짓 날짜가 된다.
// 그래서 얕은 복제면 빈 표를 쓰고, sitemap은 그 페이지의 lastmod를 아예 빼고 낸다(틀린 날짜보다 없는 편이 낫다).
// 워크플로는 fetch-depth: 0 으로 전체 이력을 받는다.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = resolve(ROOT, "functions/_staticLastmod.ts");

// 화면 주소 → 그 화면의 내용을 정하는 소스. 머리글·바닥글처럼 모든 화면에 붙는 공통 틀은 넣지 않는다.
const HOME_SECTIONS = [
  "Hero", "Marquee", "StatsBand", "Situations", "MoreTools", "Process",
  "Compare", "Lawyer", "Assurance", "Pricing", "Reviews",
].map((c) => `src/components/${c}.tsx`);
const SEGMENT = ["src/pages/SegmentLandingPage.tsx", "src/config/payment.ts"];

const SOURCES = {
  "/": ["src/Home.tsx", ...HOME_SECTIONS],
  "/calc": ["src/pages/CalcPage.tsx", "src/config/payment.ts"],
  "/unemployment-calc": ["src/pages/UnemploymentCalcPage.tsx"],
  "/resignation-letter": ["src/pages/ResignationLetterPage.tsx"],
  "/diagnose": ["src/pages/DiagnosePage.tsx"],
  "/harassment": SEGMENT,
  "/unfair-dismissal": SEGMENT,
  "/recommended-resignation": SEGMENT,
  "/unpaid-wages": SEGMENT,
  "/severance-pay": SEGMENT,
  "/small-business": SEGMENT,
  "/foreign-workers": ["src/pages/ForeignWorkerPage.tsx"],
  // /blog 는 목록 화면 소스 날짜와 가장 최근 글 날짜 중 늦은 쪽을 sitemap.xml.ts 가 고른다.
  "/blog": ["src/pages/BlogList.tsx"],
  "/faq": ["src/pages/FAQPage.tsx", "src/components/Compare.tsx"],
  "/contract-check": ["src/pages/ContractCheckPage.tsx", "src/components/ContractClauses.tsx"],
  "/terms": ["public/terms.html"],
  "/privacy": ["public/privacy.html"],
};

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

const table = {};
let note = "";
try {
  if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
    note = "얕은 복제라 날짜를 믿을 수 없어 비웠다";
  } else {
    for (const [path, files] of Object.entries(SOURCES)) {
      const out = git(["log", "-1", "--format=%cI", "--", ...files]);
      const d = new Date(out);
      if (out && !isNaN(d.getTime())) table[path] = d.toISOString();
    }
  }
} catch (e) {
  note = `git을 읽지 못해 비웠다: ${e.message.split("\n")[0]}`;
}

const body = `// 자동 생성(scripts/static-lastmod.mjs) — 고칠 일 없음. 고정 페이지 주소 → 소스 마지막 커밋 시각(UTC).
// ${note || "git 이력 기준"}
export const STATIC_LASTMOD: Record<string, string> = ${JSON.stringify(table, null, 2)};
`;
writeFileSync(OUT_PATH, body, "utf8");
console.log(`[static-lastmod] ${Object.keys(table).length}개 페이지${note ? ` (${note})` : ""} → functions/_staticLastmod.ts`);
