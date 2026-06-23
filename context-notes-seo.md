# SEO 프리렌더 작업 — 컨텍스트 노트

작업 중 내린 결정과 근거를 계속 덧붙인다.

## 출발점 진단 (2026-06-23)
프로젝트는 Cloudflare Pages + Vite/React Router SPA. 네이버 SEO 가이드 대조 결과 대부분 충족:
- robots.txt(Yeti/Daum/Google/Bing + AI봇), 동적 sitemap.xml·rss.xml(Pages Function, Firestore 연동), 소유확인 메타, canonical, OG, JSON-LD(LegalService/Article/FAQ/Breadcrumb), 라우트별 메타 훅 `usePageMeta`.

미충족 핵심 2가지:
1. **SPA 프리렌더 없음** — `dist/index.html` body가 `<div id="root">`뿐. 라우트별 메타도 `usePageMeta`의 `useEffect`로 런타임 주입이라 초기 HTML엔 홈 메타만 존재. 가이드 #6가 가장 강조하는 항목.
2. **og:image가 SVG** — 네이버·카카오가 SVG OG를 자주 무시. PNG 필요(가이드 #7).

## 결정
- **프리렌더 도구 = vite-react-ssg**: 가이드가 명시적으로 권장. 빌드타임 정적 HTML화.
- **react-router 7 → 6 다운그레이드**: vite-react-ssg peer가 `react-router-dom ^6.14.1`. 앱이 쓰는 API(`BrowserRouter`/`Routes`/`Route`/`Navigate`/`Link`/`useNavigate`/`useParams`)는 전부 v6 동일 → 다운그레이드가 강제설치보다 안전. (사용자 승인됨)
- **메타 SSG 대응**: `useEffect` 부수효과는 SSG 렌더 시 실행 안 됨 → react-helmet-async `Head`(vite-react-ssg 제공)로 렌더 시점에 head 태그를 그려야 직렬화됨. `usePageMeta`가 head JSX를 반환하도록 바꾸고, 각 페이지가 반환 JSX에 embed.
- **프리렌더 제외 라우트**: admin/*, checkout/*, /my, 동적 `:slug`/`:id` 라우트는 `includedRoutes`로 제외. 블로그 글 본문은 Firestore 동적 → 빌드타임 프리렌더 안 함(sitemap이 URL 노출 + 클라 렌더 + Yeti JS 수집 의존).

## 구현 중 알게 된 사실 (중요)
- **`includedRoutes`는 vite.config의 `ssgOptions`로는 적용 안 됨**(vite `resolveConfig`가 커스텀 키를 보존 안 하는 듯). vite-react-ssg는 **server entry(main.tsx)의 named export `includedRoutes`**를 우선 읽는다(`serverEntryIncludedRoutes || configIncludedRoutes`). → main.tsx에서 `export function includedRoutes` 로 제공.
- **`routesToPaths`가 주는 path는 루트만 `"/"`, 나머지는 선행 슬래시 없음**(`"my"`, `"admin/login"`, `"checkout/:id"`). 필터는 첫 세그먼트(`p.replace(/^\//,"").split("/")[0]`)로 비교해야 한다.
- **중복 메타 방지**: `index.html` 템플릿에 박힌 per-route 태그를 Helmet이 또 그리면 프리렌더 산출물에 2개씩 생긴다. 템플릿에서 title/desc/keywords/robots/canonical/og/twitter를 제거하고 Helmet 전담으로. 검증 결과 desc/title 각 1개.
- **빌드 스크립트**: `vite build`로는 프리렌더 안 됨 → `vite-react-ssg build` 필수.
- 동적 라우트(`/blog/:slug`)는 프리렌더 제외 → 클라 렌더 + sitemap.xml(Firestore)로 URL 노출 + Yeti JS 수집에 의존.

## 최종 결과 (2026-06-23)
- 프리렌더 8개 공개 라우트: `/`, `/calc`, `/diagnose`, `/harassment`, `/small-business`, `/foreign-workers`, `/blog`, `/faq`.
- 각 `dist/<route>.html`에 `<div id="root" data-server-rendered="true">` + 전체 본문 마크업, 라우트별 고유 메타, OG(png), 라우트별 JSON-LD(FAQ/Breadcrumb/Article) 직렬화 확인.
- admin/checkout/my/terms/privacy는 프리렌더 제외(SPA fallback). MyPage/NotFound는 noindex 유지.
- 테스트 9/9, 빌드 무오류.

## 주의
- 기존 `checklist.md`/`context-notes.md`는 출시 관련 문서 → 건드리지 않고 `-seo` 접미사 파일 사용.
- `og-image.svg`는 더 이상 참조되지 않음(미삭제, 무해). 필요 시 정리 가능.
