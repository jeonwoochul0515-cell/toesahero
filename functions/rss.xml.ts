// Cloudflare Pages Function: GET /rss.xml
// 블로그 RSS 2.0 피드 — 네이버 서치어드바이저·구글·다음 등에 등록 가능
//
// Firestore에서 status='published' 인 posts를 publishedAt 역순으로 가져와 RSS XML 생성.
// Firestore REST API 사용 (Pages Functions는 Node 모듈 제한, 가벼운 fetch 호출이 안전).

interface Env {
  // Firestore REST API는 인증 없이 보안 규칙 통과되는 read 접근만 허용
  // posts 컬렉션은 status='published' 만 공개라서 별도 인증 키 불필요
  FIREBASE_PROJECT_ID?: string;
}

const PROJECT_ID =
  // Vite 빌드 타임 주입은 Functions에 안 와서 fallback
  "durable-binder-457823-g3";

const SITE_HOST = "https://toesahero.com";

type FirestoreFieldValue = {
  stringValue?: string;
  integerValue?: string;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreFieldValue[] };
};

type FirestoreDoc = {
  name: string;
  fields?: Record<string, FirestoreFieldValue>;
  createTime?: string;
  updateTime?: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getString(field?: FirestoreFieldValue): string {
  return field?.stringValue ?? "";
}

function getStringArray(field?: FirestoreFieldValue): string[] {
  return (field?.arrayValue?.values ?? [])
    .map((v) => v.stringValue ?? "")
    .filter(Boolean);
}

function getTimestamp(field?: FirestoreFieldValue): string | null {
  return field?.timestampValue ?? null;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const projectId = env.FIREBASE_PROJECT_ID || PROJECT_ID;

  // Firestore REST: collection list with structured query
  // 보안 규칙이 status='published' 만 공개로 허용하므로 인증 없이 read 가능
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
      orderBy: [
        { field: { fieldPath: "publishedAt" }, direction: "DESCENDING" },
      ],
      limit: 30,
    },
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(queryBody),
    });
  } catch (e) {
    return new Response(`<!-- RSS fetch failed: ${String(e)} -->`, {
      status: 500,
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return new Response(
      `<!-- Firestore query failed: ${resp.status} ${escapeXml(text)} -->`,
      {
        status: 500,
        headers: { "content-type": "application/xml; charset=utf-8" },
      }
    );
  }

  const data = (await resp.json()) as Array<{ document?: FirestoreDoc }>;
  const items: string[] = [];

  for (const row of data) {
    const doc = row.document;
    if (!doc?.fields) continue;
    const f = doc.fields;
    const slug = getString(f.slug);
    const title = getString(f.title);
    const excerpt = getString(f.excerpt);
    const author = getString(f.author) || "김창희 변호사";
    const tags = getStringArray(f.tags);
    const publishedAt = getTimestamp(f.publishedAt);
    if (!slug || !title) continue;

    const link = `${SITE_HOST}/blog/${slug}`;
    const pubDate = publishedAt ? new Date(publishedAt).toUTCString() : "";
    const categories = tags
      .map((t) => `<category><![CDATA[${t}]]></category>`)
      .join("");

    items.push(`
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <author><![CDATA[${author}]]></author>
      <description><![CDATA[${excerpt}]]></description>
      ${categories}
    </item>`);
  }

  const lastBuildDate = new Date().toUTCString();
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>퇴사히어로 — 법률 칼럼</title>
    <link>${SITE_HOST}/blog</link>
    <atom:link href="${SITE_HOST}/rss.xml" rel="self" type="application/rss+xml" />
    <description>법률사무소 청송 김창희 변호사가 직접 작성하는 노동법·퇴사 절차 관련 정보성 칼럼 RSS 피드.</description>
    <language>ko-KR</language>
    <copyright>© 법률사무소 청송 · 변호사 김창희</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Cloudflare Pages Functions</generator>
    <managingEditor>lawchungsong@daum.net (김창희 변호사)</managingEditor>
    <webMaster>lawchungsong@daum.net</webMaster>
    ${items.join("\n")}
  </channel>
</rss>`;

  return new Response(rss, {
    status: 200,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
