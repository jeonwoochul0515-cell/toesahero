// Cloudflare Pages Functions 미들웨어 — SPA 폴백 / 404 분기 처리
// _routes.json 의 include 외 경로는 정적 자산으로 처리된다.
// 정적 매칭이 없어 404 가 난 경우:
//   - 클라이언트 전용 라우트(my/checkout/admin, 프리렌더 없음) → index.html 200 (React Router 처리)
//   - 그 외 미존재 경로 → 404.html 을 진짜 404 코드로 반환(소프트404 회피)

// 프리렌더되지 않는 클라이언트 전용 라우트만 SPA 폴백 대상이다.
function isClientRoute(pathname: string): boolean {
  return (
    pathname === "/my" ||
    pathname.startsWith("/my/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export const onRequest: PagesFunction = async ({ request, next }) => {
  const response = await next();

  // 정적 자산이 매칭된 경우(공개 프리렌더 페이지 등)는 그대로 반환
  if (response.status !== 404) {
    return response;
  }

  const pathname = new URL(request.url).pathname;

  // 클라이언트 전용 라우트 — index.html 반환(React Router가 클라이언트에서 처리)
  if (isClientRoute(pathname)) {
    const indexResponse = await fetch(new URL("/index.html", request.url));
    return new Response(indexResponse.body, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // 정적 에셋(.png/.css/.js 등) 미존재 — 원본 404 그대로(HTML 404 페이지로 감싸지 않음)
  const isAsset =
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/__/") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|otf|map|json|xml|txt|html)$/i.test(
      pathname
    );
  if (isAsset) {
    return response;
  }

  // 그 외 미존재 경로 — 404.html 을 진짜 404 코드로 반환
  const notFoundResponse = await fetch(new URL("/404.html", request.url));
  return new Response(notFoundResponse.body, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
    },
  });
};
