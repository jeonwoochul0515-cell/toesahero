# AI 챗봇 + 통보문 자동 초안 가이드

## 변협 컴플라이언스 (필수 인지)

### 1차 자료로 확인 가능한 사실 (2026.05 시점)

대한변호사협회 「변호사 광고에 관한 규정」 (2025.2.6 개정 / 2025.2.10 공포) 및 한국법조인협회 공식 입장에서 확인되는 사항:

1. **변호사 광고규정 제8조 제1항** — 무료/부당한 염가의 법률상담 방식 광고 금지 (AI 무료 챗봇이 "광고"로 해석될 위험)
2. **한국법조인협회 공식 입장**: AI 결과물을 변호사가 검토·수정·법리적·윤리적으로 책임지는 경우에만 실제 업무에 활용 가능
3. **변협 공식 입장** (법률신문 인터뷰): "AI 법률상담은 변호사 직역·시민 생활에 중요한 사안이므로 신중하게 검토하겠다" — **AI 등록 절차가 공식적으로 확립된 단계는 아님**
4. 헌법재판소 2022.5.26. 2021헌마619 결정 — 변협 광고규정 일부 조항이 위헌 판단 → 규정 자체 강제력에 한계

### 본 챗봇 컴플라이언스 자체 적용 사항

- **법률 자문 직접 제공 금지** — system prompt에서 명시적으로 금지
- **결과/금액 예측 금지**
- **무료/할인/환불/최고/유일 표현 금지**
- 응답 끝에 변호사 직접 상담 권유 자동 삽입
- ChatModal 푸터에 **"AI 응답은 변호사 사후 검토"** 고지
- 채팅 로그 + 통보문 초안 모두 Firestore 자동 저장 → **변호사가 어드민 페이지에서 검토**

### ⚠️ 운영 시작 전 권장 검증 (사용자 액션)

"AI 사전등록 의무"는 일부 비공식 해석 글(i-boss 등)에서 단언되나, 변협 1차 자료에서 직접 확인되는 명시적 등록 절차는 아직 미확립 상태입니다. 다음 중 하나로 사전 자문 받아두시기를 권장합니다:

- **A) 변협 광고심사위원회 서면 질의**: 대한변호사협회 ☎ 02-2087-7777
- **B) 부산지방변호사회 광고심사 자문** (거점 활용): ☎ 051-621-3300
- **C) 1차 자료 직접 검토**:
  - [「변호사 광고에 관한 규정」 (2025.2.6 개정)](https://www.koreanbar.or.kr/pages/board/law_view.asp?seq=14402)
  - [「변호사 광고에 관한 규칙」 (2025.6.30 개정)](https://www.koreanbar.or.kr/pages/board/law_view.asp?seq=14681)
  - PDF에서 "AI", "인공지능", "자동화" 키워드 검색하여 명시 조항 유무 확인

---

## 1. 채팅 트리아지 (`/api/chat`)

### Endpoint
- POST `/api/chat`
- Body: `{ messages: [{role, content}], userName? }`
- Response: `{ text }`

### 모델
- `claude-haiku-4-5` (Anthropic)
- max_tokens: 600
- 컨텍스트: 최근 12개 메시지

### System Prompt 핵심
- 사실관계 명확화 질문
- 사안을 카테고리(퇴직금 미지급/임금 체불/괴롭힘/권고사직/부당해고/단순 통보)로 분류
- 적절한 패키지 (199K/390K/790K) 안내
- **법률 자문 직접 제공 금지**

System prompt 수정은 `functions/api/chat.ts` 의 `SYSTEM_PROMPT` 상수 편집 → git push → 자동 재배포.

---

## 2. 통보문 자동 초안 생성 (`/api/draft`) ⭐ **신규**

### 워크플로우

```
의뢰인 채팅 (2턴+30자 이상 대화)
   ↓ AI 챗봇이 사실관계 자동 수집
[📝 통보문 초안 생성하기] 버튼 자동 노출
   ↓ 의뢰인 클릭
/api/draft 호출
   ↓ Anthropic Claude 가 표준 양식 통보문 1차 초안 생성
   ↓ 의뢰인이 알 수 없는 사항은 [대괄호] placeholder
의뢰인 화면에 초안 표시
   ↓ 의뢰인 [✓ 변호사 검토 요청] 클릭
Firestore consultations 에 source='draft' + draftLetter + draftStatus='pending_review' 로 저장
   ↓
변호사가 어드민에서 알림 확인 (`/admin/consultations`)
   ↓ ConsultationDetail 페이지에서 통보문 표시
   ↓ [대괄호] 부분을 변호사가 채워 넣음 (회사명·입사일 등)
   ↓ [수정 저장] (draftStatus='edited') 또는
   ↓ [✓ 승인 (발송 준비)] (draftStatus='approved')
   ↓ [📤 발송 완료 표시] (draftStatus='sent', status='contacted')
```

### 표준 통보문 양식 (자동 생성됨)

```
[발신] 법률사무소 청송
       부산광역시 연제구 법원남로15번길 10, 202호
       대표 변호사 김창희 (☎ 1660-4452)

[수신] [회사명] 대표이사 귀하

[사건명] 의뢰인 [○○○]님의 퇴직 의사 통보 및 후속 절차 안내

[통보 내용]
당 사무소는 의뢰인 [○○○]님으로부터 귀사에 대한 퇴직 의사 표시 및 관련 후속 절차 일체를 위임받아, 다음과 같이 통보합니다.

1. 의뢰인은 [퇴사 예정일] 자로 귀사를 퇴직할 의사를 표시하였습니다.
2. 마지막 출근일은 [최종출근일]이며, 인수인계 사항은 [인수인계 안내] 합니다.
3. 본 통보 이후 의뢰인 본인에 대한 직접적 연락은 자제하시고, 모든 연락은 본 사무소(1660-4452)로 일원화하여 주시기 바랍니다.
4. 미지급 임금·퇴직금·연차수당 등 사후 정산 사항은 [별도 청구 통보] / [정상 지급 요청] 합니다.
5. 본 통보 후 7일 이내 회신이 없거나 부당한 지연이 발생할 경우, 근로기준법 등 관련 법령에 따른 후속 조치(노동청 진정·민사 청구 등)를 검토할 수 있음을 알립니다.

[관계 법령] 근로기준법 제7조, 민법 제660조, 변호사법 제3조

[작성일] [YYYY년 MM월 DD일]
[작성자] 법률사무소 청송 대표 변호사 김창희 (인)

※ 본 통보문은 AI가 생성한 1차 초안이며, 변호사 김창희가 검토·수정 후 최종 발송합니다.
```

### 어드민 검토 화면

`/admin/consultations/:id` 의 통보문 카드:
- 의뢰인 대화 로그 펼쳐보기 (사실관계 검증용)
- 통보문 textarea (변호사가 직접 수정 가능)
- 💾 수정 저장 / ⬇ .txt 다운로드 / ✓ 승인 / 📤 발송 완료 표시

### draftStatus 전이

```
pending_review (의뢰인이 검토 요청)
    ↓ 변호사 수정
edited
    ↓ 변호사 승인
approved (발송 준비 완료)
    ↓ 변호사가 메일/우편 발송 후 표시
sent (consultation.status도 'contacted'로 자동 전이)
```

---

## 3. API 키 발급

### Anthropic Claude (현재 적용됨)

1. https://console.anthropic.com 가입 / 로그인
2. **API Keys** → **Create Key**
3. 이름: `toesahero-chatbot`
4. 생성된 `sk-ant-api03-...` 형식 키 복사

### 비용 (claude-haiku-4-5)

- 입력: $0.25 / 1M 토큰
- 출력: $1.25 / 1M 토큰
- 평균 대화 1회: 약 $0.001~$0.005
- 통보문 1건 생성: 약 $0.005~$0.010 (출력 길이 기준)
- **월 예상 비용 (월 100건 기준)**: 채팅 ~$1 + 통보문 초안 50건 ~$0.5 = **$1.5 미만**

---

## 4. Cloudflare Pages 환경변수 등록

이미 등록되어 있음. 갱신·재발급 시:

```bash
echo "sk-ant-api03-..." | npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=toesahero
```

또는 Cloudflare Dashboard:
1. Workers & Pages → toesahero → Settings → Variables and Secrets
2. Production 환경에 `ANTHROPIC_API_KEY` 추가/수정 (Encrypt)

설정 후 다음 배포부터 자동 반영. 즉시 반영하려면 빈 push 또는 워크플로우 수동 실행:
```bash
gh workflow run "Deploy to Cloudflare Pages" --repo jeonwoochul0515-cell/toesahero --ref main
```

---

## 5. 폴백 동작 (API 키 미설정 시)

- `/api/chat`, `/api/draft` 모두 503 응답 → ChatModal 자동으로 hardcoded 폴백 모드
- 통보문 생성 버튼 클릭 시 "일시적 오류" 안내 → 카카오톡 채널 연결로 유도

---

## 6. 운영 중 챗봇 응답 검토 워크플로

### 매일 (5분)
1. 어드민 `/admin/chats` 진입
2. 최근 24시간 메시지 검토
3. 부적절 답변 발견 시 → System Prompt 강화 후 재배포

### 매주 (15분)
1. 어드민 `/admin/consultations` 에서 `draftStatus='pending_review'` 필터링
2. 통보문 초안 검토 + 의뢰인 대화 로그 확인
3. [대괄호] 채워 넣기 → 승인 → 발송 (메일/우편)

### 매월 (30분)
1. 통계 검토 (대시보드)
2. AI 응답 품질 평가 — 의뢰인 만족도 / 변호사 수정 비율
3. System Prompt 개선

---

## 7. 보안·비용 한도

### Anthropic Console 설정 권장
- **Monthly Budget**: $50/월 정도로 시작 (예상 사용량의 10배 안전 마진)
- **Email alerts**: 80% 사용 시 알림

### Cloudflare Pages
- Functions 무료 티어: 100K 요청/일
- 예상 사용량: 월 3,000~10,000 요청 → **무료 한도 내** 충분

---

## 8. 끄는 방법 (긴급 상황)

CF Pages 환경변수 `ANTHROPIC_API_KEY` 삭제:
```bash
npx wrangler pages secret delete ANTHROPIC_API_KEY --project-name=toesahero
```

즉시 폴백 모드 전환. ChatModal은 hardcoded 응답으로 작동, 통보문 자동 생성은 비활성.
