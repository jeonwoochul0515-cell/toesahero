# Co-work 사용자 액션 프롬프트 모음

각 액션마다 **Co-work Claude (브라우저 자동화)** 에 그대로 복사·붙여넣기 할 수 있는 프롬프트입니다.
보안상 **비밀번호·개인 신분증 정보·사업자 등록증** 등은 Co-work에 직접 입력하지 말고, 화면에 본인이 직접 입력하세요.
받은 결과(API 키, UID 등)는 Claude Code 세션에 알려주시면 자동으로 등록·반영해드립니다.

---

## 📁 목차

| # | 액션 | 소요 | 필요한 것 | 우선순위 |
|---|---|---|---|---|
| A | Resend 가입 + API 키 발급 | 5분 | 이메일 | 🟢 즉시 |
| B | Resend 발송 도메인 검증 (선택) | 1주 | 자체 도메인 | 🔵 도메인 구매 후 |
| C | 토스페이먼츠 가맹 신청 | 10분 + 심사 2~3주 | 사업자등록증 / 통장사본 / 변호사 자격증 | 🟡 단기 |
| D | 변협 광고심사위 서면 자문 | 30분 | 사이트 카피·AI 챗봇 운영 방식 정리 | 🟢 즉시 |
| E | 부산지방변호사회 사전 자문 (대안) | 30분 | D와 동일 | 🟢 즉시 |
| F | Anthropic API 키 갱신 | 3분 | 결제 카드 | 🔵 필요 시 |
| G | 카카오 OIDC 비밀번호 변경 | 2분 | — | 🔴 즉시 (보안) |
| H | Firebase 어드민 비밀번호 변경 | 2분 | — | 🔴 즉시 (보안) |
| I | NHN Cloud 가입 + 카카오 알림톡 발신프로필 등록 | 30분 + 심사 1~3일 | 사업자등록증 | 🔵 1개월 |
| J | 도메인 구매 + Cloudflare 연결 | 30분 | 카드 | 🟡 단기 |

---

## A. Resend 가입 + API 키 발급 🟢 즉시

### Co-work 프롬프트

```
Resend (https://resend.com) 회원가입 및 API 키 발급을 도와주세요.

순서:
1. https://resend.com 접속 → 우측 상단 "Sign up" 클릭
2. Google 계정 또는 GitHub 계정으로 가입 (이메일 직접 입력도 가능)
3. 가입 완료 후 좌측 사이드바에서 "API Keys" 메뉴 클릭
4. "Create API Key" 버튼 클릭
5. 다이얼로그에서:
   - Name: toesahero-prod
   - Permission: Sending access (Full access 선택 X)
   - Domain: All domains (Sending access면 자동)
6. "Add" 클릭하면 re_로 시작하는 키가 한 번 표시됨 (이후 재확인 불가)
7. 그 키 값을 정확히 복사해서 화면에 보여주세요

추가로 좌측 메뉴에서 "Domains" 페이지를 잠깐 보여주세요. 도메인 검증이 어떻게 되어있는지 확인.

화면 캡처 + API 키 (re_...) 만 알려주시면 됩니다.
이메일·비밀번호 등 개인정보는 절대 채팅에 적지 마세요.
```

### 받은 키 등록 (Claude Code에서 알려주시면 처리)
```bash
echo "re_..." | npx wrangler pages secret put RESEND_API_KEY --project-name=toesahero
```

---

## B. Resend 발송 도메인 검증 🔵 도메인 구매 후

### Co-work 프롬프트

```
Resend에서 발송 도메인 (예: chungsong.law 또는 toesahero.kr) 을 검증하는 절차를 도와주세요.

전제: 도메인을 이미 구매했고, DNS 레코드 편집 권한이 있다고 가정.

순서:
1. https://resend.com → 좌측 "Domains" → "Add Domain"
2. 도메인 입력 (예: chungsong.law)
3. Region: ap-northeast-1 (도쿄) 또는 us-east-1 권장
4. 다음 화면에 표시되는 DNS 레코드들 (4~5개) 캡처:
   - SPF (TXT 레코드)
   - DKIM (CNAME 또는 TXT 레코드 3개)
   - DMARC (TXT 레코드, 선택)
5. 그 레코드들을 도메인 등록기관 (가비아·카페24·Cloudflare 등) DNS 설정에 추가
   - 도메인이 Cloudflare에 등록되어 있으면 Cloudflare DNS 페이지에서 추가
6. 추가 후 Resend 화면에서 "Verify DNS Records" 클릭 (전파에 5분~24시간)
7. 모든 레코드가 ✓ 초록색으로 변하면 발송 도메인 검증 완료

확인되면 Resend Domains 페이지의 도메인 상태(✓ Verified)와 발송 가능한 from 주소 형식을 알려주세요.
```

### 받은 정보로 등록
```bash
echo "법률사무소 청송 <noreply@chungsong.law>" | npx wrangler pages secret put RESEND_FROM_EMAIL --project-name=toesahero
echo "lawchungsong@daum.net" | npx wrangler pages secret put RESEND_BCC_EMAIL --project-name=toesahero
```

---

## C. 토스페이먼츠 가맹 신청 🟡 단기

### Co-work 프롬프트

```
토스페이먼츠 (https://www.tosspayments.com) 가맹점 신청을 도와주세요.

본인 정보:
- 사업자명: 법률사무소 청송
- 대표자: 김창희 변호사
- 업종: 법률 서비스 (변호사 사무소)
- 사업자등록번호: (본인 직접 입력)

순서:
1. https://www.tosspayments.com → "시작하기" 또는 "가맹 신청" 클릭
2. 약관 동의 → 사업자 유형: 법인 또는 개인사업자 (사무소 운영 형태에 따라)
3. 다음 정보 입력:
   - 사업자명: 법률사무소 청송
   - 대표자명: 김창희
   - 업종 분류: 법률·회계 서비스 (또는 전문 서비스)
   - 사업장 주소: 부산광역시 연제구 법원남로15번길 10, 202호
   - 연락처: 1660-4452
   - 정산 계좌: (본인 직접 입력)
4. 서류 업로드:
   - 사업자등록증 사본
   - 통장 사본 (정산 계좌)
   - 대표자 신분증 사본
   - (선택) 변호사 자격증 사본
5. 제출 후 영업일 기준 5~10일 심사
6. 심사 진행 단계 화면을 캡처해 주시고, 다음 단계로 진행하면 알려주세요

승인 메일 도착 후:
1. 토스페이먼츠 관리자 페이지 로그인 (https://merchant.tosspayments.com/)
2. "개발자센터" → "API 키" 메뉴
3. 다음 두 키를 캡처:
   - Client Key (test_ck_... 또는 live_ck_...)
   - Secret Key (test_sk_... 또는 live_sk_...) ⚠️ 절대 외부 노출 금지
4. 두 키 값을 알려주세요. Secret Key는 GitHub/채팅에 직접 적지 말고 비밀로 전달.

⚠️ 주의: 변호사 광고규정상 토스페이먼츠 결제 도입 자체는 합법이지만, "할인", "환불", "분할납부" 같은 광고 표현은 금지입니다. 가맹 신청 시 이런 표현으로 마케팅하지 않도록 주의.
```

### 받은 키 등록
```bash
# Client Key (브라우저 노출 가능)
echo "test_ck_..." | gh secret set VITE_TOSS_CLIENT_KEY --repo jeonwoochul0515-cell/toesahero

# Secret Key (서버 사이드 only)
echo "test_sk_..." | npx wrangler pages secret put TOSS_SECRET_KEY --project-name=toesahero
```

---

## D. 변협 광고심사위 서면 자문 🟢 즉시 (가장 중요)

### Co-work 프롬프트

```
대한변호사협회 광고심사위원회에 서면 자문을 신청하는 절차를 도와주세요.

목적:
- 사이트 (https://toesahero.pages.dev) 의 카피·가격 표시·AI 챗봇·통보문 자동 초안 생성·후기 게재 방식이 「변호사 광고에 관한 규정」 (2025.2.6 개정) 에 적합한지 사전 확인.

순서:
1. https://www.koreanbar.or.kr 접속
2. 상단 메뉴 "법규집" 또는 "광고심사위원회" 검색
3. 광고심사위원회 페이지에서 다음 정보 확인:
   - 자문 신청 양식 (PDF)
   - 신청 방법 (이메일 / 우편)
   - 회신 기간 (보통 2~4주)
4. 신청 양식 다운로드 → 다음 항목 채워야 함:
   - 사무소명: 법률사무소 청송
   - 변호사명: 김창희
   - 자문 대상 광고: 사이트 URL + 핵심 화면 캡처
   - 자문 사항 (구체적 질문)
5. 다음 자문 사항을 양식에 그대로 사용:

────────────────────
자문 사항:

1. 본 사이트 (https://toesahero.pages.dev) 의 카피 및 가격 표시(199,000원 / 390,000원 / 790,000원) 가 「변호사 광고에 관한 규정」 제○조에 위배되지 않는지

2. 의뢰인이 카카오톡 모달에서 AI 챗봇과 대화한 사실관계를 바탕으로, 변호사 명의 공식 통보문 1차 초안을 AI(Anthropic Claude)가 자동 생성하고, 변호사 본인이 검토·수정·승인 후 발송하는 방식이 동 규정 및 변호사윤리장전상 적법한지

3. 의뢰인 동의를 받은 후기 게재 (의뢰인 직군·연령 표기 + 절차 만족도 — 결과·금액 언급 X) 가 동 규정 제4조 제8호 단서에 따라 적법한지

4. 사이트 푸터·각 결제 페이지에 "본 사이트는 변호사법 제23조에 따른 광고물입니다" 명시가 동 규정상 충분한지

5. AI 챗봇 사용 시 협회 사전 등록 의무가 있는지 (있다면 절차)

6. 본인 사무소 위치 (부산) 의 지방변호사회 (부산지방변호사회) 광고심사를 거치는 것이 본회 자문과 별도로 필요한지
────────────────────

6. 신청서 + 사이트 화면 캡처 첨부 → 이메일 또는 우편 발송
   - 이메일: 변협 홈페이지에서 광고심사위원회 담당자 메일 확인
   - 우편: 서울 강남구 테헤란로 124 대한변호사협회 광고심사위원회

7. 발송 완료 후 회신 메일 받으면 그 내용을 알려주세요.

추가로 변협 신문 (https://news.koreanbar.or.kr) 에서 "AI" 또는 "광고규정" 키워드로 최근 6개월 뉴스 검색해 관련 안내문이 있는지 확인 부탁드립니다.
```

---

## E. 부산지방변호사회 광고심사 자문 (대안 / 병행) 🟢 즉시

### Co-work 프롬프트

```
부산지방변호사회 광고심사 자문 신청을 도와주세요. (변협 본회 자문과 병행 가능)

순서:
1. https://www.busanbar.or.kr 접속
2. 상단 메뉴에서 "법규집" 또는 "광고심사" 검색
3. 자문 신청 절차·양식·연락처 확인

연락처 (확인용):
- 부산지방변호사회 ☎ 051-621-3300
- 주소: 부산광역시 연제구 법원남로15 (변호사회관)

전화로 직접 다음 사항 문의해도 됩니다:
"법률사무소 청송 김창희 변호사 사무실입니다. 퇴사대행 서비스 사이트(https://toesahero.pages.dev)를 운영하려고 하는데, AI 챗봇 사용·통보문 자동 초안 생성·후기 게재가 변협 2025년 2월 개정 광고규정상 적합한지 사전 자문을 받고 싶습니다. 절차와 필요 서류를 안내해 주실 수 있을까요?"

전화 후 안내받은 절차를 알려주세요.
```

---

## F. Anthropic API 키 갱신 (필요 시) 🔵

### Co-work 프롬프트

```
Anthropic Console (https://console.anthropic.com) 에서 API 키를 새로 발급하는 절차를 도와주세요.

순서:
1. https://console.anthropic.com 로그인
2. 좌측 사이드바 "API Keys" 클릭
3. 기존 키 이름 (toesahero-chatbot) 옆 "Revoke" 또는 "Delete" 클릭 (이전 키 폐기)
4. "Create Key" 클릭
5. 이름: toesahero-prod-2026 (날짜 포함)
6. 워크스페이스: Default
7. 생성된 sk-ant-api03-... 형식 키 한 번 표시됨 → 정확히 복사
8. 키 값을 알려주세요

추가로 다음을 확인해 주세요:
- 좌측 "Usage" 메뉴 → 이번 달 사용량 확인 후 알려주세요
- 좌측 "Plans & Billing" → 현재 결제 카드 등록 상태 확인
- 좌측 "Limits" → Monthly Budget 설정 ($50 권장 — 현재 미설정 상태일 가능성)
```

---

## G. 카카오 OIDC 비밀번호 변경 🔴 즉시 (보안 노출)

### Co-work 프롬프트

```
이전에 채팅으로 노출되었던 카카오 비밀번호를 변경하는 절차를 도와주세요.

순서 1 (카카오 계정 비밀번호):
1. https://accounts.kakao.com 로그인
2. 좌측 메뉴 "비밀번호 변경" 클릭
3. 현재 비밀번호 입력 → 새 비밀번호 (8자 이상, 영숫자+특수문자) 입력 → 확인
   ⚠️ 비밀번호는 직접 타이핑하시고 채팅에 적지 마세요
4. 변경 완료 후 알려주세요

순서 2 (선택 — 카카오 디벨로퍼스 비밀번호도 다른 경우):
1. https://developers.kakao.com 로그인
2. 우상단 본인 계정 → 설정 → 비밀번호 변경
3. 새 비밀번호 설정

순서 3 (퇴사히어로 카카오 OIDC Client Secret 갱신, 보안상 권장):
1. https://developers.kakao.com → 내 애플리케이션 → 퇴사히어로 (앱 ID 1447461)
2. 좌측 "제품 설정 → 카카오 로그인 → 보안" 클릭
3. 기존 Client Secret 코드 삭제 → 새로 생성
4. 새 코드 복사 → 알려주세요

새 Client Secret을 알려주시면 Firebase Console의 OIDC Provider (oidc.kakao) 설정도 같이 갱신해야 합니다 (Co-work 추가 작업으로 진행).
```

---

## H. Firebase 어드민 비밀번호 변경 🔴 즉시 (보안 노출)

### Co-work 프롬프트

```
Firebase 어드민 계정 (jeonwoochul0515@gmail.com) 의 비밀번호를 변경하는 절차를 도와주세요. 이전에 채팅으로 평문 노출되었습니다.

순서:
1. https://toesahero.pages.dev/admin/login 접속
2. 이메일·비밀번호 입력 후 로그인 (아직 이전 비밀번호로 가능)
3. 또는 Firebase Console에서 직접 처리하려면:
   - https://console.firebase.google.com/project/durable-binder-457823-g3/authentication/users
   - 어드민 계정 (jeonwoochul0515@gmail.com) 의 점 3개 메뉴 → "비밀번호 재설정 이메일 보내기"
   - 본인 메일 받아서 새 비밀번호 설정 (직접 타이핑, 채팅에 적지 말기)
4. 변경 후 https://toesahero.pages.dev/admin/login 에서 새 비밀번호로 로그인 시도

비밀번호 변경 후 어드민 페이지(/admin) 에서 다음을 확인:
- 대시보드 통계 정상 표시
- 칸반 / 상담 요청 / 후기 관리 / 블로그 / 채팅 로그 5개 메뉴 모두 접속 가능
- 콘솔에 에러 없는지 (F12 → Console)

확인 후 알려주세요.
```

---

## I. NHN Cloud 가입 + 카카오 알림톡 발신프로필 등록 🔵 1개월

### Co-work 프롬프트

```
NHN Cloud (https://www.toast.com) 가입 후 Bizmessage(알림톡) 서비스를 신청하는 절차를 도와주세요.

전제: 사업자등록증 + 카카오톡 채널 (pf.kakao.com/_zkzIX) 활성화 완료.

순서:
1. https://www.toast.com 회원가입 (사업자 등록 정보 필요)
2. 가입 후 콘솔 진입 → "서비스 활성화" → **Bizmessage** 검색 → 활성화
3. Bizmessage 콘솔에서 다음 진행:
   - 좌측 "발신프로필 관리" → "+ 발신프로필 등록"
   - 카카오 비즈니스 계정 인증 (한 번만)
   - 발신프로필 키(senderkey) 발급 — 약 1~3일 카카오 심사
4. 심사 통과 후 senderkey 값 캡처 → 알려주세요

추가로:
- 좌측 "템플릿 관리" 들어가서 다음 3개 템플릿을 등록 신청 (각각 카카오 검수 1주):

[템플릿 1: 의뢰 접수]
이름: 퇴사히어로 의뢰 접수
카테고리: 서비스 이용
본문:
[퇴사히어로] 의뢰가 정상 접수되었습니다.

#{고객명}님, 법률사무소 청송에 의뢰해 주셔서 감사합니다.

▶ 접수번호: #{접수번호}
▶ 변호사 김창희가 영업일 기준 검토 후 회신드립니다.

자세한 진행 상황은 마이페이지에서 확인하실 수 있습니다.

문의: ☎ 1660-4452

[템플릿 2: 통보문 발송 완료]
이름: 퇴사히어로 통보문 발송
본문:
[퇴사히어로] 회사 측에 통보문이 발송되었습니다.

#{고객명}님, 변호사 명의 공식 통보문이 회사 측에 정상 발송되었습니다.

▶ 발송 일시: #{발송일시}
▶ 회사 응답을 변호사가 직접 응대합니다.

문의: ☎ 1660-4452

[템플릿 3: 결제 링크]
이름: 퇴사히어로 결제 안내
본문:
[퇴사히어로] 위임 결제 안내드립니다.

#{고객명}님, 사안 검토를 마쳤습니다. 위임 진행 시 아래 링크에서 결제 부탁드립니다.

▶ 패키지: #{패키지명}
▶ 보수: #{금액}원

결제 링크: #{결제URL}

문의: ☎ 1660-4452

각 템플릿 등록 후 카카오 검수 결과 (승인/반려) 를 1주 후 확인하고 알려주세요.

대안: NHN Cloud가 복잡하면 Aligo (https://smartsms.aligo.in) 또는 쿨SMS (https://coolsms.co.kr) 가 더 간단합니다. 비교해서 결정.
```

---

## J. 도메인 구매 + Cloudflare 연결 🟡 단기

### Co-work 프롬프트

```
도메인 구매 + Cloudflare Pages 커스텀 도메인 연결을 도와주세요.

도메인 후보:
- toesahero.kr (가장 자연스러움)
- toesahero.com (글로벌)
- chungsong.law (변호사 사무소 명의)
- 기타 (사용자 결정)

가격 비교:
- 가비아 (https://gabia.com): .kr 약 22,000원/년
- 카페24 (https://hosting.cafe24.com): .kr 비슷
- Cloudflare Registrar (https://dash.cloudflare.com): .com 약 $10/년 — 가장 저렴 + 자동 Cloudflare 연결

추천: Cloudflare Registrar 가 절차 가장 간단. 다만 .kr은 한국 등록기관 필요.

순서 (Cloudflare 기준):
1. https://dash.cloudflare.com → 좌측 "Domain Registration" → "Register Domains"
2. 도메인 검색 → 사용 가능 확인 → 카드 결제
3. 등록 완료 후 자동으로 Cloudflare DNS에 추가됨

순서 (가비아 등 외부 등록기관 기준):
1. 도메인 검색 → 결제 → 등록
2. Cloudflare 계정에서 "Add Site" → 도메인 입력
3. Cloudflare가 알려주는 네임서버 2개 (예: alex.ns.cloudflare.com, sara.ns.cloudflare.com) 를
   가비아 도메인 관리 → 네임서버 변경 메뉴에서 등록
4. 24시간 이내 전파

도메인 구매 + Cloudflare 등록 완료 후 다음 진행:
1. https://dash.cloudflare.com → Workers & Pages → toesahero → Custom domains
2. "Set up a custom domain" 클릭 → 구매한 도메인 입력
3. Cloudflare가 자동으로 CNAME / A 레코드 추가
4. SSL 인증서 자동 발급 (수분~1시간)

도메인 라이브 후 다음 두 가지 추가 작업이 필요 (이건 Claude Code 세션에서 진행):
- Firebase Auth 승인된 도메인에 새 도메인 추가
- 카카오 OIDC Redirect URI 갱신 (도메인 변경 시 카카오 콘솔도 동시 갱신)

도메인 구매 완료 + Cloudflare 연결 상태를 알려주세요.
```

---

## 🔄 추가 작업 (Co-work에서 진행 가능)

### K. Firestore 첫 블로그 글 시드 데이터 생성

블로그 어드민에서 직접 작성해도 되지만, Co-work으로 빠르게 시드:

```
Firestore Database 콘솔(https://console.firebase.google.com/project/durable-binder-457823-g3/firestore/data) 에서 posts 컬렉션에 첫 블로그 글을 추가해 주세요.

순서:
1. Firestore Database → "+ 컬렉션 시작" → 컬렉션 ID: posts
2. 첫 문서 추가 (자동 ID):

필드:
- slug (string): "lawyer-vs-nomusa-2025"
- title (string): "변호사 운영 퇴사대행과 노무사 운영 업체의 차이 — 2022 대법원 판결 이후"
- excerpt (string): "노무사가 의뢰인 대행으로 고소장을 작성·제출한 행위가 변호사법 위반에 해당한다는 2022년 대법원 판결 이후, 분쟁 단계 퇴사대행은 변호사 전속 사무가 되었습니다."
- body (string): (본문 마크다운 — 변호사 본인이 직접 작성하거나 어드민 페이지에서 작성)
- tags (array of strings): ["변호사법", "노무사", "퇴사대행", "대법원판결"]
- coverEmoji (string): "⚖️"
- author (string): "김창희 변호사"
- status (string): "draft" (먼저 초안으로, 변호사 본인이 검토 후 published 변경)
- createdAt (timestamp): (현재 시각)
- updatedAt (timestamp): (현재 시각)

저장 후 어드민 페이지 https://toesahero.pages.dev/admin/blog 에서 표시되는지 확인하고 알려주세요.
```

---

## 📋 체크리스트 — 운영 시작 전 모든 사용자 액션

운영 시작 (실제 의뢰 받기) 전 다음 항목을 모두 완료:

- [ ] **G. 카카오 OIDC 비밀번호 변경** ⚠️
- [ ] **H. Firebase 어드민 비밀번호 변경** ⚠️
- [ ] **D 또는 E. 변협/지방회 광고심사 자문** ⚠️ (회신 받기 전 운영 보류 권장)
- [ ] **A. Resend API 키** (이메일 자동 발송)
- [ ] **C. 토스페이먼츠 가맹** (결제)
- [ ] **B. 도메인 + Resend 도메인 검증** (이메일 신뢰성)
- [ ] **J. 도메인 구매 + Cloudflare 연결** (브랜드)
- [ ] **I. NHN Cloud + 카카오 알림톡 템플릿** (의뢰인 알림)
- [ ] 변호사 본인 사진 (이미 적용 ✓)
- [ ] 변호사 직인 디지털 이미지 (PDF 인쇄 페이지의 placeholder 자리)
- [ ] 첫 블로그 글 3편 (변호사 본인 작성)

---

## 💡 사용 팁

1. **각 액션은 독립적**으로 진행 가능. 우선순위 🔴 → 🟢 → 🟡 → 🔵 순서 권장.
2. **API 키 / 비밀번호는 절대 채팅에 평문으로 적지 말기**. Co-work에 키를 보여달라고 할 때는 "화면에만 표시" 명시.
3. **각 단계 완료 후 Claude Code 세션에 알려주시면** 즉시 등록·연동 처리.
4. 변협 자문 회신은 **2~4주** 걸릴 수 있으므로 미리 신청하고 다른 작업과 병행.
