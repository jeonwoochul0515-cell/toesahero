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
