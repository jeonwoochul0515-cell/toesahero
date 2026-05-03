# 퇴사히어로 — 배포 가이드

**스택**: React + Vite + TypeScript / Firebase Firestore (백엔드) / Cloudflare Pages (호스팅) / GitHub (소스)

## 1. 로컬 개발

```bash
npm install
npm run dev      # http://localhost:5173
```

## 2. Cloudflare Pages 연결 (1회 설정)

1. https://dash.cloudflare.com 로그인
2. 좌측 메뉴 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. GitHub 인증 → 이 저장소 선택
4. 빌드 설정:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `(비워둠)`
5. **환경변수** 섹션에 Firebase 키 입력 (선택사항 — 입력 안 하면 상담 저장 기능만 비활성화):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
6. **Save and Deploy** — 약 1~2분 후 `https://<repo-name>.pages.dev` 발급

이후 `git push` 할 때마다 Cloudflare Pages 가 자동 빌드/배포합니다.

## 3. 도메인 연결

도메인 구매 후:
1. Cloudflare Pages 프로젝트 → **Custom domains** → **Set up a custom domain**
2. 도메인 입력 (예: `toesahero.kr`)
3. Cloudflare 가 안내하는 DNS 레코드(CNAME) 를 도메인 등록기관에 추가
4. SSL 자동 발급 — 보통 수분 내 적용

도메인을 Cloudflare 에 직접 등록하면 더 간단 (Nameserver 만 변경하면 자동 처리).

## 4. Firebase Firestore 연결 (백엔드 데이터 저장)

상담 요청 / 채팅 메시지를 Firestore 에 저장하려면:

1. https://console.firebase.google.com → 프로젝트 생성 또는 선택
2. **Firestore Database** → 데이터베이스 만들기 → **프로덕션 모드** → 위치 `asia-northeast3 (서울)`
3. 좌측 톱니바퀴 → **프로젝트 설정** → 내 앱 → **웹앱 추가 (`</>`)** → 닉네임 입력
4. 표시되는 `firebaseConfig` 값을 위 Cloudflare Pages 환경변수에 그대로 넣기
5. 보안 규칙은 `firestore.rules` 에 작성되어 있음. 수동 적용:
   - Firebase 콘솔 → **Firestore Database** → **규칙** 탭
   - 이 저장소의 `firestore.rules` 내용 복사 → 붙여넣기 → **게시**

## 5. Firestore 데이터 구조

### `consultations`
```ts
{
  source: "chat" | "form" | "floating",
  message?: string,
  pickedItems?: string[],
  estimatedAmount?: number,
  contact?: string,
  meta?: object,
  createdAt: Timestamp,
  userAgent: string,
  path: string
}
```

### `chat_messages`
```ts
{
  text: string,
  role: "me" | "them",
  createdAt: Timestamp
}
```

## 6. 운영 체크리스트
- [ ] 변호사 김창희 사진을 `Lawyer.tsx` 에 교체
- [ ] 카카오톡 채널 URL 연결 (`https://pf.kakao.com/...`)
- [ ] 결제 PG 연동 (토스페이먼츠 / 포트원)
- [ ] 후기 데이터 Firestore 마이그레이션 (현재 `Reviews.tsx` 하드코딩)
- [ ] 가짜 실시간 토스트 (`FloatingButton.tsx`) 실제 데이터 연결 또는 제거
- [ ] 이용약관 / 개인정보처리방침 페이지 작성
