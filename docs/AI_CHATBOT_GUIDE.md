# AI 챗봇 활성화 가이드

## 변협 컴플라이언스 (필수 인지)

대한변호사협회 「변호사 광고에 관한 규정」 (2025.2.6 개정) 에 의해 변호사가 AI를 사용한다고 광고할 때:

1. **AI 시스템을 협회에 사전 등록**
2. **AI 결과물을 검토한 변호사 이름 명시**

본 챗봇은 다음과 같이 컴플라이언스를 준수합니다:

- **법률 자문 직접 제공 금지** — system prompt 에서 명시적으로 금지
- **결과/금액 예측 금지**
- **무료/할인/환불/최고/유일 표현 금지**
- 응답 끝에 변호사 직접 상담 권유 자동 삽입
- ChatModal 푸터에 **"AI 응답은 변호사 사후 검토"** 고지 표시
- 채팅 로그가 Firestore `chat_messages` 컬렉션에 자동 저장 → **변호사가 어드민 페이지에서 검토 가능**

> ⚠️ **운영 시작 전 대한변호사협회에 AI 챗봇 사용 사전 등록을 진행해 주세요.** 등록 미완료 시 광고규정 위반 가능성.

## API 키 발급

### Anthropic Claude (권장)

1. https://console.anthropic.com 가입 (또는 로그인)
2. **API Keys** 메뉴 → **Create Key**
3. 이름: `toesahero-chatbot` 등
4. 생성된 `sk-ant-api03-...` 형식 키 복사

### 비용

- 모델: `claude-haiku-4-5` (가장 저렴)
- 입력: $0.25 / 1M 토큰
- 출력: $1.25 / 1M 토큰
- 평균 대화 1회: 약 $0.001~$0.005 (월 100건 = $1 미만)
- **결제 카드 등록 필요** (사용량만큼 청구)
- 무료 크레딧 $5 제공 (일정 기간)

## Cloudflare Pages 환경변수 등록

1. https://dash.cloudflare.com → Workers & Pages → **toesahero**
2. **Settings** 탭 → **Variables and Secrets** 또는 **Environment Variables**
3. **Production** 환경에 추가:
   - 변수 이름: `ANTHROPIC_API_KEY`
   - 값: `sk-ant-api03-...` (위에서 복사)
   - **Encrypt** (Secret 으로) 체크
4. 저장
5. **Production** 의 가장 최근 배포를 **Retry** 또는 빈 커밋 푸시 → Functions 가 새 환경변수 인식

## 동작 검증

1. https://toesahero.pages.dev 새로고침 (`Ctrl+Shift+R`)
2. 우하단 💬 카톡 문의 → 모달 열기
3. 빠른답장 또는 직접 입력으로 메시지 보내기
4. **첫 응답이 1~3초 후 도착**: AI 작동 (이전엔 1.1초 즉시 = hardcoded 폴백)
5. 어드민 페이지 `/admin/chats` 에서 의뢰인 메시지 + 봇 응답 모두 기록되는지 확인

## 폴백 동작 (API 키 미설정 시)

`ANTHROPIC_API_KEY` 가 설정되지 않으면 `/api/chat` 가 503 응답 → ChatModal 이 자동으로 **기존 hardcoded 응답**(4가지 빠른답장 매핑)으로 폴백. 사이트가 깨지지 않습니다.

## System Prompt 수정

`functions/api/chat.ts` 의 `SYSTEM_PROMPT` 상수를 편집한 뒤 git push → 자동 재배포.

수정 가이드:
- **금지 표현 리스트는 유지** (변협 규정 준수)
- 가격 정보(199K/390K/790K)는 가격표 변경 시 같이 갱신
- 톤·이모지 사용 정도는 자유롭게 조정 가능

## 비용 모니터링

https://console.anthropic.com → **Usage** 탭에서 일/월 사용량 확인.

권장: **월 한도(Monthly Budget)** 를 설정해서 예상치 못한 비용 폭증 방지.

## 운영 중 챗봇 응답 검토 워크플로

1. 매일 어드민 `/admin/chats` 들어가서 최근 메시지 검토
2. 챗봇이 부적절한 답변(법률 자문 비슷한 내용)을 한 경우 → System Prompt 추가 강화
3. 의뢰인 본인 문의 사항이 명확하게 분류된 경우 → `/admin/consultations` 에서 상세 보기 → 직접 카톡 회신

## 챗봇 끄는 방법 (필요 시)

CF Pages 환경변수 `ANTHROPIC_API_KEY` 를 삭제하면 즉시 폴백 모드로 전환됩니다.
