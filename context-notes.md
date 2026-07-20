# 퇴사히어로 출시 — 결정 노트 (Context Notes)

작업 중 내린 결정과 그 이유를 계속 append한다. 다음 세션이 재추론 없이 이어가기 위함.

## 배경 (2026-06-14)
- 사용자가 "출시 단계까지 계획 + 토스페이먼츠 연결 + SOLAPI 이벤트 문자"를 요청.
- 사용자 확인 사항: **토스 가맹 승인 완료 + 실 키 보유**. 이번 작업 범위는 **계획 문서만** (코드 미구현).
- 따라서 본 세션 산출물: `docs/LAUNCH_PLAN.md`, `checklist.md`, `context-notes.md` 3종. 코드 변경 없음.

## 코드 실측 결과 (가정 아님)
- 토스 결제는 골격 존재: `src/pages/CheckoutPage.tsx`(클라, SDK v1 `requestPayment`) + `functions/api/payment/confirm.ts`(서버 승인).
- `confirm.ts`는 **승인만** 하고 Firestore 미반영. 주석에 "webhook 또는 어드민이 반영"이라 명시했으나 **webhook 파일 없음**.
- `firestore.rules`: `consultations` update 허용 필드에 `paymentStatus`,`paymentKey`,`paymentApprovedAt`,`paymentOrderId` 포함. 단 update는 `isAdmin()` 조건 → **클라이언트가 결제상태 직접 못 씀**. 그래서 서버 쓰기 경로가 반드시 필요.
- `confirm.ts`가 클라이언트 `amount`를 그대로 신뢰 → 금액 위변조 취약. 토스 표준(서버가 금액 소유) 미적용.
- 이메일 발송 함수 존재(`functions/api/send-letter.ts`, Resend 기반). 문자(SMS)는 없음 → SOLAPI 신규.

## 미결 결정 (다음 세션에서 확정 필요)

### D-1. 서버에서 Firestore에 결제상태를 어떻게 쓸 것인가
- 제약: Cloudflare Pages Functions(Workers 런타임)는 Node `firebase-admin` SDK 구동이 까다로움.
- **권장안**: Firebase REST API(`firestore.googleapis.com`) + 서비스계정 JWT로 서버 토큰 발급해 쓰기. 또는 Google OAuth2 service-account access token을 Workers에서 생성(`jose`로 JWT 서명).
- 대안: webhook을 받아 별도 Firebase Cloud Function(Node)에서 처리 → 인프라 이원화 부담.
- 결정: **REST + 서비스계정** 우선 검토. 서비스계정 키는 CF env(서버)로만.

### D-2. 테스트 전략
- 현재 테스트 프레임워크 없음(package.json에 test 스크립트 없음).
- 결제 confirm의 금액대조·멱등 로직만이라도 Vitest 단위 테스트 추가 권장. 그 외는 수동 E2E 체크리스트(M4).

### D-3. SOLAPI 채널 종류
- SMS/LMS(단문·장문) vs 카카오 알림톡. 발신번호 등록은 공통, 알림톡은 추가로 채널·템플릿 사전심사 필요.
- **권장**: 출시 1차는 변호사 수신용 **SMS/LMS**로 단순하게. 의뢰인 대상 대량 발송 단계에서 알림톡 도입.
- ROADMAP의 "카카오 알림톡(Sender ID 인증)" 항목과 연결 — SOLAPI가 알림톡 발송사 역할 가능.

## SOLAPI 연동 설계 (요청 반영)
- 이벤트 → 문자 발송. CF Pages Function 서버에서 호출(시크릿 보호).
- 공통 함수 `functions/api/_notify.ts`: SOLAPI REST(`https://api.solapi.com/messages/v4/send`), HMAC 서명 인증(API Key/Secret + date + salt).
- 발송 트리거 지점:
  1. 신규 상담 신청 — 현재 클라가 Firestore에 직접 create. 서버 알림을 붙이려면 (a) 클라가 알림 엔드포인트도 호출, 또는 (b) Firestore 트리거. CF만 쓰면 (a)가 단순.
  2. 결제 완료/실패 — confirm·webhook 서버 경로에서 직접 호출(가장 신뢰성 높음).
- 수신번호: `ALERT_TO_PHONE`(변호사). 발신번호: SOLAPI 사전 등록 `SOLAPI_SENDER`.
- 비용/실패 대비: 발송 실패해도 결제 본 흐름은 막지 않도록 try/catch 격리.

## 구현 완료 기록 (2026-06-14, 코드 진행)
"계획대로 진행" 지시로 M1(결제 코드) + SOLAPI를 구현. D-1은 **서비스계정 REST** 채택.

신규/변경 파일:
- `functions/api/_firestore.ts` — 서비스계정 OAuth2(JWT RS256, Web Crypto) → Firestore REST. `getDoc/createDoc/patchDoc`. 보안규칙 우회(IAM).
- `functions/api/_notify.ts` — SOLAPI `messages/v4/send`, HMAC-SHA256 인증. 설정 누락/예외 시 조용히 skip.
- `functions/api/payment/_packages.ts` — 서버 소유 가격표(basic 199k/pro 390k/max 790k).
- `functions/api/payment/_reflect.ts` — `reflectPaid`/`reflectCanceled` 멱등 반영 + 문자.
- `functions/api/payment/order.ts` — 주문 생성(서버가 금액 결정·저장), `{orderId, amount}` 반환.
- `functions/api/payment/confirm.ts` — 재작성. 저장주문 조회 → 멱등 → 금액대조 → 토스 승인 → reflect.
- `functions/api/payment/webhook.ts` — 토스 재조회로 상태 확정 후 reflect. 항상 200 반환.
- `functions/api/notify.ts` — 클라가 상담 저장 후 호출하는 알림 엔드포인트.
- `firestore.rules` — `orders` 컬렉션 추가(read=owner/admin, write=false → 서버만).
- `src/pages/CheckoutPage.tsx` — `startPayment`이 `/api/payment/order` 경유하도록 수정(클라 금액 미신뢰).
- `src/firebase.ts` — `notifyNewConsultation` 헬퍼 + 3개 저장함수(notice/draft/consultation)에 연결.
- `.env.example` — `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`, `SOLAPI_*`, `ALERT_TO_PHONE` 추가.

검증: `npm run build`(tsc -b + vite) 통과. functions는 tsconfig `include:["src"]`에서 제외되어 로컬 tsc 미검사 — CF Pages 빌드 시 검사됨(기존 함수들과 동일 패턴).

남은 일(사람/운영): CF env 등록(서비스계정 JSON·SOLAPI·토스 실키), Firestore 규칙 콘솔 게시, SOLAPI 발신번호 등록, 토스 webhook URL 등록, M4 테스트키 E2E, M5 실키 전환. M2 법무(사업자정보·환불정책·약관·변협심의)는 코드 무관.

## 주의 / 함정
- 시크릿(`TOSS_SECRET_KEY`, `SOLAPI_API_SECRET`, 서비스계정 키)은 **GitHub 커밋 금지**, CF Pages env에만.
- webhook은 페이로드만 믿지 말고 토스 결제 재조회로 상태 확정.
- 실 키 전환(M5)은 테스트 E2E(M4) 통과 후에만.
- `CheckoutPage.tsx`의 "결제 인프라 미설정" 안내 분기는 라이브 전 제거.
- `/api/notify`는 인증 없는 공개 엔드포인트 → 이론상 문자 스팸 가능. 우려 시 레이트리밋·Turnstile 도입 검토. 현재는 MVP로 무방비.

---

# 따뜻한 브루탈리즘 리톤 (2026-07-09)

## 방향 (사용자 확정)
- "사이트 전체에 전문가의 따듯한 위로 + 전문성이 느껴지게" → **따뜻한 브루탈리즘** 선택.
- 장르(네오브루탈리즘) **유지**. 전면 리디자인/세리프 전환 금지 (메모리 `toesahero-keep-brutalism-mz`와 일치).
- 레버 3개만: ① 팔레트 토큰 온화, ② 하드 섀도우/잉크 웜톤화, ③ 도발 카피 → 공감+전문가 보이스.
- 레이아웃 구조·컴포넌트 구성은 건드리지 않음 (surgical).

## 팔레트 결정 (styles.css :root)
- --yellow #ffd60a(형광) → #F2C14E 머스터드
- --orange #ff6b35(쨍) → #E07856 테라코타
- --ink/--line #0a0a0a(순검정) → #241C15 웜 다크브라운 (테두리·섀도우 차가움 완화)
- --cream #fffbf0 → #FBF7EF, --muted #6b6b6b → #6f665a
- 섀도우: 하드 오프셋(0 blur) **유지**(시그니처), 6px→5px, 웜잉크색.
- data-palette 프리셋(mint/peach/lilac)은 사용자 비노출 → 손대지 않음.

## 카피 보이스 원칙
- Before: 도발·명령·불안 자극. After: 공감으로 열고 → 전문가가 옆에 있다는 안심 → 근거(경력/건수)로 전문성.
- 규제 업종: 단정·과장·승률 금지. 온도만 올리고 법무 신뢰 유지.

## 작업 로그
- styles.css `:root` 팔레트 온화 완료(yellow #f2c14e / orange #e07856 / ink #241c15 / cream #fbf7ef / paper #fffdf8 / muted #6f665a). 다크모드 토큰은 비노출이라 미변경.
- 섀도우 --shadow 6→5px, --shadow-lg 10→8px. 하드 오프셋(0 blur)·시그니처 h1-mark 틸트는 유지.
- 잔여 하드코딩색 처리: floater pulse rgba→테라코타(224,120,86), bg-goodbye rgba→머스터드(242,193,78). Kakao 브랜드색(#fee500/#191919)은 유지.
- Hero boss variant → 승인 카피("퇴사, 혼자 / 결정하지 마세요 / 변호사가 옆에서 같이 갑니다"). soft/legal도 톤 온화.
- Audience eyebrow/h2/lead 공감 톤으로("혼자 삭이지 마세요", "변호사가 먼저 듣겠습니다").
- Assurance/DraftHook/Footer/Lawyer는 기존 카피가 이미 충분히 따뜻해 미변경(surgical).
- `npm run build` 통과. 브라우저 육안 확인(Hero/Audience/Calculator다크/Pricing/Footer) 모두 웜톤 일관·대비 양호.

## 다음 세션 주의
- 이 팔레트가 현재 "의도된 컨셉"이다. 형광 #ffd60a/#ff6b35로 되돌리지 말 것. 메모리 `toesahero-keep-brutalism-mz` 갱신됨.

---

# 라이트하우스 Performance/SEO 최적화 (2026-07-17)

## 배경
- 네이버 웹마스터도구에서 "퇴직대행" 키워드 노출 246회/클릭 2회(CTR 0.8%) 확인 — title/description/본문 어디에도 "퇴직대행" 문자열이 없어 검색결과 텍스트 매칭이 안 됨.
- 사용자가 "라이트하우스 99점 될때까지 루프" 요청. 범위 합의: Performance+SEO만, 홈/faq/calc/diagnose 4페이지, 로컬 측정만(배포는 매번 확인 후).

## 함정: 첫 측정은 완전히 무효였음
- `vite preview --port 4173`이 이미 그 포트를 쓰던 무관한 다른 프로젝트(`~/.antigravity/hakjum`, "학점나비")와 충돌 → `--strictPort`로 내 서버는 EADDRINUSE로 조용히 죽었는데 curl은 계속 200을 반환(기존 hakjum 서버가 응답). 첫 라운드 "SEO 66점, FCP 32초" 등은 전부 toesahero가 아닌 학점나비 측정값이었음 — 폐기.
- 원인: Bash 도구에서 `&`로 백그라운드 실행한 프로세스는 다음 tool call(별도 셸)에서 이미 죽어 있음. `run_in_background: true` 옵션으로 재시작해야 지속됨.
- **다음 세션 교훈**: 로컬 서버로 뭔가 측정하기 전에 반드시 응답 내용(타이틀/고유 텍스트)으로 "내가 의도한 프로젝트가 맞는지" 검증할 것. 포트 재사용 환경에서 curl 200만으로는 안전하지 않음.

## 실제 발견 & 수정 (surgical, 비주얼 변경 없음)
1. **폰트 이중 로딩** — `index.html`에 구글폰트(Space Grotesk)·jsdelivr CDN(Pretendard 전체 굵기, 무서브셋 1.5MB+)가 `<link>`로 박혀 렌더 블로킹 중이었는데, `main.tsx`가 이미 같은 폰트를 npm 패키지(`pretendard`, `@fontsource-variable/space-grotesk`)로 self-host 서브셋 로딩 중이었음 — CDN 링크 완전 제거(중복이라 기능 손실 없음).
2. **변호사 프로필 사진** — `/lawyer-changhee.png` 490KB → ffmpeg(`-c:v libwebp -quality 82`)로 `.webp` 19KB 변환(96% 절감), 화질 육안 확인 이상無. `Lawyer.tsx` src 교체, `public/_routes.json`(Cloudflare 정적자산 제외 목록)도 갱신, 원본 PNG 삭제.
3. **메인 JS 번들 분리** — `App.tsx`에서 admin/*에만 적용되던 `lazy()` 패턴을 `MyPage`·`CheckoutPage`(이미 프리렌더 제외 대상이라 무위험)·`BlogList`/`BlogPost`(react-markdown+remark-gfm 포함, 프리렌더 대상이라 빌드 후 실제 HTML에 본문 내용 있는지 확인 완료)까지 확장. 메인 번들 1,141KB→976KB(-14%).
4. **"퇴직대행" 키워드 반영** — `Home.tsx`/`FAQPage.tsx`의 title(괄호 병기: "퇴사대행(퇴직대행)")·description·keywords에 추가.

## 측정 결과 (로컬 vite preview, 동일 sandbox)
| 페이지 | Perf(1차→최종) | SEO | FCP(1차→최종) | LCP(1차→최종) | 전송량 |
|---|---|---|---|---|---|
| home | 55→54 | 100 | 15.5s→6.2s | 19.9s→8.3s | 3,146KB→1,035KB |
| faq | 56→59 | 100 | -→7.0s | -→8.8s | -→936KB |
| calc | 58→54 | 100 | -→6.7s | -→8.1s | -→873KB |
| diagnose | 58→**95** | 100 | -→2.3s | -→2.3s | -→791KB |

## 중요: 로컬 Lighthouse 점수는 이 샌드박스에서 신뢰 불가
- diagnose가 calc와 거의 동일한 코드/전송량인데 점수만 54 vs 95로 요동 — 같은 코드를 반복 측정해도 headless Chrome CPU 스로틀링 보정치가 공유 가상환경 노이즈로 흔들림.
- FCP/LCP/전송량(실측 지표)은 확실히 개선(최대 3~4배)됐지만, "라이트하우스 몇 점"이라는 숫자 자체를 이 로컬 환경에서 99까지 반복 튜닝하는 건 신호 대비 노이즈가 너무 커서 비생산적 판단.
- **다음 세션 권장**: 배포 후 PageSpeed Insights(실제 네트워크·구글 서버)로 재측정. 로컬에서 더 밀어붙이려면 안정적인 데스크톱 프리셋(`--preset=desktop`)이나 동일 조건 3회 평균으로 노이즈를 줄일 것.

## 남은 최적화 후보 (미착수, 리스크 있어 보류)
- `src/firebase.ts`(auth+firestore+storage 통합, ~20개 컴포넌트가 import)가 홈/calc/diagnose 메인 번들에 그대로 포함됨 — Firebase Auth iframe/GAPI 로더가 초기 로드에 얹힘. 분리하려면 auth/firestore 모듈 분리 리팩터 필요 — 결제·상담 저장 플로우와 얽혀 있어 신중한 검증 없이는 보류 권장.
- `app-*.css`(26KB) 렌더 블로킹 — critical CSS 추출 도구(critters 등) 도입은 별도 논의 필요.

---

# SEO·GEO·AEO 가이드 대조 점수 후속 조치 (2026-07-17)

## 진단 리포트 대비 3개 조치 항목 처리 결과

**1. CalcPage h1 중복 — 실제로는 문제 아니었음(정정)**
- 소스에 h1이 2군데(접수완료 상태 / 폼 상태) 있어 "중복"으로 처음 보고했으나, `submitted` state는 클라이언트 상호작용 이후에만 true가 되고 SSG 프리렌더 시점엔 항상 false → `dist/calc.html` 실제 출력엔 h1이 정확히 1개("미지급 항목 자동 계산기")만 존재함을 확인. 검색엔진이 받는 HTML엔 문제 없음. **코드 변경 안 함.**
- 교훈: 소스 코드의 조건부 렌더링 분기는 실제 프리렌더 출력(`dist/*.html`)까지 확인해야 함. 소스만 보고 "중복"이라 판단한 최초 리포트가 오탐이었음.

**2. 질문형(H2/H3) 헤딩 — 최초 감사가 과소평가했음(정정) + 카피 수정은 보류**
- 최초 진단에서 "FAQ 외엔 질문형 헤딩 전무"라고 썼으나, `Assurance.tsx`에 이미 h3 질문 4개가 존재함을 재확인 못하고 놓쳤음(`"통보한 뒤에도 회사가 계속 연락하면 어떡하죠?"` 등 구어체 실제 우려사항 그대로 h3로 노출, 바로 아래 답변). 실제 AEO 점수는 최초 리포트보다 높게 잡아야 함.
- `Process.tsx`/`Compare.tsx`의 h2는 `mark-hl` 하이라이트 스팬을 쓰는 브랜드 헤드라인 시스템의 일부("카톡 문의 한 번으로 4단계 절차", "혼자 vs 노무사 vs 변호사 직접 운영") — 이전 세션에 사용자 승인 거쳐 톤을 맞춘 카피([[toesahero-de-ai-refinement]] 계열)라 임의로 "~인가요?" 질문형으로 바꾸지 않음. 또한 법률사무소 광고이므로 문구 변경은 변협 광고심의 관점에서도 사용자 확인이 먼저 필요(`checklist.md` M2 미완료 항목과 동일 사유).
- **보류 이유**: 브랜드보이스·광고심의 둘 다 사용자 승인이 필요한 영역이라 자동 루프로 처리하지 않음. 다음에 진행하려면 문구 초안을 먼저 제시하고 승인받을 것.

**3. GEO 실제 노출 베이스라인 체크 — 실시함, 결과 안 좋음**
- 실제 검색으로 확인(WebSearch): "퇴직금 미지급 대처법 변호사", "퇴사대행 변호사 추천" 두 현실적 타깃 질의 모두 toesahero.com **미노출**. 상위에는 대륜/YK/제이씨엘파트너스/메가로이어스 등 기존 대형 로펌 콘텐츠가 차지.
- 결론: 기술적 GEO 세팅(크롤러 허용·구조화데이터·인용)은 다 돼있지만, **실제 노출/인용은 이제 막 시작 단계**. 이건 코드로 하루아침에 고쳐지는 게 아니라 콘텐츠량·백링크·도메인 신뢰도가 쌓여야 하는 장기 경쟁 — 매일 자동발행 블로그가 그 축적 수단이니 계속 유지할 것.
- **다음 세션 운영 루틴 제안**: 월 1회 정도 아래 같은 타깃 질의를 ChatGPT/Perplexity/Gemini에 직접 물어보고 toesahero 언급 여부 기록. 예시 질의: "퇴사대행 어떻게 하나요", "퇴직금 미지급 대처법", "권고사직 실업급여 조건", "직장 내 괴롭힘 신고 절차 변호사". 이건 API로 자동화 못 하고 사람이 직접 확인해야 함.

## 정정된 점수 감각
- AEO는 Assurance.tsx 재발견으로 최초 리포트(60점)보다 실제로는 소폭 높음.
- 다만 GEO의 "실제 인용/노출"은 체크리스트상 PASS였던 기술 항목들과 별개로, 실전 성과는 아직 약함 — 체크리스트 100% 채워도 실제 순위·인용은 보장 안 된다는 걸 이번에 실측으로 확인.

## 후속 조치 실행 (같은 날, 사용자 승인 후)

**구글/빙 서치콘솔 — 이미 완료돼 있었음(확인만 함)**
- 브라우저로 직접 로그인 상태 확인. `search.google.com/search-console`: `https://toesahero.com` 속성이 "도메인 이름 공급업체"로 이미 자동 소유권 인증돼 있었고, `sitemap.xml`(15개 URL)·`rss.xml`(6개) 둘 다 상태 "성공"으로 이미 제출·처리 완료.
- `bing.com/webmasters`: `sitemap.xml`(15)·`rss.xml`(5)·구버전 `www.toesahero.com/sitemap.xml`(6) 3개 전부 "Success", URL 26개 발견. IndexNow도 메뉴에 연동 확인.
- **결론: 이 항목은 이전 세션에 이미 처리돼 있었고, 이번엔 브라우저로 로그인해서 실제 상태를 확인만 한 것.** 코드에서는 계정 로그인 여부를 알 수 없어 지난 리포트에 "확인 불가"로 적었던 부분.

**빙 AI Performance — 실측 데이터로 GEO 약점 재확인**
- Bing Webmaster Tools의 `AI Performance` 탭(Copilot 등 AI 답변에서 실제 인용된 횟수를 빙이 직접 집계)에서 2026-06-25~07-15 3주간 **Total Citations = 0**. WebSearch로 확인했던 "실제 검색 미노출" 결과와 정확히 일치하는 1차 데이터.
- 이 탭은 앞으로 GEO 성과를 추적할 수 있는 공식 대시보드이므로, 다음에 콘텐츠·백링크를 더 쌓은 뒤 이 숫자가 0에서 올라가는지로 진척을 판단하면 됨.

**질문형 카피 3건 — 반영, 브랜드 톤 유지 확인**
- `Process.tsx` h2: "카톡 문의 한 번으로 4단계 절차" → "퇴사대행은 **어떻게 진행되나요?**"
- `Compare.tsx` h2: "혼자 vs 노무사 vs 변호사 직접 운영" → "노무사와 변호사, **뭐가 다를까요?**"
- `Calculator.tsx`(홈 위젯) h2: "놓치고 있을 수 있는 청구 항목 체크리스트" → "혹시 놓치고 있는 청구 항목 **있지 않을까요?**"
- `mark-hl` 하이라이트 스팬 패턴·2줄 구조 그대로 유지, 브라우저 스크린샷으로 레이아웃·톤 확인함.
- **일부러 안 바꾼 것**: `Lawyer.tsx`의 변호사 인용문("퇴사도 협상이고...")은 따옴표로 감싼 개인 발언 장치라 질문형으로 바꾸면 어색해서 유지. `DraftHook.tsx`의 CTA 헤드라인도 전환 유도 문구라 정보성 질문으로 바꾸지 않음 — AEO는 "정보성 질의에 답하는" 헤딩에만 적용하는 게 맞다고 판단.
- `npm run build` + `npm test`(9 pass) 통과, 브라우저로 3개 섹션 스크린샷 확인 완료.

---

# 신규 페이지 3종 — 데이터랩·검색광고 실측 기반 전략 실행 (2026-07-17)

## 배경
`toesahero-strategy-final` 리포트(검색량+24개월 데이터랩 추이+심층 리서치+변호사법 23조 확인+파워링크 실측)의 최종 권고를 실행. 사용자가 "실업급여는 면책문구 잘 보이게 해서 만들고, 추천대로 진행"이라고 명시적으로 결정 — 리서치에서 "변호사 확인 필요"로 보류 권고했던 항목을 사용자가 직접 승인.

## 신규 파일
- `src/pages/UnemploymentCalcPage.tsx` (`/unemployment-calc`) — 실업급여(구직급여) 예상액 계산기.
  - 2026년 기준 상한액 68,100원/하한액 66,048원(최저임금 10,320원×80%×8h) 실측 확인(WebSearch, financialwook.co.kr 등).
  - 소정급여일수는 고용보험법 §50 별표1(가입기간×연령, 120~270일) 로직 그대로 구현, `benefitDays()` 함수로 하드코딩.
  - **면책문구 2단 배치**: 결과카드 내 짧은 문구(`calc-disclaimer`) + 페이지 하단 강조 박스(`calc-foot`에 orange 3px 테두리 인라인 오버라이드, "⚠" 아이콘+굵은 경고 문장을 본문보다 먼저 배치) — 변호사법 제23조 제2항 제3호("부당한 기대" 금지) 대응.
  - 계산 검증: 월급 300만·35세·가입 3년 → 1일 66,048원×180일=11,888,640원, 수기 검산 일치.
  - `saveConsultation` 재사용(신규 백엔드 없음), source:"form", meta.tool:"unemployment-calc"로 리드 구분.
- `src/pages/ResignationLetterPage.tsx` (`/resignation-letter`) — 사직서 양식 3종(일반/즉시퇴사/권고사직 확인서), 클립보드 복사 버튼. 권고사직 양식은 이직사유 서면화를 강조해 실업급여 페이지와 자연 연결.
- `functions/sitemap.xml.ts`의 `STATIC_PAGES`에 두 경로 추가(안 하면 사이트맵 누락).
- `src/App.tsx`에 두 라우트 정적 등록(정적 import — SSG 프리렌더 대상, lazy 아님. main.tsx의 `PRERENDER_EXCLUDE`에 안 걸림 확인).

## 3개 도구 페이지 상호 링크
`/calc` ↔ `/unemployment-calc` ↔ `/resignation-letter` 서로 하단에 링크 추가(내부링크 SEO 가치, "퇴직금 계산기 노출 강화" 권고 항목 저비용 실행). **상단 네비(Nav.tsx)는 5개 항목 단순 구조라 드롭다운 없이 항목 추가하면 디자인 흐트러질 수 있어 손대지 않음** — 다음에 메뉴 구조 논의 필요하면 별도로.

## 검증
`npm run build`(15페이지 프리렌더 성공, `dist/unemployment-calc.html`·`dist/resignation-letter.html` 확인) + `npm test`(9 pass) + 브라우저 실사용 확인(계산값 검산, 콘솔 에러 없음, 기존 `/calc` 페이지 정상 동작 유지).

## 다음 세션 주의
- 실업급여 상한액/하한액은 **매년 최저임금 고시와 함께 바뀜** — 2027년 시즌 전에 `UPPER_LIMIT`/`LOWER_LIMIT` 갱신 필요(최저임금×80%×8h가 하한액 공식).
- 소액 파워링크 광고 파일럿(월 10~30만원, 2~4주)은 실제 예산 집행이 걸려있어 **사용자 별도 확인 없이 진행 안 함** — 다음 세션에서 예산·기간 확정 후 네이버 광고관리시스템에서 직접 집행 필요.

---

# 광고 심사 대기 중 준비 작업 (2026-07-20)

## 배경
- 비즈채널 "퇴사히어로 웹사이트"(`bsn-...-14578947`) + 캠페인 `퇴사히어로_최고신뢰`(키워드 20개, 소재 1개)가 전부 `UNDER_REVIEW`. API 실측으로 확인(읽기 전용 GET).
- 심사 중 광고 수정은 재심사 유발이라 광고 자체는 건드리지 않음. 대신 "광고가 켜졌을 때 준비돼 있어야 할 것"을 준비.

## 실행한 것
1. **블로그 큐에 광고 키워드 정렬 주제 6개 추가** (`content/blog/topics.json` 최상단) — 광고 키워드 중 사이트에 대응 콘텐츠가 전무하던 해고통지서/권고사직위로금/권고사직회사불이익/체불임금확인서·노동청신고방법/국선노무사/직장내괴롭힘처벌·사례를 커버. 하루 1편 자동 발행이라 약 6일 내 발행 완료 예정 — 심사 기간과 자연히 겹침.
2. **`docs/ADS_PLAYBOOK.md` 신규** — 심사 통과 후 실행 순서: ELIGIBLE 확인 → 키워드 그룹별 랜딩 매핑(7그룹) → 광고그룹 분리(A서류/C괴롭힘/G브랜드 우선) → 그룹별 소재 카피 초안(변협 준수, 갈등회피 고객 톤) → 측정. API 함정(1018/3916/useGroupBidAmt/DELETE 빈 응답)도 문서에 집약.

## 확인한 사실
- 블로그 자동 발행 파이프라인 정상 작동 중 — 2026-07-20 01:30 GMT에도 발행됨(rss.xml 실측).
- 발행 8편 vs 큐 잔여: 기존 큐의 `small-business-resignation`·`recommended-vs-voluntary-resignation`은 유사 slug로 이미 발행돼 있어 재발행 시 유사문서 위험 → **사용자 승인으로 큐에서 제거함**(커밋 `b277671`). 큐 15개 잔여.
- 큐에 남은 `workplace-harassment-labor-office-appeal`·`resignation-agency-legality`·`unpaid-severance-recovery-steps` 3개는 **slug가 정확히 일치**해 `auto-publish-daily.mjs`가 Firestore 기존 slug 집합과 대조해 자동 skip한다(스크립트 205행 `queue.find(t => !existingSlugs.has(t.slug))`) — 무해하므로 그대로 둠. 유사문서 위험은 "내용은 같은데 slug만 다른" 경우에만 발생.

## 같은 날 후속 — 심사 전부 통과, 라이브 전환 (2026-07-20 저녁)

사용자가 광고주센터 비즈채널 화면을 붙여넣어 확인 요청 → API 재조회 결과 **퇴사히어로 관련 전부 통과**(채널 ELIGIBLE/APPROVED, 캠페인·광고그룹·키워드 20개·소재 1개 모두 ELIGIBLE/APPROVED). 실적은 통과 직후라 0.

### 진단: 입찰가가 검색량과 거꾸로 걸려 있었음
`/keywordstool`(검색량) × `/estimate/average-position-bid/keyword`(순위별 시세)를 대조한 결과.
- 월 13,630회 `권고사직`에 70원(5위 시세 1,390원) → 노출 불가. 월 4,900회 `직장내괴롭힘처벌`에 300원(5위 2,790원) → 노출 불가.
- 반대로 월 30회 `임금체불전문변호사`에 500원, 월 100회 `퇴사대행`에 1,000원.
- 예산 소진방식이 `ACCELERATED`(빠른소진)라 하루 5,000원이 오전에 소진돼 오후·저녁 노출이 사라지는 구조.
- `trackingMode: TRACKING_DISABLED` — 키워드별 전환 추적 불가.

### 사용자 결정 (AskUserQuestion)
- 예산: **현재 유지(하루 5,000원 / 월 약 15만원)** — 70원으로도 노출되는 저경쟁 키워드에 집중하는 보수적 테스트.
- 랜딩: **당분간 홈 유지** — 방금 통과한 심사를 URL 변경으로 다시 걸지 않고, 반응하는 키워드를 먼저 확인한 뒤 연결.

### 적용한 조치 (예산 증액 없음, 인상 항목 없음)
1. 예산 소진방식 `ACCELERATED` → `STANDARD`(균등배분).
2. 과다 입찰 8건 인하 — 노동청신고방법·퇴사대행 1000→300, 직장내괴롭힘노무사 500→70, 체불임금확인서 500→150, 임금체불전문변호사 500→300, 국선노무사·직장내괴롭힘처벌 300→70, 직장괴롭힘 300→100. 상세 표·사유는 `docs/ADS_PLAYBOOK.md`.
3. 변경 후 전 키워드 `ELIGIBLE` 유지 확인 — **입찰가·예산 변경은 재심사를 유발하지 않는다**(랜딩 URL·소재 문구 변경은 유발).

### API 함정 (전역 CLAUDE.md에도 반영함)
- `PUT /ncc/keywords?fields=bidAmt` body 배열의 각 객체에 **`nccAdgroupId` 필수** — 빠지면 `3705 Invalid ad group number`.
- `PUT /ncc/campaigns/{id}`의 유효 `fields`는 **`userLock`/`budget`/`period` 3개뿐**. `deliveryMethod`는 독립 fields가 아니라 `fields=budget` body에 `dailyBudget`+`useDailyBudget`과 함께 넣어야 바뀐다.
- `POST /estimate/exposure-minimum-bid/keyword`는 body 형식 400이 잦음 → `average-position-bid`로 position 5를 조회해 사실상의 최소가로 쓰는 게 실용적.

### 추가 조치 — `권고사직위로금` 70원 → 460원 (사용자 지시, 같은 날)
- 시세 재조회: 모바일 5위 440 / 4위 520 / 3위 650, PC 5위 520. **클릭의 94%가 모바일**(월평균 클릭 모바일 32.4 vs PC 2.2)이라 PC 5위를 포기하고 모바일 5위를 잡는 460원 선택. 광고그룹 PC/모바일 입찰 가중치가 둘 다 100이라 기기별 차등 불가.
- **리스크**: 하루 5,000원 ÷ 460원 ≈ 10클릭 소진. 이 키워드가 예산을 독식해 70원 키워드들이 노출 기회를 잃을 수 있음 → 2주 점검 때 **이 키워드의 소진 비중**이 핵심 지표.

## 다음 세션
- **2주 뒤(2026-08-03경) 성과 점검**: `GET /stats`로 노출·클릭·소진액 확인. 판단 기준 4가지는 `docs/ADS_PLAYBOOK.md` 측정 절 참조. 특히 `권고사직위로금` 소진 비중 확인.
- **2일 내 발행 예정인 `recommended-resignation-severance-pay`(위로금 글)** — 발행되면 `권고사직위로금` 키워드의 랜딩을 홈에서 이 글로 바꿀지 사용자에게 확인. 검색 의도와 정확히 맞는 자리라 전환 개선 여지가 크지만 URL 변경은 재심사 대상.
- **전환 추적 미해결** — 네이버 프리미엄 로그분석(무료) 신청 후 받은 스크립트를 `index.html`에 삽입하면 키워드별 전환을 볼 수 있다. 신청은 사람이 광고주센터에서 해야 함.
- 별건: 비즈채널 `법률사무소 청송 law`(플레이스, `bsn-...-14583070`)만 `BUSINESS_CHANNEL_DISAPPROVED`로 반려됨 — 퇴사히어로와 무관하나 확인 필요.
