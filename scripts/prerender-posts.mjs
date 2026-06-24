// 빌드타임에 Firestore의 published 블로그 글을 정적 모듈(src/generated/posts.ts)로 떨어뜨린다.
// 목적: vite-react-ssg 프리렌더 시점에 글 본문/메타/JSON-LD가 HTML에 직렬화되도록 한다.
// posts 컬렉션은 보안 규칙상 published 글을 인증 없이 read 가능(sitemap.xml.ts 와 동일 패턴).

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../src/generated/posts.ts");
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "durable-binder-457823-g3";

// Firestore REST: status == "published" 글 전체(본문 포함)
async function fetchPublishedPosts() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: "posts" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "status" },
          op: "EQUAL",
          value: { stringValue: "published" },
        },
      },
      orderBy: [{ field: { fieldPath: "publishedAt" }, direction: "DESCENDING" }],
      limit: 200,
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`runQuery ${resp.status}: ${await resp.text()}`);
  const rows = await resp.json();
  return rows
    .filter((r) => r.document?.fields)
    .map((r) => decodePost(r.document));
}

// Firestore REST 문서 → PostDoc 형태
function decodePost(docu) {
  const f = docu.fields;
  const s = (v) => v?.stringValue ?? "";
  const ts = (v) => {
    const iso = v?.timestampValue;
    if (!iso) return null;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? null : { seconds: Math.floor(ms / 1000), nanoseconds: 0 };
  };
  const arr = (v) => (v?.arrayValue?.values ?? []).map((x) => x.stringValue ?? "").filter(Boolean);
  return {
    id: docu.name.split("/").pop(),
    slug: s(f.slug),
    // title/excerpt 는 SERP·OG·AI 인용에 그대로 노출되므로 앞뒤 공백 정리(본문은 보존).
    title: s(f.title).trim(),
    excerpt: s(f.excerpt).trim(),
    body: s(f.body),
    tags: arr(f.tags),
    coverEmoji: f.coverEmoji?.stringValue || undefined,
    author: s(f.author),
    status: "published",
    publishedAt: ts(f.publishedAt) ?? ts({ timestampValue: docu.updateTime }),
    createdAt: ts(f.createdAt),
    updatedAt: ts(f.updatedAt),
  };
}

function writeModule(posts) {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const header =
    "// 자동 생성 파일 — 수정 금지. `node scripts/prerender-posts.mjs`(빌드 prebuild)가 Firestore published 글을 박아 넣는다.\n" +
    'import type { PostDoc } from "../firebase";\n\n';
  const data = `export const PRERENDERED_POSTS: PostDoc[] = ${JSON.stringify(posts, null, 2)};\n`;
  writeFileSync(OUT_PATH, header + data, "utf8");
}

try {
  const posts = await fetchPublishedPosts();
  writeModule(posts);
  console.log(`[prerender-posts] ${posts.length}개 글 → src/generated/posts.ts`);
} catch (e) {
  // 네트워크 실패해도 빌드를 막지 않는다(고정 라우트는 프리렌더 유지). 단 기존 산출물이 없으면 빈 모듈 생성.
  console.warn(`[prerender-posts] 글 조회 실패, 빈/기존 모듈 유지: ${e.message}`);
  if (!existsSync(OUT_PATH)) writeModule([]);
}
