// vite-react-ssg 엔트리 — 빌드타임 프리렌더 + 클라이언트 하이드레이션
import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import { PRERENDERED_POSTS } from "./generated/posts";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource-variable/space-grotesk";
import "./styles.css";
import "./admin/admin.css";

export const createRoot = ViteReactSSG({ routes });

// 프리렌더 대상 — 공개 콘텐츠 라우트만. admin/checkout/my/약관/동적(:param)·catch-all 제외.
// vite-react-ssg 가 server entry 의 named export 로 읽어 적용한다.
const PRERENDER_EXCLUDE = ["admin", "checkout", "my", "terms", "privacy"];
export function includedRoutes(paths: string[]): string[] {
  const staticRoutes = paths.filter((p) => {
    if (p.includes(":") || p.includes("*")) return false;
    // routesToPaths 는 루트만 "/", 나머지는 선행 슬래시 없이 준다 → 첫 세그먼트로 비교
    const first = p.replace(/^\//, "").split("/")[0];
    return !PRERENDER_EXCLUDE.includes(first);
  });
  // 동적 라우트(/blog/:slug)는 위에서 제외되므로, 실제 글 slug 로 경로를 확장해 프리렌더한다.
  const blogRoutes = PRERENDERED_POSTS.map((p) => `blog/${p.slug}`);
  return [...staticRoutes, ...blogRoutes];
}
