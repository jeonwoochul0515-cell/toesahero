// Cloudflare Pages Function: POST /api/indexnow
// 관리자가 블로그 글을 게시/수정할 때 빙·네이버 등에 신규·변경 URL을 즉시 통지한다(색인 가속용, 색인 보장 아님).
// public/938f576e2a5781026560da253ad84446.txt 의 키와 동일해야 한다.
const INDEXNOW_KEY = "938f576e2a5781026560da253ad84446";

type RequestBody = { slug?: string; url?: string };

export const onRequestPost: PagesFunction = async ({ request }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" });
  }

  const url =
    body.url ?? (body.slug ? `https://toesahero.com/blog/${body.slug}` : null);
  if (!url) return json({ ok: false, reason: "missing_url" });

  try {
    const endpoint = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(
      url
    )}&key=${INDEXNOW_KEY}`;
    const r = await fetch(endpoint);
    return json({ ok: r.ok, status: r.status });
  } catch (e) {
    return json({ ok: false, reason: (e as Error).message });
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
