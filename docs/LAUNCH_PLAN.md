# 퇴사히어로 — 출시(Launch) 실행 계획

**작성일**: 2026-06-14
**전제**: 토스페이먼츠 가맹 승인 완료 + 실 키(`live_ck_`/`live_sk_`) 보유.
**범위**: 본 문서는 "현재 코드 상태 → 실서비스 결제 오픈"까지의 실행 계획이다. 장기 로드맵은 `docs/ROADMAP.md` 참조.

---

## 0. 현재 상태 요약 (실측 기반)

이 프로젝트는 폴더명("design_handoff")과 달리 **운영 직전 단계**다.

| 영역 | 상태 |
|---|---|
| 프론트(React+Vite+TS), CF Pages 배포, 커스텀 도메인 `toesahero.com` | ✅ 완료 |
| AI 챗봇 / 통보문 초안 / 내용증명 / 이메일 발송 (`functions/api/*`) | ✅ 골격 완료 |
| 어드민(대시보드·상담·칸반·후기·블로그·채팅로그), 마이페이지, 임금계산기 | ✅ 완료 |
| SEO(네이버 서치어드바이저·sitemap·RSS) | ✅ 완료 |
| 토스 결제 — 클라이언트(`CheckoutPage.tsx`) + 서버 승인(`/api/payment/confirm`) | ⚠️ **골격만** |

### 토스 연동의 실제 공백 (출시 차단 요인)
1. **Webhook 부재** — `confirm.ts`는 토스 승인만 하고 끝난다. 보안규칙상 `paymentStatus`는 어드민만 쓸 수 있어 **결제 성공이 Firestore에 자동 반영되지 않는다.** (현재는 화면 메시지만 출력)
2. **금액 위변조 검증 없음** — `confirm.ts`가 클라이언트가 보낸 `amount`를 그대로 토스에 전달. 토스 표준(주문 생성 시 금액을 서버에 저장 → 승인 시 대조)이 빠짐.
3. **orderId 영속화·멱등성 없음** — 중복 승인/중복 결제 방어 로직 부재.
4. **환경변수·법적 표기 미비** — CF Pages env 미설정, 전자상거래법상 사업자정보/환불정책 페이지 부재.

---

## 1. 마일스톤

```
M1 결제 완결성 (코드)      → 검증: 테스트 키로 결제 성공 시 Firestore paymentStatus=paid 자동 기록
M2 법적/약관 준비          → 검증: 사업자정보·환불정책 페이지 노출, 약관/개인정보 변호사 검토 완료
M3 환경·시크릿 셋업        → 검증: CF Pages env에 전 키 등록, 프리뷰 빌드 통과
M4 테스트 키 E2E 검증      → 검증: 결제→승인→DB반영→어드민 확인→이메일 발송 전 구간 통과
M5 실 키 전환 + 라이브 점검 → 검증: 실 카드 1건 결제·환불 왕복 성공, webhook 수신 확인
M6 모니터링·운영 개시      → 검증: 결제 실패 알림 동작, 운영 SOP 문서화
```

> 결제 코드(M1)는 **반드시 테스트 키로 먼저 완결**시킨다. 실 키 보유 여부와 무관하게, 라이브 전환(M5)은 E2E 검증(M4) 이후로 미룬다.

---

## 2. M1 — 결제 완결성 (가장 중요)

토스 "결제창(Payment) 연동" 표준 흐름으로 맞춘다. 핵심은 **금액을 서버가 소유**하는 것.

### 2.1 주문 생성 엔드포인트 (신규) — `POST /api/payment/order`
- 입력: `caseId`, `packageId`, (인증된) 사용자.
- 서버가 **패키지 가격을 서버 상수에서 결정**(클라이언트 금액 불신뢰), `orderId` 생성.
- Firestore `orders/{orderId}`에 `{ caseId, packageId, amount, status:'ready', createdAt, uid }` 저장.
- 반환: `{ orderId, amount }` → 클라이언트는 이 값으로만 결제창 호출.

### 2.2 승인 엔드포인트 보강 — `POST /api/payment/confirm`
- 받은 `orderId`로 `orders/{orderId}` 조회 → **저장된 amount와 토스가 돌려준 amount 대조**(불일치 시 거부).
- `status`가 이미 `paid`면 멱등 처리(중복 승인 차단).
- 토스 승인 성공 시 서버에서 `orders.status='paid'` + `consultations/{caseId}`의 `paymentStatus='paid'` 기록.
  - **쓰기 주체 결정 필요** → `context-notes.md` D-1 참조 (Firebase REST + 서비스계정 권장).

### 2.3 Webhook 엔드포인트 (신규) — `POST /api/payment/webhook`
- 토스 대시보드에 URL 등록(`https://toesahero.com/api/payment/webhook`).
- 이벤트 수신 시 **토스 API로 결제 재조회**하여 상태 신뢰(웹훅 페이로드 단독 신뢰 금지).
- `DONE`/`CANCELED`/`PARTIAL_CANCELED` 등 상태를 `orders`·`consultations`에 반영.
- confirm과 webhook이 같은 결과를 멱등하게 쓰도록 단일 반영 함수로 통합.

### 2.4 보안규칙 정합
- `consultations` update 허용 필드에 이미 `paymentStatus` 등이 포함됨(`firestore.rules`). 단, **클라이언트가 직접 쓰지 못하게** 결제 상태 쓰기는 서버(서비스계정)로 일원화.
- `orders` 컬렉션 규칙 추가: 클라이언트 read는 isOwner, write는 서버만.

**M1 완료 기준**: 테스트 키 환경에서 결제 성공 시 `orders.status=paid` + `consultations.paymentStatus=paid`가 자동 기록되고, 금액 변조 요청은 거부된다.

---

## 3. M2 — 법적/약관 준비 (변호사·법무 영역)

결제를 받는 순간 전자상거래법·변협 광고규정이 동시에 걸린다.

- [ ] **전자상거래법 사업자정보 표기** — 상호, 대표자, 사업자등록번호, 통신판매업신고번호, 주소, 연락처, 호스팅사. 푸터/약관에 노출.
- [ ] **환불·취소 정책 페이지** — 변호사 위임 보수 특성 반영(착수 후 환불 기준). 토스 가맹 심사·전자상거래법 모두 요구.
- [ ] **이용약관/개인정보처리방침 변호사 본인 검토** (현재 1차 초안). `DEPLOY.md` 운영 체크리스트와 연결.
- [ ] **변협 광고심의** — 결제·가격 표현이 "할인/환불보장" 등 금지 표현에 닿지 않는지 1회 자체 심의(`docs/ROADMAP.md` 리스크표).
- [ ] 결제 화면 카피 점검 — `CheckoutPage.tsx`의 "결제 인프라 미설정" 안내문은 라이브 전 제거/교체.

---

## 4. M3 — 환경·시크릿 셋업

CF Pages 프로젝트 환경변수(Production/Preview 분리)에 등록. **시크릿은 GitHub에 절대 커밋 금지.**

| 변수 | 위치 | 비고 |
|---|---|---|
| `VITE_TOSS_CLIENT_KEY` | CF Pages (빌드 시 노출 OK) | 실 키 `live_ck_` |
| `TOSS_SECRET_KEY` | CF Pages 서버 env | 실 키 `live_sk_`, 클라 노출 금지 |
| `VITE_FIREBASE_*` 6종 | CF Pages | `.env.example` 참조 |
| `ANTHROPIC_API_KEY` | CF Pages 서버 env | 챗봇 |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_BCC_EMAIL` | CF Pages 서버 env | 이메일 발송 |
| (신규) 서버 측 Firebase 쓰기 자격증명 | CF Pages 서버 env | D-1 결정에 따름 |

- [ ] `firestore.rules`를 Firebase 콘솔에 게시(수동, `DEPLOY.md` 4-5).
- [ ] `orders` 컬렉션용 인덱스 필요 시 `firestore.indexes.json` 추가.

---

## 5. M4 — 테스트 키 E2E 검증

전 구간 1회 통과를 출시 게이트로 삼는다.

1. 테스트 카드로 베이직(199,000원) 결제 → 토스 승인 성공.
2. `/api/payment/confirm`이 금액 대조 통과 후 DB 반영.
3. 어드민 상담 상세에서 `paymentStatus=paid` 확인.
4. (연동돼 있으면) 승인 후 이메일/알림 발송 동작.
5. **실패 경로**: 금액 변조 요청 거부, `failUrl` 처리, 네트워크 실패 시 사용자 안내.
6. `npm run build` (= `tsc -b && vite build`) 무오류.

> 현재 테스트 코드가 없음 → 최소 빌드 통과 + 수동 E2E 체크리스트로 대체. 결제 confirm 로직만이라도 단위 테스트 추가 권장(D-2).

---

## 6. M5 — 실 키 전환 + 라이브 점검

- [ ] CF Pages env의 토스 키를 `live_*`로 교체, 재배포.
- [ ] 토스 대시보드 webhook URL을 운영 도메인으로 등록.
- [ ] **실 카드 1건 소액 결제 → 전액 환불** 왕복으로 정산·webhook·환불 반영 확인.
- [ ] 라이브 결제 성공 후 Firestore·어드민·이메일 일치 확인.

---

## 7. M6 — 모니터링·운영 개시

- [ ] 결제 실패/webhook 오류 시 변호사에게 알림(이메일 또는 카톡 알림톡).
- [ ] 운영 SOP에 "결제 분쟁·환불 처리 절차" 추가(`docs/OPS_GUIDE.md` 연계).
- [ ] 첫 2주 결제 로그 일일 점검.

---

## 8. 의존성 순서 (Critical Path)

```
M2(약관·사업자정보) ─┐
                     ├─→ M5(실 키 전환) ─→ M6(운영)
M1(결제코드) → M3(env) → M4(E2E) ─┘
```

- M1·M2는 병렬 진행 가능(코드 vs 법무).
- M4(E2E 검증)를 통과하기 전에는 절대 실 키로 전환하지 않는다.
- M2의 사업자정보·환불정책은 **토스 가맹 유지 조건**이기도 하므로 라이브 전 필수.
