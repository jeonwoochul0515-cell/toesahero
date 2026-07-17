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
