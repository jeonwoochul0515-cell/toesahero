# 네이버 검색 최적화 가이드 (퇴사히어로)

본 문서는 네이버 서치어드바이저 가이드 (https://searchadvisor.naver.com/guide) 와
국내 SEO 모범 사례를 따라 toesahero.com 이 네이버에서 최대한 잘 노출되도록 적용된
설정과 추가로 사용자가 진행해야 할 절차를 정리합니다.

---

## ✅ 코드에 이미 적용된 것

### 1. robots.txt — Yeti 봇 명시 환영
- `/robots.txt` 에 네이버 Yeti, 다음 Daum, 구글 Googlebot, 빙 bingbot 모두 환영
- 사이트맵 + RSS 피드 모두 명시
- 어드민(/admin), 마이페이지(/my), 결제(/checkout), API(/api) 는 Disallow

### 2. sitemap.xml — lastmod 포함
- 6개 핵심 URL (/, /calc, /blog, /faq, /terms, /privacy)
- 각 URL 의 lastmod, changefreq, priority 명시

### 3. RSS 피드 (`/rss.xml`)
- Cloudflare Pages Function으로 동적 생성
- Firestore 의 status='published' 블로그 글 30개 최신순
- 네이버 서치어드바이저 RSS 등록 가능

### 4. 페이지별 고유 메타 태그
- `usePageMeta()` 훅으로 각 페이지가 자체 title/description/canonical/og 가짐
- 홈, /blog, /blog/:slug, /faq, /calc 모두 고유 메타
- /my, /checkout, /admin 은 noindex (개인 정보 페이지)

### 5. JSON-LD 구조화 데이터
- **LegalService** (홈) — 변호사 사무소 정보
- **BreadcrumbList** (모든 sub 페이지) — 네이버 검색결과 경로 표시
- **FAQPage** (/faq) — 12문항 자동 등록 → 네이버 풍부한 검색결과
- **Article** (/blog/:slug) — 블로그 글마다 자동 생성

### 6. 한국어 키워드 풍부화
각 페이지마다 `keywords` 메타 태그에 한국어 검색어 5~10개 명시.

### 7. Open Graph
- 모든 페이지에 og:title, og:description, og:image, og:url, og:locale=ko_KR
- 카카오톡·페이스북 공유 시 풍부한 미리보기

### 8. Canonical URL
- 모든 페이지에 `<link rel="canonical">` (toesahero.com 기준)
- toesahero.pages.dev 에서 접속해도 canonical 은 toesahero.com 으로 — 검색 점수 통합

### 9. 사이트 소유 확인 메타
- `<meta name="naver-site-verification" content="..." />` (사용자가 추가 완료)

---

## 📋 사용자 진행 단계

### Step 1 — 네이버 서치어드바이저 사이트 등록 (5분)
1. https://searchadvisor.naver.com 접속 → 네이버 계정 로그인
2. 우측 상단 **웹마스터 도구** → **사이트 등록**
3. 사이트 URL 입력: `https://toesahero.com`
4. 소유 확인 방법: **HTML 태그** 선택
5. 표시되는 메타 태그가 이미 `index.html`에 들어가 있음 → **소유 확인** 클릭
6. www.toesahero.com 도 별도 등록 (선택)

### Step 2 — 사이트맵 제출
1. 등록된 사이트 → 좌측 **요청** → **사이트맵 제출**
2. URL: `https://toesahero.com/sitemap.xml` → 확인

### Step 3 — RSS 피드 제출
1. 좌측 **요청** → **RSS 제출**
2. URL: `https://toesahero.com/rss.xml` → 확인

### Step 4 — 웹페이지 수집 요청 (개별 URL 빠르게 인덱싱)
1. 좌측 **요청** → **웹페이지 수집**
2. 차례로 입력:
   - https://toesahero.com/
   - https://toesahero.com/calc
   - https://toesahero.com/blog
   - https://toesahero.com/faq

### Step 5 — 1~3일 후 검증
1. **검증 → robots.txt** : Yeti 봇 허용 ✓
2. **검증 → 웹페이지 최적화** : 각 페이지 점수 확인 (모두 ✓ 목표)
3. **수집 → 사이트맵** : 모든 URL 수집됨

### Step 6 — 다른 검색엔진도 등록
- **다음**: https://register.search.daum.net
- **빙**: https://www.bing.com/webmasters
- **구글**: https://search.google.com/search-console (Search Console)

---

## 🏆 콘텐츠 전략 — 변호사 본인이 작성

### 우선 게시할 블로그 글 5편

| # | 제목 | 핵심 키워드 | 분량 |
|---|---|---|---|
| 1 | 변호사 운영 퇴사대행과 노무사 운영 업체의 차이 — 2022 대법원 판결 이후 | 변호사법 109조, 노무사 한계 | 1,500자 |
| 2 | 사장님이 사직서를 받아주지 않을 때 — 변호사가 알려드리는 절차 | 사직서 거부, 사직 효력, 민법 660조 | 1,200자 |
| 3 | 5인 미만 사업장의 퇴직금·연차수당 — 사장도 모르는 5가지 | 5인 미만 사업장, 근로기준법 적용 | 1,300자 |
| 4 | 직장 내 괴롭힘 신고와 산재 신청 — 변호사가 동행해야 하는 이유 | 직장 내 괴롭힘, 산재, 위자료 | 1,500자 |
| 5 | 권고사직과 실업급여 — 회사가 거부할 때 변호사 협상 | 권고사직, 실업급여, 이직확인서 | 1,200자 |

### 작성 가이드 (네이버 검색 친화적)
- 제목 50자 이내, 핵심 키워드 앞쪽
- 첫 200자에 핵심 답변 (네이버 미리보기)
- 소제목 (h2/h3) 풍부하게
- 변협 광고규정 준수 (결과·금액 보장 X, 비교·할인 X)
- 마무리에 변호사 직접 상담 권유 (자연스럽게)
- 참고 법령/판례 명시 (신뢰도 ↑)

작성 후 어드민 `/admin/blog` 에서 게시 → RSS 자동 갱신.

---

## 🔍 모니터링

### 매주
- 서치어드바이저 → **수집 페이지 수**
- 네이버 검색 `site:toesahero.com` 결과

### 매월
- **검색어 분석** — 유입 키워드
- 상위 키워드 페이지 콘텐츠 강화

### 분기
- 모든 페이지 검색 점수 확인
- 부족 항목 보완

---

## 🚀 1년차 SEO 목표

| 시점 | 목표 |
|---|---|
| 1개월 | 사이트 + sitemap + RSS 모두 인덱싱. site:toesahero.com 10건+ |
| 3개월 | "퇴사대행 변호사", "변호사법 109조" 1페이지 진입 |
| 6개월 | 블로그 20편+, 롱테일 키워드 점유 |
| 12개월 | 월 자연 유입 1,000+ 세션, 상담 전환율 2%+ |

---

## 📚 참고

- [네이버 서치어드바이저 가이드 (공식)](https://searchadvisor.naver.com/guide)
- [네이버 서치어드바이저 웹마스터 가이드 — ppcle](https://ppcle.com/blog/web-dev/naver-webmaster)
- [네이버 SEO 최적화 5가지 — NNT](https://www.nnt-consulting.com/네이버-seo-최적화-필수-요소-5가지-총정리/)
- [robots.txt 완전 가이드 — TBWA](https://seo.tbwakorea.com/blog/robots-txt-complete-guide/)
- [네이버 서치어드바이저 등록 — TBWA](https://seo.tbwakorea.com/blog/naver-search-advisor/)
