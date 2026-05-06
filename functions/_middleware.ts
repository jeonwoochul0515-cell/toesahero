// Cloudflare Pages Functions 미들웨어 — SPA 폴백 처리
// _routes.json 의 include 외 경로는 정적 자산 처리되며,
// 매칭되지 않은 SPA 라우트(/admin/login 등)에 대해 index.html을 반환.

export const onRequest: PagesFunction = async ({ request, next }) => {
  const response = await next();

  // 정적 자산이 매칭되지 않은 경우(404) SPA 라우트로 간주하고 index.html 반환
  if (response.status !== 404) {
    return response;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // 진짜 404 처리 대상 — 알려진 정적 파일 패턴은 그대로 404
  const isAsset =
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/__/") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|otf|map|json|xml|txt|html)$/i.test(
      pathname
    );

  if (isAsset) {
    return response; // 진짜 404 (정적 파일이 없는 경우)
  }

  // SPA 라우트 — index.html 반환 (React Router가 처리)
  const indexUrl = new URL("/index.html", request.url);
  const indexResponse = await fetch(indexUrl);

  return new Response(indexResponse.body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
    },
  });
};
