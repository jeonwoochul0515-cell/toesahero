# 결제 E2E 테스트 시나리오 (M4)

**목적**: 실 키 전환(M5) 전, **테스트 키 환경**에서 결제 전 구간이 정상 동작함을 1회 통과로 검증한다.
**전제**: `docs/CF_ENV_SETUP.md`의 변수가 **Preview 환경에 테스트 키로** 등록되어 있고, Firestore 규칙이 게시된 상태.
**관련**: `docs/LAUNCH_PLAN.md`(M4), `docs/CF_ENV_SETUP.md`

> 이 검증을 통과하기 전에는 절대 실 키(`live_*`)로 전환하지 않는다.

---

## 0. 사전 준비

- [ ] CF Pages **Preview** 환경변수: `VITE_TOSS_CLIENT_KEY=test_ck_...`, `TOSS_SECRET_KEY=test_sk_...`
- [ ] `FIREBASE_SERVICE_ACCOUNT`(JSON), `SOLAPI_*`, `ALERT_TO_PHONE` 등록
- [ ] Firestore 규칙 게시(`orders` 컬렉션 포함 최신본)
- [ ] 테스트용 카카오 로그인 계정 1개
- [ ] 토스 테스트 카드 정보 (토스 개발자센터 → 테스트 카드. 아무 카드번호/유효기간/생년월일로 승인됨)
- [ ] 브라우저 개발자도구 **Network/Console** 탭 열어두기

테스트 대상 URL은 Preview 배포 주소(`https://<hash>.<project>.pages.dev`).

---

## 1. 정상 결제 (Happy Path)

| # | 동작 | 기대 결과 |
|---|---|---|
| 1 | 사이트에서 상담/통보문 신청 → 사건(consultation) 1건 생성 | Firestore `consultations`에 문서 생성, 변호사 폰에 "[퇴사히어로] 신규 상담 신청" 문자 |
| 2 | `/checkout/<caseId>?pkg=basic` 진입, 카카오 로그인 | 페이지 로드, "결제 인프라 미설정" 경고가 **안** 뜸 |
| 3 | 위임 동의 체크 → 결제 버튼 클릭 | Network에 `POST /api/payment/order` → 200, 응답 `{ok:true, orderId, amount:199000}` |
| 3-1 | (확인) Firestore `orders/{orderId}` | `status:"ready"`, `amount:199000`, `caseId` 일치 |
| 4 | 토스 결제창에서 테스트 카드로 승인 | 성공 시 `successUrl`로 복귀(`?paymentKey=...&orderId=...&amount=...`) |
| 5 | 복귀 후 자동 confirm | Network에 `POST /api/payment/confirm` → 200, `{ok:true, payment:{...}}` |
| 6 | 화면 | "✓ 결제가 정상 처리되었습니다" 메시지 |
| 7 | Firestore `orders/{orderId}` | `status:"paid"`, `paymentKey`, `approvedAt` 기록 |
| 8 | Firestore `consultations/{caseId}` | `paymentStatus:"paid"`, `paymentAmount:199000`, `packageId:"basic"`, `paymentOrderId` 기록 |
| 9 | 어드민 → 상담 상세 | 결제 완료 상태로 표시 |
| 10 | 변호사 폰 | "[퇴사히어로] 결제 완료 / 기본 절차 199,000원" 문자 도착 |

**통과 기준**: 1~10 모두 충족.

---

## 2. 금액 위변조 차단 (보안 핵심)

클라이언트가 금액을 조작해도 서버가 막아야 한다.

| # | 동작 | 기대 결과 |
|---|---|---|
| 1 | 정상 주문 생성으로 `orderId` 확보(`amount:199000`) | `orders`에 199000 저장 |
| 2 | 개발자도구 Console에서 confirm을 변조 금액으로 직접 호출:<br>`fetch('/api/payment/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paymentKey:'x',orderId:'<위 orderId>',amount:1000})}).then(r=>r.json()).then(console.log)` | `400` + `{error:"amount_mismatch", expected:199000, got:1000}` |
| 3 | Firestore `orders/{orderId}` | 여전히 `status:"ready"` (paid로 안 바뀜) |

**통과 기준**: 변조 금액 거부 + DB 무변화.

---

## 3. 멱등성 (중복 승인 차단)

| # | 동작 | 기대 결과 |
|---|---|---|
| 1 | 1번 시나리오로 결제 완료된 `orderId` 준비 | `orders.status:"paid"` |
| 2 | 같은 `orderId`로 confirm 재호출(올바른 금액) | `200` + `{ok:true, idempotent:true}` — 토스 재호출 없이 즉시 성공 |
| 3 | Firestore | 중복 기록/중복 문자 없음 |

**통과 기준**: 재호출이 안전하게 멱등 처리.

---

## 4. 실패 경로

| # | 상황 | 기대 결과 |
|---|---|---|
| 1 | 존재하지 않는 `orderId`로 confirm | `404 order_not_found` |
| 2 | 토스 결제창에서 "취소" | `failUrl`(`?fail=1`)로 복귀, 결제 미완료 안내, DB 무변화 |
| 3 | 환경변수 누락 상태(키 빼고 배포) | confirm/order가 `503 payment_not_configured`, 화면에 직접 문의 안내 |

**통과 기준**: 모든 실패가 사용자에게 명확히 안내되고 DB 오염 없음.

---

## 5. Webhook (선택, 강력 권장)

confirm이 실패해도 webhook이 상태를 보정하는지 확인.

| # | 동작 | 기대 결과 |
|---|---|---|
| 1 | 토스 개발자센터 → 웹훅 → 테스트 발송, 또는 실제 테스트 결제 | `POST /api/payment/webhook` 200 수신 |
| 2 | 결제(DONE) 이벤트 | `orders.status:"paid"`, `consultations.paymentStatus:"paid"` 반영 |
| 3 | 결제 취소 이벤트 | `paymentStatus:"canceled"` 반영 + 취소 문자 |

> webhook은 토스 API로 재조회 후 반영하므로 페이로드 위조에 안전.

---

## 6. 회귀 자동화 (코드 변경 시)

```bash
npm test                       # validateConfirm 단위 테스트 (금액대조·멱등·손상)
npm run typecheck:functions    # functions 타입 오류
npm run build                  # 전체 빌드(프론트 tsc + functions tsc + vite)
```

결제 코드 수정 후에는 위 3개를 먼저 통과시키고, 그 다음 본 문서의 1~4를 수동 재검증한다.

---

## 7. 통과 후 → M5

- [ ] 위 1~4(필수) 통과 기록
- [ ] CF **Production** 환경변수를 `live_*`로 교체
- [ ] 토스 webhook URL을 운영 도메인으로 등록
- [ ] **실 카드 소액 결제 → 전액 환불** 왕복 1회로 라이브 최종 확인
