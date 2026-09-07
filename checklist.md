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

---

## F1 — 계산기 퍼널 전환 강화 (2026-08-16)  ✅ 완료
배경. 30일 실측 — 광고 클릭 466회 중 6할이 실업급여 검색어인데 상담은 월 4건. 고입찰 확장 대신(돈만 나감) 기존 저가 트래픽의 전환율을 올리기로 결정.
- [x] `UnemploymentCalcPage` 상담 신청에 이름·휴대전화 필수 수집 (기존엔 연락처 없이 접수돼 연락 불가) → 검증: 라이브 접수 #9XsSSfS1 문자에 연락처 표시 확인
- [x] `saveConsultation`에 `userName` 전달 경로 추가 (폼 입력 이름이 문자·접수함에 실리게) → 검증: 문자 본문 "이름 …" 표시
- [x] 자발적 퇴사 결과 안내 강화 (예외사유·퇴사 전 상담 유도 — 단정 표현 없이)
- [x] 광고: 실업급여 계열 키워드 87개 랜딩을 `/unemployment-calc`로 정합 (`PUT /ncc/keywords?fields=links`) → 변경분은 일시 재검수(UNDER_REVIEW) 후 자동 재개
- [x] 빌드·배포·E2E — 브라우저 실접수 1건 → 문자·접수함 확인 → 테스트 데이터 접수함에서 삭제 (Firestore 테스트 문서 #9XsSSfS1·#deployte는 어드민에서 종결 처리 필요)

---

## F2 — 노출·상담 증대 (블로그 외 채널, 2026-08-17)  ✅ 완료
전제. 고입찰 금지·네이버 블로그 제외(사용자 지시). 같은 예산에서 클릭률과 무료 검색 노출을 올린다.
- [x] 광고: 실업급여 전용 광고그룹 신설(`grp-...-071956635`, 70원·일예산 3,000원) + 맞춤 소재 2종("실업급여 계산기 2026", "실업급여 얼마 받나요") — 둘 다 검수 즉시 통과, 키워드 87개 이식 완료
- [x] 사이트: /unemployment-calc·/calc에 질문형 FAQ 4문항씩 + FAQPage JSON-LD — 정적 HTML 반영 확인
- [x] IndexNow 37개 URL 일괄 제출(api.indexnow.org·네이버 둘 다 200)
- [x] 롱테일 그룹의 실업급여 키워드 87개 삭제(중복 제거, 잔여 0 확인 — 그룹 888개로 감소)
- API 메모: `POST /ncc/keywords`는 **nccAdgroupId를 쿼리 파라미터로** 요구(body에 넣으면 400). 소재 description 한도 45자.

## 칼럼·검색 최적화 (2026-09-06)
- [x] 칼럼 29편 재작성 (질문형 H2 + 두괄식 답 + 웹툰 2컷 + FAQ)
- [x] 답 문단 146개 전부 40~65어절
- [x] 제목 19편 질문형 전환
- [x] 칼럼별 고유 공유 이미지 29장 (`npm run og`)
- [x] 웹툰 컷 11 → 18장, 마지막 컷 다양화
- [x] SEO·AEO·GEO 98.42점 (목표 98)
- [ ] 성능 — JS 총량 1,475KB. firebase를 지연 로딩하려면 firebase.ts 구조 변경 필요
- [ ] 새 광고그룹 6개 클릭률 확인 (개편 2026-09-06, 1주 뒤)
- [ ] 변협 「변호사 광고에 관한 규정」 원문 확인 — 김창희 변호사
