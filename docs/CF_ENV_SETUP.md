# Cloudflare Pages 환경변수 세팅 가이드

**대상**: 퇴사히어로 운영 배포 담당자
**목적**: 결제(토스)·문자(SOLAPI)·DB 쓰기(서비스계정)·AI·이메일이 동작하도록 CF Pages에 모든 키를 등록한다.
**관련**: `.env.example`, `docs/LAUNCH_PLAN.md`(M3), `docs/DEPLOY.md`

> ⚠️ **핵심 원칙**: 시크릿(`*_SECRET`, 서비스계정 JSON, `*_KEY` 중 서버용)은 **GitHub에 절대 커밋하지 않는다.** 오직 Cloudflare Pages 대시보드의 환경변수에만 넣는다. `VITE_` 접두사 변수만 빌드 시 번들에 포함되어 브라우저에 노출되며, 그 외는 서버(Pages Functions)에서만 읽힌다.

---

## 0. 변수 위치 개념 (중요)

| 구분 | 접두사 | 노출 | 예 |
|---|---|---|---|
| **클라이언트(빌드 주입)** | `VITE_` | 브라우저에 노출됨(공개 가능 키만) | `VITE_TOSS_CLIENT_KEY`, `VITE_FIREBASE_*` |
| **서버(런타임 전용)** | 접두사 없음 | 노출 안 됨(시크릿) | `TOSS_SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `SOLAPI_*` |

둘 다 같은 화면(아래 1번)에서 등록하지만, 의미가 다르다. 공개되면 안 되는 값에 실수로 `VITE_`를 붙이지 않는다.

---

## 1. 등록 화면 찾기

1. https://dash.cloudflare.com 로그인
2. **Workers & Pages** → 해당 Pages 프로젝트 선택
3. **Settings** → **Environment variables**
4. **Production**, **Preview** 두 환경이 분리되어 있다.
   - **Production**: 운영(실 키). `main` 브랜치 배포.
   - **Preview**: PR/브랜치 미리보기(테스트 키). 안전하게 테스트 키로 채운다.
5. 값 추가 시 **Encrypt**(암호화) 옵션이 있으면 시크릿은 반드시 켠다.
6. 변수 변경 후에는 **재배포(Retry deployment 또는 새 push)** 해야 반영된다.

> 권장: **Preview = 토스 테스트 키 / SOLAPI 실키**, **Production = 토스 실키 / SOLAPI 실키**.
> 결제는 테스트로 충분히 검증(M4) 후 Production에 실 키를 넣는다.

---

## 2. 등록할 변수 전체 목록

### (A) Firebase — 클라이언트 (6종, `VITE_`)
브라우저 SDK 초기화용. 공개되어도 되는 값(보안은 Firestore 규칙이 담당).
출처: Firebase 콘솔 → ⚙️ 프로젝트 설정 → 일반 → 내 앱 → `firebaseConfig`.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### (B) 토스페이먼츠 (2종)
출처: 토스페이먼츠 개발자센터 → 내 상점 → API 키.

```
VITE_TOSS_CLIENT_KEY=    # 클라이언트 키. live_ck_... (테스트는 test_ck_...) — 노출 OK
TOSS_SECRET_KEY=         # 시크릿 키. live_sk_... (테스트는 test_sk_...) — 절대 노출 금지, VITE_ 붙이지 말 것
```

### (C) 서버 측 Firestore 쓰기 — 서비스계정 (1~2종)
결제 결과를 서버가 Firestore에 쓰기 위해 필요(보안규칙상 클라가 못 씀).
출처: Firebase 콘솔 → ⚙️ 프로젝트 설정 → **서비스 계정** 탭 → **새 비공개 키 생성** → JSON 다운로드.

```
FIREBASE_SERVICE_ACCOUNT=   # 다운로드한 JSON 파일 "전체"를 한 줄로 붙여넣기 (아래 3번 참고)
FIREBASE_PROJECT_ID=        # (선택) 생략 시 위 JSON의 project_id 사용
```

### (D) SOLAPI — 문자 알림 (4종)
출처: SOLAPI 콘솔 → 개발/연동 → API Key. 발신번호는 사전 등록 필요.

```
SOLAPI_API_KEY=      # SOLAPI API Key
SOLAPI_API_SECRET=   # SOLAPI API Secret — 시크릿, 노출 금지
SOLAPI_SENDER=       # 사전 등록된 발신번호 (숫자만, 예: 16604452)
ALERT_TO_PHONE=      # 알림 받을 변호사 휴대폰 번호 (숫자만, 예: 01012345678)
```

### (E) Resend — 이메일 발송 (3종, 이미 사용 중)
출처: Resend 대시보드 → API Keys / 도메인 검증.

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=    # 도메인 검증 후 noreply@toesahero.com 형태
RESEND_BCC_EMAIL=     # 변호사 본인 메일(발송 사본 수신)
```

### (F) Anthropic — AI 챗봇 (1종, 이미 사용 중)
```
ANTHROPIC_API_KEY=    # 시크릿, 노출 금지
```

---

## 3. `FIREBASE_SERVICE_ACCOUNT` 붙여넣기 (가장 실수 잦은 부분)

다운로드한 JSON은 이렇게 생겼다.

```json
{
  "type": "service_account",
  "project_id": "toesahero-xxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxx@toesahero-xxxx.iam.gserviceaccount.com",
  ...
}
```

CF 환경변수 값 칸에는 **이 JSON 전체를 그대로(중괄호 포함) 붙여넣는다.**

- ✅ `private_key` 안의 `\n`은 **그대로 둔다.** 코드(`_firestore.ts`)가 PEM을 파싱하므로 변형 금지.
- ✅ JSON을 한 줄로 만들 필요는 없다. CF 값 칸은 여러 줄을 허용한다. 다만 따옴표/줄바꿈을 임의로 고치지 말 것.
- ❌ 파일 경로가 아니라 **내용**을 넣는다.
- ❌ `VITE_` 접두사 붙이지 말 것(서버 전용 시크릿).

> 권한: 이 서비스계정은 기본으로 Firestore 읽기/쓰기 권한(Editor/Datastore User)을 가진다. 별도 IAM 설정 없이 동작한다. 서비스계정 REST는 보안규칙을 우회하므로 `orders`의 클라 write=false와 무관하게 서버는 정상 기록한다.

---

## 4. 등록 후 외부 콘솔에서 마저 할 일

환경변수만으로 끝나지 않는 항목.

- [ ] **Firestore 규칙 게시** — `firestore.rules`(이 저장소) 내용을 Firebase 콘솔 → Firestore → 규칙 탭에 붙여넣고 **게시**. (`orders` 컬렉션 규칙 포함 최신본)
- [ ] **토스 webhook 등록** — 토스 개발자센터 → 웹훅 → URL에 `https://toesahero.com/api/payment/webhook` 등록. 이벤트: 결제 상태 변경.
- [ ] **SOLAPI 발신번호 등록** — 통신사 본인확인 절차(1~3일). 완료된 번호를 `SOLAPI_SENDER`에 입력.
- [ ] **Resend 도메인 검증** — `toesahero.com` SPF/DKIM 추가(이메일 발송용, 기존 항목).

---

## 5. 검증 (등록이 됐는지 확인)

배포 후 아래로 셀프 체크. (실 결제 전 **Preview + 테스트 키**로 먼저)

1. **결제 미설정 여부** — `/checkout?pkg=basic`에서 결제 버튼 클릭 시 "결제 인프라 미설정" 안내가 더 이상 안 뜨면 토스/서비스계정 키가 잡힌 것.
2. **주문 생성** — 결제 진행 시 `/api/payment/order`가 200 + `{orderId, amount}` 반환(네트워크 탭 확인).
3. **테스트 결제 1건** — 토스 테스트 카드로 결제 → 어드민 상담 상세에서 `paymentStatus=paid` 확인.
4. **문자 수신** — 위 결제 직후 `ALERT_TO_PHONE`로 "[퇴사히어로] 결제 완료" 문자 도착.
5. **상담 알림** — 사이트에서 상담/통보문 신청 시 변호사 폰에 "[퇴사히어로] 신규 상담 신청" 문자 도착.

> 하나라도 실패하면 `docs/LAUNCH_PLAN.md`의 M4 절차로 디버깅. 결제 성공인데 DB 미반영이면 서비스계정 키(C) 문제, 문자만 안 오면 SOLAPI(D)/발신번호 문제.

---

## 6. 빠른 체크리스트

```
[ ] (A) VITE_FIREBASE_* 6종            (Production + Preview)
[ ] (B) VITE_TOSS_CLIENT_KEY           (Prod=live_ck, Preview=test_ck)
[ ] (B) TOSS_SECRET_KEY                (Prod=live_sk, Preview=test_sk)
[ ] (C) FIREBASE_SERVICE_ACCOUNT       (JSON 전체)
[ ] (C) FIREBASE_PROJECT_ID            (선택)
[ ] (D) SOLAPI_API_KEY / SECRET / SENDER / ALERT_TO_PHONE
[ ] (E) RESEND_API_KEY / FROM / BCC
[ ] (F) ANTHROPIC_API_KEY
[ ] 변경 후 재배포
[ ] 4번(외부 콘솔) 4개 항목
[ ] 5번 검증 5단계
```
