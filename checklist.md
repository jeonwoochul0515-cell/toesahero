# 퇴사히어로 출시 체크리스트

`docs/LAUNCH_PLAN.md`의 마일스톤을 실행 단위로 분해한 것. 진행하며 체크한다.

## M1 — 결제 완결성 (코드)  ✅ 코드 구현 완료 (2026-06-14)
- [x] `POST /api/payment/order` 신규 — 서버가 패키지 가격 결정, `orders/{orderId}` 저장
- [x] `POST /api/payment/confirm` 보강 — orderId로 저장 금액 대조, 멱등 처리
- [x] 승인 성공 시 서버에서 `orders.status=paid` + `consultations.paymentStatus=paid` 기록
- [x] `POST /api/payment/webhook` 신규 — 토스 재조회 후 상태 반영(웹훅 단독 신뢰 금지)
- [x] `firestore.rules`에 `orders` 컬렉션 규칙 추가(클라 read=isOwner, write=서버)
- [x] `CheckoutPage.tsx` — order 엔드포인트 경유하도록 결제 흐름 수정
- [x] 서버 Firestore 쓰기 헬퍼(`_firestore.ts`, 서비스계정 REST) — D-1 채택
- [ ] 검증: 테스트 키 결제 성공 시 DB 자동 반영 + 금액 변조 거부 (→ M4)

## M2 — 법적/약관 (변호사·법무)
- [ ] 전자상거래법 사업자정보 표기(상호·대표·사업자번호·통신판매업신고번호·주소·연락처)
- [ ] 환불·취소 정책 페이지(착수 후 환불 기준)
- [ ] 이용약관/개인정보처리방침 변호사 본인 검토
- [ ] 변협 광고심의 — 결제/가격 카피 금지표현 점검
- [ ] `CheckoutPage.tsx` "결제 인프라 미설정" 안내문 라이브용으로 교체

## M3 — 환경·시크릿
- [ ] CF Pages env: `VITE_TOSS_CLIENT_KEY`(live_ck_), `TOSS_SECRET_KEY`(live_sk_)
- [ ] CF Pages env: `VITE_FIREBASE_*` 6종
- [ ] CF Pages env: `ANTHROPIC_API_KEY`, `RESEND_*`
- [ ] CF Pages env: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER`(발신번호), `ALERT_TO_PHONE`(변호사 수신번호)
- [ ] CF Pages env: 서버 Firebase 쓰기 자격증명(D-1 결정)
- [ ] `firestore.rules` Firebase 콘솔 게시
- [ ] 필요 시 `orders` 인덱스 `firestore.indexes.json` 추가

## M4 — 테스트 키 E2E
- [x] confirm 금액대조·멱등 단위 테스트(Vitest, `_validate.test.ts`, 9 pass)
- [x] functions 타입체크 추가(`functions/tsconfig.json` + `npm run typecheck:functions`, build에 포함)
- [x] `npm run build` 무오류
- [x] E2E 시나리오 문서화(`docs/E2E_PAYMENT_TEST.md`)
- [ ] (수동) 테스트 카드 결제 → 승인 → DB 반영 → 어드민 확인 전 구간 — env 등록 후 실행
- [ ] (수동) 금액 변조/멱등/실패/failUrl 경로 확인 — `docs/E2E_PAYMENT_TEST.md` 2~4절

## M5 — 실 키 전환
- [ ] CF Pages 토스 키 live_* 교체 + 재배포
- [ ] 토스 대시보드 webhook URL 운영 도메인 등록
- [ ] 실 카드 소액 결제 → 전액 환불 왕복 확인

## M6 — 알림·모니터링 (SOLAPI 문자)  ✅ 코드 구현 완료 (2026-06-14)
- [x] `functions/api/_notify.ts` — SOLAPI 문자 발송 공통 함수(HMAC 인증, 실패 격리)
- [x] 이벤트별 문자 발송 연결:
  - [x] 신규 상담 신청 → 변호사 문자 (`/api/notify` + `firebase.ts` 3개 저장함수 연결)
  - [x] 결제 완료(confirm/webhook DONE) → 변호사 문자 (`_reflect.reflectPaid`)
  - [x] 결제 취소/실패 → 변호사 문자 (`_reflect.reflectCanceled`)
  - [ ] (선택) 의뢰인에게 접수/결제 완료 안내 문자 — 미구현(추후)
- [ ] SOLAPI 발신번호 사전 등록(통신사 본인확인, 1~3일 소요)
- [ ] 운영 SOP에 결제 분쟁·환불 절차 추가(`docs/OPS_GUIDE.md`)
- [ ] 출시 후 2주 결제 로그 일일 점검

---

## D1 — 따뜻한 브루탈리즘 리톤 (2026-07-09)  ✅ 완료
- [x] `styles.css :root` 팔레트 온화 (yellow→머스터드 #F2C14E, orange→테라코타 #E07856, ink→웜브라운 #241C15, cream #FBF7EF)
- [x] 하드 섀도우 6px→5px + 웜잉크 (오프셋 시그니처 유지)
- [x] Hero boss variant → 승인 카피 ("퇴사, 혼자 / 결정하지 마세요 / 변호사가 옆에서 같이 갑니다")
- [x] soft/legal variant 톤 미세 온화
- [x] Audience 카피 온도 상향(공감+안심). Assurance/Footer는 기존이 이미 따뜻해 유지
- [x] 다크 섹션(Marquee/Calculator/Footer) 웜브라운 확인
- [x] `npm run build` 통과
- [x] 브라우저 육안 확인(Hero/Audience/Calculator/Pricing/Footer)
