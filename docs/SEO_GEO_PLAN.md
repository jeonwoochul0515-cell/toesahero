# 퇴사히어로 — SEO / GEO 개선 계획

**작성일**: 2026-06-17
**대상**: toesahero.com (Vite SPA + Cloudflare Pages + Firestore)
**GEO** = Generative Engine Optimization (ChatGPT·Claude·Perplexity·Gemini·네이버 Cue 등 AI 답변엔진 노출 최적화)

---

## 1. 진단 결과

### ✅ 이미 잘 된 것 (전통 SEO 기본기)
- 메타(description/keywords/author), OG, Twitter Card, canonical, theme-color
- robots.txt(Yeti/Daum/Googlebot/bingbot 환영, admin·my·checkout·api 차단)
- 정적 sitemap.xml(6 URL), 동적 RSS(`/rss.xml`, Firestore published 글)
- JSON-LD: **LegalService**(홈), **FAQPage**(/faq), **Article**(/blog/:slug), **BreadcrumbList**
- 네이버 서치어드바이저 site-verification, 페이지별 고유 메타(`usePageMeta`)

### 🔴 치명적 문제 — 클라이언트 렌더링(CSR)
- 서버가 주는 HTML은 `<div id="root"></div>` **빈 껍데기**. 본문은 브라우저 JS 실행 후 생성.
- 영향:
  - **구글**: JS 렌더링 하지만 예산·지연 손해.
  - **네이버 Yeti**: JS 렌더링 취약 → 본문 인식률 낮음(국내 최대 검색이 약점).
  - **AI 크롤러(GPTBot/ClaudeBot/PerplexityBot/Google-Extended/CCBot)**: **JS 거의 미실행 → 본문 0** → AI 답변에 인용될 콘텐츠가 없음.
  - **블로그 글**: Firestore에서 클라이언트 로딩 → 크롤러·LLM에 안 보임. 최대 SEO/GEO 자산이 통째로 비노출.

### 🟡 기타 갭
- `llms.txt` 없음 (GEO 표준 관행).
- sitemap이 **정적** → 블로그 글 URL 누락, `lastmod` 2026-05-04로 고정(신선도 신호 없음).
- robots.txt에 AI 크롤러 **명시 없음**(현재 `User-agent:*`로 허용은 됨 — GEO엔 허용이 맞음).
- FAQ/블로그가 안 보이니 schema의 FAQPage/Article도 본문 없는 마크업이 됨.

---

## 2. 최선의 대안 (우선순위 + 권장안)

> 제약: 전역 규칙상 **puppeteer 기반 프리렌더 금지**(react-snap/vite-plugin-prerender 류 ✗). 그래서 **Cloudflare Pages Functions 엣지 렌더링**으로 푼다 — 이 스택에 이미 있는 도구(`functions/`)와 정합.

### P0 — 본문을 크롤러·LLM에 노출 (가장 큰 레버리지)
**권장: 엣지 SSR 주입.** 봇/LLM 요청 시 CF Function이 본문이 채워진 HTML을 반환.
- **(A) `/blog/:slug` 엣지 SSR** — CF Function이 Firestore에서 글을 읽어 **본문 HTML + Article JSON-LD + 메타**를 완성해 반환. 블로그가 GEO·SEO 핵심 자산이므로 1순위.
- **(B) 홈·/faq 콘텐츠 정적 주입** — 핵심 카피·FAQ 12문항을 `index.html`(또는 라우트별 HTML)에 **서버에서 본문으로** 넣어 빈 root 문제 해소. (사람 사용자에겐 React가 hydrate, 봇에겐 이미 본문 존재.)
- 대안(비권장): Next.js/Astro 마이그레이션 = 효과 최고지만 대공사. 지금은 과함.

### P1 — GEO 표준 자산
- **`llms.txt` 생성** — 서비스 정의·핵심 페이지·자주 묻는 질문을 마크다운으로. LLM이 사이트를 이해/인용하기 쉬워짐.
- **동적 sitemap** — RSS처럼 CF Function으로 생성, **블로그 글 + 실제 lastmod** 포함.

### P2 — 마감 품질
- **robots.txt에 AI 크롤러 명시 허용** — GPTBot/ClaudeBot/PerplexityBot/Google-Extended/CCBot 명시(허용). admin·my·checkout·api는 계속 차단.
- **GEO 친화 콘텐츠 구조** — 블로그/FAQ를 "질문→직답→근거(법조문)→절차" 형식으로. 정의·수치·인용 가능한 사실 위주(LLM이 인용하기 좋은 형태). 변호사 저자 정보(E-E-A-T) 강화.
- **변협 광고규정 준수** — 콘텐츠에 할인/무료/환불/승소보장 표현 금지(별도 결정 완료).

### 효과·난이도 한눈에
| 항목 | GEO 효과 | SEO 효과 | 난이도 | 우선 |
|---|---|---|---|---|
| 블로그 엣지 SSR | ★★★ | ★★★ | 중 | P0 |
| 홈·FAQ 본문 주입 | ★★★ | ★★ | 중 | P0 |
| llms.txt | ★★ | ★ | 하 | P1 |
| 동적 sitemap | ★ | ★★ | 하 | P1 |
| robots AI 명시 | ★ | ★ | 하 | P2 |
| 콘텐츠 Q&A 구조화 | ★★★ | ★★ | (지속) | P2 |

---

## 3. 사장님이 할 일 (사람만 가능)

| # | 액션 | 소요 | 필요한 것 | 우선 |
|---|---|---|---|---|
| S1 | 구글 서치콘솔 등록 + sitemap 제출 | 15분 | 구글계정·도메인 | 🟢 즉시 |
| S2 | 네이버 서치어드바이저에 **동적 sitemap·RSS 재제출** | 10분 | 네이버계정 | 🟢 P1 후 |
| S3 | 빙 웹마스터 등록(= ChatGPT/Copilot 인덱스 기반) | 10분 | MS계정 | 🟢 즉시 |
| S4 | 블로그 글 **월 4편** 작성 방향 확정(질문형 제목·법조문 근거) | 지속 | 변호사 검토 | 🟡 지속 |
| S5 | 변호사 외부 인용 자산 늘리기(칼럼 기고·프로필 일관성) | 지속 | — | 🔵 지속 |
| S6 | 아래 Cowork 프롬프트를 **하나씩** 코딩 에이전트에 붙여넣어 실행 | — | 이 문서 | 🟢 즉시 |

> GEO는 "남이 나를 인용"이 핵심이라 S4·S5(콘텐츠·외부 인용)가 장기 승부처. 기술(S6)은 토대.

---

## 4. Cowork 프롬프트 (코딩 에이전트에 붙여넣기 — 하나씩 순서대로)

각 프롬프트는 이 리포(`design_handoff_toesahero`)에서 작업하는 에이전트용. **하나 끝나고 빌드·확인 후 다음으로.**

### 프롬프트 1 — robots.txt AI 크롤러 명시 + 동적 sitemap (가장 쉬움, 먼저)
```
toesahero 프로젝트에서 GEO를 위해 두 가지를 해줘.
1) public/robots.txt에 AI 크롤러를 명시적으로 허용 추가: GPTBot, ClaudeBot, Claude-Web,
   PerplexityBot, Google-Extended, CCBot, Bytespider. 각 봇은 Allow:/ 하되
   /admin/ /my /checkout /api/ 는 Disallow. 기존 Yeti/Daum/Googlebot/bingbot 규칙은 유지.
2) 정적 public/sitemap.xml 대신 동적 sitemap을 functions/sitemap.xml.ts(CF Pages Function)로 만들어줘.
   functions/rss.xml.ts와 같은 패턴으로 Firestore의 posts(status=published)를 읽어
   /blog/:slug URL과 각 글의 publishedAt을 lastmod로 포함하고, 고정 페이지(/ /calc /blog /faq /terms /privacy)도 넣어줘.
   robots.txt의 Sitemap 라인은 그대로 https://toesahero.com/sitemap.xml 유지(이제 함수가 응답).
   _routes.json에 /sitemap.xml이 함수로 가도록 필요한 설정 확인. npm run build로 검증.
```

### 프롬프트 2 — llms.txt 추가
```
toesahero 프로젝트에 GEO용 llms.txt를 만들어줘.
- 정적이면 public/llms.txt, 블로그까지 자동 반영하려면 functions/llms.txt.ts(Firestore posts 읽기) 중
  더 적합한 쪽으로(블로그 글이 늘어나니 함수 권장).
- 내용(마크다운): 서비스 한줄 정의(변호사 직접 운영 합법 퇴사대행), 운영 주체(법률사무소 청송 김창희 변호사),
  핵심 페이지 링크(/ /faq /calc /blog), 대표 FAQ 5개를 "질문: / 답: " 형식으로,
  연락처(1660-4452). 할인/무료/환불/승소보장 등 변협 금지 표현은 절대 넣지 말 것.
- text/plain 또는 text/markdown으로 응답. npm run build 검증.
```

### 프롬프트 3 — 홈·FAQ 본문 정적 주입 (빈 root 문제 해소)
```
toesahero는 Vite SPA라 서버 HTML의 <div id="root">가 비어 있어 봇/LLM이 본문을 못 본다.
puppeteer 기반 프리렌더는 금지다(전역 규칙). 대신 다음으로 해결해줘.
- index.html의 <div id="root"> 안에, 홈 핵심 카피와 /faq 12문항을 "서버에서 보이는 정적 본문"으로 넣어줘.
  React가 마운트되면 어차피 교체되므로 사용자 화면엔 영향 없고, 봇/LLM·noscript에겐 본문이 보인다.
- 또는 더 깔끔하면 빌드 시 홈/faq의 핵심 텍스트를 index.html에 주입하는 작은 vite 플러그인(노드 only, puppeteer 금지)으로 처리.
- FAQ 본문은 기존 FAQPage JSON-LD의 질문/답과 일치시켜라.
- 본문 텍스트에 변협 금지 표현(할인/무료/환불/승소보장) 금지.
- 빌드 후 `curl`로 서버 HTML에 본문 텍스트가 실제로 들어갔는지 검증해서 보여줘.
```

### 프롬프트 4 — 블로그 글 엣지 SSR (최대 레버리지)
```
toesahero의 블로그 글이 Firestore 클라이언트 로딩이라 크롤러·LLM에 안 보인다. GEO/SEO 핵심 자산이므로
/blog/:slug를 Cloudflare Pages Function으로 엣지 SSR 해줘.
- 봇/일반 모두에게, Firestore posts(slug 매칭, status=published)에서 글을 읽어
  완성된 HTML(제목 h1, 본문 마크다운→HTML, 작성일, 변호사 저자 정보)을 반환.
- <head>에 글별 title/description/canonical/OG + Article JSON-LD(author=김창희 변호사) 포함.
- 사람 사용자 경험 유지를 위해 기존 React 앱으로의 hydrate 경로도 깨지 않게(앱 진입 link 포함) 처리.
- Firestore 읽기는 서버에서 안전하게(서비스계정 또는 공개 read 규칙 활용 — 현재 posts published는 공개 read 가능).
- 마크다운 변환은 가벼운 라이브러리 또는 직접. XSS 이스케이프 주의.
- 변협 광고규정: 본문은 글 내용 그대로, 시스템이 할인/보장 문구 추가 금지.
- 빌드·배포 후 `curl https://toesahero.com/blog/<slug>`로 본문이 HTML에 박혀 나오는지 검증.
```

### 프롬프트 5 (선택) — GEO 콘텐츠 구조 가이드 반영
```
toesahero 블로그/FAQ를 GEO에 인용되기 좋은 구조로 정리하는 작성 가이드를 docs/CONTENT_GEO_GUIDE.md로 만들어줘.
- 형식: 질문형 제목 → 첫 문단에 2~3문장 직답(LLM이 발췌하기 좋게) → 근거 법조문/판례 → 절차 단계 → 요약.
- 변호사 저자 E-E-A-T 강화 요소(자격·경력 명시) 포함.
- 변협 광고규정 금지 표현 체크리스트 포함(할인/무료/환불/최저가/승소보장 등).
- 기존 글을 이 형식으로 리라이트하는 예시 1개 포함.
```

---

## 5. 권장 실행 순서

```
프롬프트1(robots+sitemap) → 프롬프트2(llms.txt) → 프롬프트3(홈·FAQ 주입)
→ 프롬프트4(블로그 SSR, 최대효과) → S1·S2·S3(검색엔진 등록) → 프롬프트5 + S4·S5(콘텐츠 지속)
```

쉬운 것(1·2)으로 토대를 깔고, 큰 효과(4)로 마무리. 등록(S1~S3)은 기술 반영 후. 장기 승부는 콘텐츠(S4·S5).
