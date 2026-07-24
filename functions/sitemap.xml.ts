// Cloudflare Pages Function: GET /sitemap.xml
// 동적 사이트맵 — 고정 페이지 + Firestore의 published 블로그 글을 실제 publishedAt(lastmod)과 함께 포함.
// rss.xml.ts 와 동일 패턴(Firestore REST, posts published 공개 read).

interface Env {
  FIREBASE_PROJECT_ID?: string;
}

const PROJECT_ID = "durable-binder-457823-g3";
const SITE_HOST = "https://toesahero.com";

// 고정 페이지 — loc, changefreq, priority
const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/calc", changefreq: "monthly", priority: "0.8" },
  { path: "/unemployment-calc", changefreq: "monthly", priority: "0.8" },
  { path: "/resignation-letter", changefreq: "monthly", priority: "0.7" },
  { path: "/diagnose", changefreq: "monthly", priority: "0.8" },
  { path: "/harassment", changefreq: "monthly", priority: "0.7" },
  { path: "/unfair-dismissal", changefreq: "monthly", priority: "0.8" },
  { path: "/unpaid-wages", changefreq: "monthly", priority: "0.8" },
  { path: "/severance-pay", changefreq: "monthly", priority: "0.8" },
  { path: "/small-business", changefreq: "monthly", priority: "0.7" },
  { path: "/foreign-workers", changefreq: "monthly", priority: "0.6" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

type FsValue = { stringValue?: string; timestampValue?: string };
type FsDoc = { name: string; fields?: Record<string, FsValue>; updateTime?: string };

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoOrNull(v?: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const projectId = env.FIREBASE_PROJECT_ID || PROJECT_ID;
  const nowIso = new Date().toISOString();

  // Firestore: published posts (보안 규칙상 인증 없이 read 가능)
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const queryBody = {
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

  const blogUrls: string[] = [];
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(queryBody),
    });
    if (resp.ok) {
      const data = (await resp.json()) as Array<{ document?: FsDoc }>;
      for (const row of data) {
        const f = row.document?.fields;
        if (!f) continue;
        const slug = f.slug?.stringValue;
        if (!slug) continue;
        const lastmod =
          isoOrNull(f.publishedAt?.timestampValue) ||
          isoOrNull(row.document?.updateTime) ||
          nowIso;
        blogUrls.push(`  <url>
    <loc>${SITE_HOST}/blog/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
      }
    }
  } catch {
    // 블로그 조회 실패해도 고정 페이지 사이트맵은 반환
  }

  const staticUrls = STATIC_PAGES.map(
    (p) => `  <url>
    <loc>${SITE_HOST}${p.path}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join("\n")}
${blogUrls.join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
