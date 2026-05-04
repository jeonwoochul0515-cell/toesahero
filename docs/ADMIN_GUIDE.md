# 어드민 페이지 사용 가이드

법률사무소 청송 변호사 김창희 어드민 전용 가이드.

## 1. 첫 어드민 계정 만들기 (1회)

### Step 1 — Firebase Console에서 이메일 인증 활성화
1. https://console.firebase.google.com/project/durable-binder-457823-g3/authentication/providers
2. **로그인 방법** → **이메일/비밀번호** → **사용 설정** → 저장

### Step 2 — 어드민 계정 생성
1. 같은 페이지 → **사용자** 탭 → **사용자 추가**
2. 이메일: 예) `lawyer@chungsong.law` 또는 사무소 이메일
3. 비밀번호: 강력한 비밀번호 (8자 이상, 영문+숫자+기호)
4. 추가 → 생성된 사용자의 **UID** 복사 (긴 영숫자, 예: `aBcDeF1234...`)

### Step 3 — 어드민 권한 부여 (Firestore에 admin 등록)
1. https://console.firebase.google.com/project/durable-binder-457823-g3/firestore/data
2. **컬렉션 시작** → 컬렉션 ID: `admins`
3. **문서 ID**: 위에서 복사한 **UID**를 그대로 붙여넣기 (자동 ID 아님!)
4. 필드 추가:
   - `email` (string): `lawyer@chungsong.law`
   - `name` (string): `김창희`
   - `role` (string): `owner`
   - `addedAt` (timestamp): 현재 시각
5. 저장

## 2. 어드민 접속

https://toesahero.pages.dev/admin/login

위에서 만든 이메일/비밀번호로 로그인 → 자동으로 `/admin` 대시보드로 이동.

> 권한이 없는 계정으로 로그인 시 자동 로그아웃 + 에러 메시지 표시됩니다.

## 3. 화면 구성

### 대시보드 (`/admin`)
- **전체 / 이번 주 / 오늘 / 신규 미처리 / 진행 중** 5개 stat
- 최근 상담 요청 8건 테이블
- 클릭하면 상세로 이동

### 상담 요청 (`/admin/consultations`)
- 전체 상담 (최근 500건 실시간 동기화)
- 검색: 이름·이메일·메시지 키워드 (Set 기반 즉시 필터링)
- 상태 필터: 신규/연락/상담/위임/종료
- 클릭 → 상세 페이지

### 상담 상세 (`/admin/consultations/:id`)
- 의뢰인 정보 (이름·이메일·UID·연락처·페이지 경로)
- 메시지 + 계산기 선택 항목 + 참고 합산액
- **상태 변경 버튼** 5개 (즉시 저장)
- **변호사 메모** 텍스트 영역 (저장 버튼)

### 채팅 로그 (`/admin/chats`)
- 카톡 모달의 모든 메시지 (의뢰인/봇 양쪽)
- AI 챗봇 응답 검토용

## 4. 상태 흐름 (워크플로)

```
신규 → 연락 완료 → 상담 완료 → 위임 체결 → 종료
```

- **신규 (new)**: 의뢰 직후 (기본값)
- **연락 완료 (contacted)**: 변호사가 카카오·전화 회신
- **상담 완료 (consulted)**: 1차 상담 종료, 의뢰인이 결정 중
- **위임 체결 (contracted)**: 위임계약서 작성·결제 완료
- **종료 (closed)**: 사건 종료 또는 의뢰인 포기

## 5. 보안 / 주의

- 어드민 계정 비밀번호 절대 공유 금지
- Firestore `consultations` 데이터에는 의뢰인 개인정보 포함 — **변호사 비밀유지 의무 적용**
- 어드민이 추가로 필요할 때만 (직원 등) `admins` 컬렉션에 UID 추가
- 어드민 권한 회수: 해당 UID 문서 삭제

## 6. 확장 아이디어 (필요 시)

- 의뢰인에게 이메일/카카오로 회신 알림 전송 → Firebase Cloud Functions
- CSV 내보내기 (Excel 분석용)
- 상태별 자동 알림 설정
- 변호사 여러 명 분담 시 `assignedTo` 필드 활용 (이미 보안 규칙 허용됨)
