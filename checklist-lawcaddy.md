# 퇴사히어로 — 속도 개선 + 로캐디 답변 초안 이식

> 착수 2026-08-28 · 정본 `hakpok119/functions/src/hyeran/` (Firebase Functions)
> 이식 대상 `design_handoff_toesahero/functions/api/` (Cloudflare Pages Functions)

## 범위 (2026-08-28 사용자 확정 — "속도 + 로캐디 초안")

**포함**
- 챗봇 응답 속도 개선
- 로캐디 판례·법령 엔진 기반 **사무실용 답변 초안**
- 접수함이 초안을 호출할 수 있는 최소 어드민 API

**제외** (이번엔 안 함)
- 방문자↔사무실 실시간 직통 대화 — 월 상담 4건 수준에서 ROI 낮음
- 첨부파일 업로드·전사
- 쿠키 없는 방문자 분석
- 스트리밍 응답 — 프론트 구조 변경이 커서 별건으로

## A. 속도 개선

- [ ] `output_config: { effort: "low" }` 추가 — Sonnet 5는 thinking 생략 시 adaptive로 돌아 6~13초 소요
- [ ] 전후 응답 시간·품질 비교 (같은 6턴 대화)

## B. 로캐디 엔진 이식

- [ ] `_lawcaddy.ts` — 정본 lawcaddy.ts 이식
  - [ ] `process.env` → Cloudflare `env` 객체로 변경
  - [ ] Node 전용 API 사용 여부 확인·제거
  - [ ] `DOMAIN_TERMS` 학교폭력 → **노동/퇴사** 사전으로 교체
  - [ ] `ANCHOR` 교체
  - [ ] `RELEVANCE` 키워드 교체
- [ ] `_precedent.ts` — 법제처 판례 API (고정 IP 프록시 경유)
- [ ] 인용 안전장치 확인 — `case_number` 내부 식별자(`lbox_`·`kb_prec_`) 필터

## C. 어드민 API (최소 3종)

- [ ] `GET /api/admin/chats` — 세션 목록
- [ ] `GET /api/admin/chat/messages?sid=` — 대화 전문
- [ ] `POST /api/admin/chat/draft` — **로캐디 근거 답변 초안**
- [ ] 헤더 인증 `x-admin-id` / `x-admin-key`
- [ ] 필드 규약 준수 — `role`(user/admin/그외), UTC `"YYYY-MM-DD HH:MM:SS"`, `sid` 형식

## D. 시크릿·등록

- [ ] `LAWCADDY_SUPABASE_URL` / `LAWCADDY_SUPABASE_KEY`
- [ ] `VOYAGE_API_KEY` (임베딩 — 실패 시 전문검색으로 자동 강등)
- [ ] `TOESAHERO_ADMIN_ID` / `TOESAHERO_ADMIN_KEY`
- [ ] lead-inbox `chatSites()`에 퇴사히어로 한 줄 등록 + 시크릿 2개 + 재배포

## E. 검증

- [ ] 타입체크·테스트 통과
- [ ] 로캐디 실호출 — 노동 사건 질의로 판례가 실제로 걸리는지
- [ ] 인용된 사건번호가 실재하는지 표본 확인
- [ ] 어드민 API 3종 실호출
- [ ] 접수함 `/chats`에서 퇴사히어로 대화가 보이는지
- [ ] 초안 생성 왕복 시간 측정 (20~40초 예상, 사무실 검토용이라 허용)

## 함정 (스킬 §5-2, §11 기준 — 건너뛰지 말 것)

1. **임베딩 모델 혼용 금지** — 로캐디 질의는 voyage-3. 다른 모델과 섞으면 좌표계가 달라 결과가 망가짐
2. **내부 식별자 인용 금지** — `case_number`에 `lbox_39528` 등이 섞여 있음. 그대로 인용하면 없는 판례를 인용하는 꼴
3. **법제처 질의는 한 단어씩** — 두 단어를 붙이면 0건
4. **도메인 관련성 검사 필수** — 색인 모델 차이로 무관한 판례가 섞임
5. **방문자에게 판례를 인용하지 말 것** — 초안은 어디까지나 **사무실용**. 챗봇이 방문자에게 직접 판례를 대면 무료 자문 소진(메모리 `consult-free-advice-drain`)
