# 네이버 SEO 최적화 체크리스트 — 프리렌더 도입

> 기준: `~/.claude/NAVER_SEO_최적화_가이드.md`. 현재 프로젝트는 가이드 대부분 충족. 미충족 핵심 2가지(SPA 프리렌더, og:image 래스터)를 처리한다.

## 결정된 방향
- 프리렌더: **vite-react-ssg 전면 도입** (가이드 #6 권장 도구)
- 라우터: **react-router-dom 7 → 6 다운그레이드** (vite-react-ssg peer = v6, 앱 API는 전부 v6 호환)
- og:image: **1200×630 PNG 신규 생성**

## 작업
- [x] 계획/컨텍스트 노트 작성
- [x] `react-router-dom` 7→6.30.4, `vite-react-ssg`@0.9.0(react-helmet-async 번들) 설치 → `npm ls` 확인
- [x] `App.tsx`: JSX `<Routes>` → `routes` 배열(RouteRecord[]). `AdminAuthProvider`를 루트 레이아웃 라우트로
- [x] `main.tsx`: `ViteReactSSG` 엔트리 + `includedRoutes` **named export**로 admin/checkout/my/약관/`:동적` 프리렌더 제외
- [x] `package.json` build/dev 스크립트 `vite` → `vite-react-ssg`
- [x] `usePageMeta`(.ts→.tsx): `useEffect` 주입 → `Head`(react-helmet-async) 렌더 반환으로 전환
- [x] 11개 페이지: `usePageMeta(OBJ)` → `const seo = usePageMeta(OBJ)` + 반환 head를 JSX에 embed (MyPage는 noindex 신뢰성 위해 3분기 모두)
- [x] `index.html`: per-route 태그(title/desc/keywords/robots/canonical/og/twitter) 제거 → Helmet 전담(중복 방지)
- [x] `og-image.png`(1200×630) 생성, og:image/image 경로 `.svg`→`.png`
- [x] `public/_routes.json` exclude에 `og-image.png` 반영
- [x] `npm run build` 통과 + `vitest` 9/9 통과
- [x] dist 검증: 8개 공개 라우트만 프리렌더, 본문 HTML + 라우트별 고유 title/desc/canonical/OG, 중복 0, FAQ JSON-LD 직렬화 확인

## 검증 기준 (success criteria)
1. `dist/index.html`, `dist/calc/index.html`, `dist/faq/index.html` 등 `<div id="root">` 안에 실제 본문 마크업 존재.
2. 각 라우트 HTML의 `<title>`·`<meta name=description>`·`<link rel=canonical>`이 라우트별로 **서로 다름**.
3. admin/checkout/my는 프리렌더 산출물 없음(또는 noindex).
4. og:image가 `.png` 절대경로.
