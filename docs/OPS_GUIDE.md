# 운영 자동화 가이드 (Track B)

이메일 발송 / PG 결제 / 카카오 알림톡 — 트랙 B 인프라 활성화 가이드.
코드는 모두 배포되어 있고, **외부 서비스 가입·키 등록**만 하시면 즉시 작동합니다.

---

## 1. 이메일 자동 발송 (Resend)

### 1-1. 가입 + API 키 발급 (5분)

1. https://resend.com 회원가입 (Google 로그인 가능)
2. 좌측 메뉴 **API Keys** → **Create API Key**
3. 권한: **Sending access**
4. 이름: `toesahero-prod`
5. 표시되는 `re_...` 형식 키 복사 (한 번만 표시)

### 1-2. 발송 도메인 설정 (선택, 권장)

**옵션 A — 임시 도메인 (즉시 시작)**
- 별도 설정 없이 `onboarding@resend.dev` 에서 발송 (테스트용)
- 단점: 회사 측 인사담당자가 의심할 수 있음 (스팸 필터)

**옵션 B — 변호사 도메인 (권장)**
- 도메인 구매 후 (예: `chungsong.law`)
- Resend → **Domains** → **Add Domain** → DNS 레코드 (SPF / DKIM / DMARC) 등록
- 검증 완료 후 `noreply@chungsong.law` 발송 가능
- 회사 측에서 신뢰성 ↑

### 1-3. Cloudflare Pages 환경변수 등록

```bash
# 사용자가 알려주시면 제가 등록 가능 (CF 대시보드 또는 wrangler):
echo "re_..." | npx wrangler pages secret put RESEND_API_KEY --project-name=toesahero
echo "법률사무소 청송 <noreply@chungsong.law>" | npx wrangler pages secret put RESEND_FROM_EMAIL --project-name=toesahero
echo "lawchungsong@daum.net" | npx wrangler pages secret put RESEND_BCC_EMAIL --project-name=toesahero
```

### 1-4. 작동 확인

1. 어드민 → 상담 요청 → 통보문 초안 [✓ 승인] 후
2. **📧 회사 측 자동 이메일 발송** 섹션에서 회사 메일 입력 → 발송
3. Firestore의 draftStatus 가 'sent', status 가 'contacted' 로 자동 전이
4. BCC 설정해두면 변호사 메일에도 동일 메일 도착

### 1-5. 비용
- 무료 티어: 월 3,000건 + 일 100건
- 유료: 월 $20 (50K 건/월)
- 퇴사대행 발송 규모(월 100~500건)는 **무료 한도 내** 충분

---

## 2. 토스페이먼츠 결제 (PG 가맹)

### 2-1. 가맹 신청 (2~3주 심사)

1. https://www.tosspayments.com 접속 → **시작하기**
2. 사업자 유형: **법인** (법률사무소 청송)
3. 필수 서류:
   - 사업자등록증 (법률사무소 청송)
   - 통장사본 (법인 명의)
   - 대표자 신분증
   - 변호사 자격증 사본 (참고용)
4. 업종: **법률 서비스** 또는 **전문 서비스**
5. 심사 기간: 영업일 기준 **5~10일** (변호사 업종 추가 검토 가능)

### 2-2. 가맹 승인 후 키 발급

승인 메일 도착 → 토스페이먼츠 관리자 페이지 로그인 → **개발자센터 → API 키**

| 키 | 용도 | 등록 위치 |
|---|---|---|
| **Client Key** (`live_ck_...` 또는 `test_ck_...`) | 클라이언트 노출 가능 (결제 위젯) | GitHub Secret `VITE_TOSS_CLIENT_KEY` |
| **Secret Key** (`live_sk_...` 또는 `test_sk_...`) | **서버 사이드 only**, 결제 승인 호출 | CF Pages Secret `TOSS_SECRET_KEY` |

### 2-3. 키 등록 (사용자가 알려주시면 제가 처리)

```bash
# 클라이언트 (GitHub Secret — Vite 빌드 타임에 주입)
echo "test_ck_..." | gh secret set VITE_TOSS_CLIENT_KEY --repo jeonwoochul0515-cell/toesahero

# 서버 (CF Pages Secret — runtime)
echo "test_sk_..." | npx wrangler pages secret put TOSS_SECRET_KEY --project-name=toesahero
```

### 2-4. 작동 흐름

```
의뢰인 채팅 (AI) → 통보문 초안 생성 → 위임 검토 신청 (Firestore source='draft')
   ↓ (변호사 어드민에서 검토·승인 후)
의뢰인에게 카톡/이메일로 결제 링크 안내: https://toesahero.pages.dev/checkout/<caseId>?pkg=basic
   ↓
의뢰인이 페이지 진입 → 위임 동의 체크 → 토스 결제 위젯 (카드/계좌)
   ↓ (토스 결제 완료)
/api/payment/confirm 호출 → 토스 API 승인
   ↓ (성공)
Firestore consultations.paymentStatus = 'paid', paymentApprovedAt 기록
   ↓
어드민에서 결제 확인 → 통보문 자동 이메일 발송
```

### 2-5. 가맹 심사 전 운영
- 가맹 진행 중에는 결제 페이지에 "결제 인프라 준비 중" 안내 자동 표시
- 의뢰인은 카톡 채널 또는 ☎ 1660-4452 로 안내받음
- 무통장 입금 / 계좌이체 수동 처리 가능

### 2-6. 변협 광고규정 주의
- 결제 자체는 합법
- **할인·환불·후불·분할납부 광고 표현 절대 금지**
- 가격 표시는 가능 (현재 사이트 적용)
- 결제 완료 후 변호사 사실관계 확인이 어려운 사안은 변호사윤리장전에 따라 위임 거절 + 환불 가능

---

## 3. 카카오 알림톡 (Sender ID 인증)

### 3-1. 사전 요건
- **사업자등록증** 필수 (개인 불가)
- 카카오톡 채널 (`pf.kakao.com/_zkzIX`) 활성화 — 이미 보유 ✓
- 발송 대행사 선택 (3사 비교):

| 대행사 | 가격 (건당) | 장점 | 단점 |
|---|---|---|---|
| **NHN Cloud (Bizmessage)** | 9~13원 | 안정적, 큰 규모 | 가입 복잡 |
| **NCloud (Kakao Notification)** | 8~12원 | 네이버 클라우드 통합 | 한국어 문서만 |
| **Aligo / 쿨SMS** | 8~10원 | 가입 간단, 한국 친화 | 안정성 보통 |

추천: **NHN Cloud Bizmessage** (변호사 사무소 운영 안정성 우선)

### 3-2. 가입 + Sender ID 인증 (1~2주)

1. https://www.toast.com (NHN Cloud) 가입
2. **Bizmessage (알림톡 / 친구톡)** 서비스 신청
3. **카카오 비즈니스** 사이트에서 발신프로필 등록
4. 카카오 영업일 기준 1~3일 심사

### 3-3. 알림톡 템플릿 사전 검수 (1주)

발송할 메시지 양식을 사전에 카카오에 등록·검수:

#### 템플릿 1: 의뢰 접수 알림
```
[퇴사히어로] 의뢰가 정상 접수되었습니다.

#{고객명}님, 법률사무소 청송에 의뢰해 주셔서 감사합니다.

▶ 접수번호: #{접수번호}
▶ 변호사 김창희가 영업일 기준 검토 후 회신드립니다.

자세한 진행 상황은 마이페이지에서 확인하실 수 있습니다.

문의: ☎ 1660-4452
```

#### 템플릿 2: 통보문 발송 완료
```
[퇴사히어로] 회사 측에 통보문이 발송되었습니다.

#{고객명}님, 변호사 명의 공식 통보문이 회사 측에 정상 발송되었습니다.

▶ 발송 일시: #{발송일시}
▶ 회사 응답을 변호사가 직접 응대합니다.

문의: ☎ 1660-4452
```

#### 템플릿 3: 결제 링크
```
[퇴사히어로] 위임 결제 안내드립니다.

#{고객명}님, 사안 검토를 마쳤습니다. 위임 진행 시 아래 링크에서 결제 부탁드립니다.

▶ 패키지: #{패키지명}
▶ 보수: #{금액}원

결제 링크: #{결제URL}

문의: ☎ 1660-4452
```

각 템플릿은 **변수(#{고객명})는 변경 가능**, 본문은 **카카오 검수 통과 후 변경 불가**.

### 3-4. 코드 구현 — Phase 2.5 (별도 진행)

Sender ID + 템플릿 검수 끝나면:

```ts
// functions/api/notify-kakao.ts (스켈레톤)
interface Env {
  NHN_APP_KEY?: string;
  NHN_SECRET_KEY?: string;
  KAKAO_SENDER_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (...) => {
  // NHN Bizmessage API 호출
  // 템플릿 코드 + 변수 매핑
  // 발송 결과 Firestore에 기록
};
```

본 코드는 NHN 가입 + 발신 프로필 등록 + 템플릿 검수가 모두 끝난 후 작성합니다.

### 3-5. 비용 추정 (월 100건 기준)
- 알림톡: 100건 × 10원 = 1,000원
- 친구톡(LMS): 100건 × 30원 = 3,000원
- 총 월 5,000원 미만 (매우 저렴)

---

## 4. 사용자 액션 체크리스트

### 즉시 (오늘~다음주)
- [ ] **Resend** 가입 + API 키 발급 → 채팅에 알려주시면 제가 CF Pages 등록
- [ ] **변협 광고심사위 또는 부산지방변호사회 자문 신청** (서면)
- [ ] **카카오 OIDC 비밀번호** 변경 (이전 채팅 노출분)
- [ ] 어드민에서 https://toesahero.pages.dev/admin/login 직접 접속해 칸반·후기 관리 동작 확인

### 2~3주 (가맹 심사)
- [ ] **토스페이먼츠 가맹 신청**: 사업자등록증 + 통장사본 + 변호사 자격증
- [ ] 승인되면 Client Key / Secret Key 알려주시면 제가 등록
- [ ] **NHN Cloud / Aligo 가입** + 카카오 발신프로필 등록

### 1개월 후
- [ ] 알림톡 템플릿 3종 카카오 검수 완료 확인
- [ ] 도메인 구매 (`toesahero.kr` 또는 `chungsong.law`)
  - Cloudflare Pages 커스텀 도메인 연결
  - Resend 도메인 검증
  - Firebase Auth 승인된 도메인 추가

---

## 5. 운영 시작 후 모니터링

### 매일
- 어드민 `/admin` 대시보드 — 신규 의뢰 / 미처리 건
- 어드민 `/admin/chats` — AI 응답 부적절 여부

### 매주
- `/admin/consultations` — `draftStatus='pending_review'` 통보문 검토
- 결제 webhook 정상 작동 확인 (CF Pages Functions 로그)
- Resend 발송 로그 (반송률·스팸 신고 모니터링)

### 매월
- Anthropic Console 비용 확인
- Resend 발송량 확인
- 토스페이먼츠 정산 확인
- Firestore 사용량 확인 (Firebase Console)
- 후기 컨버전 확인 (어드민 `/admin/reviews`)
