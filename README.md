# Handoff: 퇴사히어로 (ToesaHero) — 변호사가 만든 퇴사대행 서비스 홈페이지

## Overview
"퇴사히어로"는 변호사 김창희(법률사무소 청송)가 직접 운영하는 합법적 퇴사대행 서비스의 메인 마케팅/랜딩 사이트입니다. 타깃은 20–30대 MZ 세대 "퇴준생". 친근하고 따뜻한 톤(밈 가득) + 변호사 직접 운영의 신뢰감을 동시에 전달하는 것이 핵심입니다.

## About the Design Files
이 폴더의 `reference/` 안 파일들은 **HTML로 만든 디자인 레퍼런스(프로토타입)**입니다. 의도한 룩앤필과 인터랙션을 보여주기 위한 것이지, 그대로 프로덕션에 복붙할 코드가 아닙니다.

작업 목표는 **이 디자인을 실제 코드베이스의 환경(예: Next.js, Nuxt, SvelteKit, Astro 등)에서 그 환경의 컨벤션에 맞게 재구현하는 것**입니다. 코드베이스가 아직 없다면 가장 적합한 프레임워크를 선택해서 구현하세요. (개인적으로는 Next.js + TypeScript + Tailwind 추천 — 실제 SEO·성능·배포 편의성 때문.)

## Fidelity
**High-fidelity (hifi)**. 색상·타이포그래피·간격·그림자·인터랙션 모두 의도된 최종 값입니다. 픽셀 단위로 재현하시되, 코드베이스의 컴포넌트/디자인토큰 시스템에 흡수해서 재사용 가능하게 만드는 것을 권장합니다.

## Brand & Tone
- **이름**: 퇴사히어로 (영문 표기 시 ToesaHero 또는 그냥 한글 그대로)
- **부가 라벨**: "by 변호사" — 신뢰성 부여용 작은 배지
- **톤**: MZ 밈 가득 (`ㄹㅇ`, `~함`, `ㄱㄱ`, `퇴준생`, `오케이` 등). 단, 변호사 자기소개와 법적 고지는 정중한 존댓말로 유지.
- **마스코트**: 노란 원 + 빨간 망토 + 검은 마스크의 단순 도형 슈퍼히어로. SVG로 그렸음 (`reference/components/mascot.jsx` 참조). pose 속성으로 stand / wave / fly / wink / shock 5가지 표정.

## Design Tokens

### Colors (Sunny 팔레트 — 기본)
```
--yellow:       #FFD60A   (메인 액센트, 히어로 배경, 마스코트)
--yellow-soft:  #FFF1A8   (옅은 배경)
--orange:       #FF6B35   (CTA, 강조, 망토)
--orange-soft:  #FFD1BF
--ink:          #0A0A0A   (주 텍스트, 모든 보더)
--ink-2:        #2A2A2A   (서브 텍스트)
--cream:        #FFFBF0   (페이지 배경)
--paper:        #FFFFFF   (카드 배경)
--gray-1:       #F4F1E8   (옅은 그레이 백)
--gray-2:       #E8E3D5
--muted:        #6B6B6B   (캡션)
--pink:         #FF8FB1   (마스코트 볼터치)
--green:        #4ADE80   (온라인 도트)
```

### 추가 팔레트 (Tweaks로 전환 가능)
- **mint**: yellow→`#B8F2D4`, orange→`#2EC4B6`
- **peach**: yellow→`#FFB5A7`, orange→`#E5383B`
- **lilac**: yellow→`#C8B6FF`, orange→`#7C5CE0`

### Dark mode
배경/잉크 색이 반전되되 yellow/orange 액센트는 그대로 유지. `body[data-dark="true"]`로 토글.

### Typography
- **한글**: Pretendard Variable (CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`)
- **영문/숫자/액센트**: Space Grotesk (Google Fonts, weights 500/600/700)
- **선택사항 (현재 미사용)**: Gaegu (손글씨 느낌)

### Type scale
- H1 (히어로): `clamp(40px, 7vw, 78px)` / weight 900 / line-height 1.32 / letter-spacing -.035em
- H2 (섹션): `clamp(32px, 5vw, 52px)` / weight 900 / line-height 1.1 / letter-spacing -.02em
- 본문: 16px / line-height 1.6
- Small: 13–14px

### Spacing & Shape
- Border radius: `--radius: 18px` (카드), `--radius-sm: 10px`, `--radius-lg: 28px`
- Border width: 모든 카드/버튼 `2.5px solid var(--ink)` — 두꺼운 검정 보더가 핵심 시그니처
- Shadows (offset-only, 블러 없음 — neo-brutalist 무드):
  - `--shadow: 6px 6px 0 0 var(--ink)`
  - `--shadow-sm: 3px 3px 0 0 var(--ink)`
  - `--shadow-lg: 10px 10px 0 0 var(--ink)`
- 섹션 padding: 80px 0 (모바일 56px)

### Interaction tokens
- 버튼 hover: `transform: translate(-2px, -2px)` + shadow grow
- 버튼 active: `transform: translate(2px, 2px)` + shadow shrink (눌리는 느낌)
- 카드 hover: `translate(-3px, -3px)` + 약간의 회전 (-0.5deg ~ 0.5deg)
- 트랜지션: 모두 0.15s–0.25s ease

## Screens / Sections

원페이지 랜딩 사이트. 섹션 순서대로:

### 1. Top Nav (sticky)
- 좌: 로고 (마스코트 32px + "퇴사히어로" + "by 변호사" 오렌지 배지, 살짝 회전)
- 중: 링크 (`이런 분에게 / 프로세스 / 변호사 / 가격 / 후기`) — 1000px 이하 숨김
- 우: 검정 primary 버튼 "💬 무료 상담"
- 배경 cream + 하단 2.5px ink 보더

### 2. Hero (`Hero` 컴포넌트)
- 좌측: pill (yellow 배경) + H1 3줄 (가운데 줄에 yellow 하이라이트 박스 + 약간 회전 + 그림자) + 서브카피 + CTA 2개 + trust row (4,200+, 98%, 1660-4452)
- 우측: 회전된 스마트폰 모킹 카드 — "회사 단톡방"에 사장이 메시지 보내다가 변호사 명의 통보가 박히는 시나리오. 오렌지 "CASE CLOSED" 스티커, "합법 ㄹㅇ" 노란 원형 스티커, fly pose 마스코트 떠다님 (3s ease-in-out infinite bob 애니메이션)
- 1050px 이하에서 단일 컬럼

#### Hero copy 3가지 변형 (A/B 테스트용)
- **boss** (기본): "사장님 얼굴 / 보기 싫어서 / ㄹㅇ 못 나가는 중?"
- **soft**: "퇴사 말 꺼내기 / 너무 힘들었지? / 이제 대신 해줄게."
- **legal**: "퇴사도 협상이다. / 근데 협상은 / 변호사가 잘함."

### 3. Marquee (검정 띠)
무한 스크롤. 항목: `변호사 직접 운영 ★ 비밀 보장 ㄹㅇ ★ 당일 통보 가능 ★ 퇴직금 못 받으면 환불 ★ 4,200+ 케이스` (yellow 별)

### 4. Audience (`이런 퇴준생들에게 ㄹㅇ 추천함`)
3×2 그리드의 6개 케이스 카드. 각 카드: 검정 pill 태그(#월요병 등) + 큰 이모지 + 두꺼운 타이틀(2줄) + 본문 한 줄. hover 시 들썩.

### 5. Calculator (`나도 모르게 떼이고 있던 돈 계산기`)
- 검정 배경 섹션
- 좌: H2 + 큰 노란 액센트 숫자 (예상 청구액, 흰 카드 안에 큰 오렌지 숫자)
- 우: 6개 토글 항목 (월급/퇴직금/연차/야근/괴롭힘/실업급여) — 클릭하면 yellow 배경 + 체크 + 합계에 더해짐
- 기본값: 퇴직금 + 연차 켜짐
- 합계는 `ko-KR` 로케일 포맷팅

### 6. Process (4단계)
- 4컬럼 카드 (1000px 이하 2컬럼, 600px 이하 1컬럼)
- 각 카드: 큰 영문 번호(01–04) + 시간 pill + 이모지 + 타이틀 + 본문 + 하단 점선 위 오렌지 사이드 라벨
- hover 시 카드 전체 yellow 배경으로 변하고 들썩
- 카드 사이 오렌지 화살표(절대 위치)

### 7. Lawyer (변호사 소개)
- 2컬럼: 좌측 portrait 프레임(노란 배경, 회전, dashed 보더 placeholder, wink pose 마스코트 도장 + "10년+ · 1,000건+" 검정 태그) / 우측 인사말 + 8개 경력 chip + CTA 2개
- 사진은 placeholder (실제 김창희 변호사 사진 받으면 교체)

### 8. Pricing (3패키지)
- 기본 199,000 / 안전 390,000(MOST POPULAR, 노란 배경, 위로 살짝 떠 있음 + 회전) / 올인원 790,000
- 각 카드: 영문 태그 + 이름 + 서브 + 큰 가격 + 점선 + 체크리스트 + CTA
- 하단 추가 설명 박스: 소송 시 별도, **결과 안 나오면 50% 환불**, 결제 방식

### 9. Reviews (자동 슬라이드)
- 가로 무한 마퀴 (50s linear) + hover 시 일시정지
- 카드 6개를 2번 반복(`[...reviews, ...reviews]`)
- 카드 색상: yellow / orange(흰 글자) / paper 순환, 홀수 카드 -1deg 짝수 +1deg 회전
- 각 카드: ★별점 + 굵은 따옴표 타이틀 + 본문 + 점선 위 영문 태그(나이·직업)
- mask-image로 좌우 페이드

### 10. Final CTA (검정 풀폭)
- 가운데 wave pose 마스코트 120px
- 큰 카피 "진짜 마지막 출근, / 우리가 같이 함." (yellow 하이라이트)
- 노란 + 흰 버튼 2개
- 배경에 거대한 "GOODBYE" 타이포 (yellow 6% opacity, 데코)

### 11. Footer
4컬럼 그리드 (브랜드 / 서비스 / 법률사무소 청송 / 법적 고지). 하단에 © 2026 + "이 사이트는 변호사법에 따른 광고물입니다" 고지.

### 12. Floating Emergency Button (fixed, 우하단)
- 노란 알약 버튼 + 펄스 도트
- 9초마다 가짜 실시간 알림 토스트 ("서울 김** 26세 IT 사원이 방금 상담 시작했어요")

### 13. Chat Modal (`ChatModal` 컴포넌트)
- 카톡 풍 모달
- 헤더(yellow): "변" 아바타 + "김창희 변호사" + "지금 답변 가능" 그린 도트
- 본문(gray-1): 봇 인사 2턴 + 사용자 quick reply 4개 + 1.1s 후 응답
- 타이핑 인디케이터 3 도트 애니메이션
- 하단: 입력창 + 보내기 버튼
- 4가지 빠른답장에 각각 사전 정의된 응답 매핑

## Interactions & Behavior

- **Scroll reveal**: `.reveal` 클래스 IntersectionObserver(threshold 0.1)로 `in` 추가 → opacity 0→1, translateY 24px→0, 0.7s ease
- **Calculator**: React useState로 Set 관리, 토글 시 합계 즉시 갱신
- **Reviews carousel**: CSS keyframe 50s linear infinite, mouseenter 시 `animation-play-state: paused`
- **Chat modal**: 백드롭 클릭으로 닫기, 본문 영역 stopPropagation
- **Toast**: 9초 인터벌, 도시·이름·나이·직업 랜덤 조합, 4.5s 후 사라짐
- **Open chat from anywhere**: `window.dispatchEvent(new CustomEvent('open-chat'))` (Calculator의 CTA 등에서 사용)

## Reduced motion
`@media (prefers-reduced-motion: reduce)` — 마퀴/리빌 애니메이션 비활성

## Responsive breakpoints
- 1050px: 히어로 단일 컬럼
- 1000px: 프로세스 2컬럼, 네비 링크 숨김
- 900px: Audience 2컬럼, 가격/계산기/변호사 단일 컬럼
- 800px: 푸터 2컬럼
- 700px: Hero 스티커 위치 조정, 섹션 padding 56px
- 600px: 모든 그리드 단일 컬럼
- 500px: 푸터 단일 컬럼

## State Management
- `tweaks` (palette, heroCopy, dark, mascot) — 페이지 옵션, 프로덕션 적용 시 제거하거나 admin 토글로 유지
- `chatOpen` — 모달 열림 여부
- `messages` (모달) — 채팅 히스토리
- `picked` (계산기) — 선택된 항목 Set
- `toast` — 현재 알림

## Files (in `reference/`)
- `index.html` — 마운트 + 글로벌 스타일/CSS 변수 + Pretendard·Space Grotesk 로드 + 컴포넌트 import
- `app.jsx` — 루트 App, Tweaks 패널, 네비, 마퀴, 토스트, 모달 오케스트레이션
- `components/mascot.jsx` — 마스코트 SVG (다양한 포즈 지원)
- `components/hero.jsx` — 히어로 + 폰 채팅 모킹 + 스티커
- `components/audience.jsx` — 6 케이스 그리드
- `components/calculator.jsx` — 인터랙티브 보상 계산기
- `components/process.jsx` — 4단계 프로세스
- `components/lawyer.jsx` — 변호사 소개
- `components/pricing.jsx` — 3패키지
- `components/reviews.jsx` — 자동 슬라이드 후기
- `components/chatmodal.jsx` — 카톡 스타일 상담 모달
- `components/footer.jsx` — 최종 CTA + 푸터
- `tweaks-panel.jsx` — 인페이지 디자인 옵션 토글 (프로덕션에서는 제거 권장)

## Production checklist (Claude Code 작업 시 체크)
- [ ] HTML 프로토타입을 본인 코드베이스 프레임워크로 마이그레이션 (컴포넌트 1:1 매핑)
- [ ] CSS 변수를 디자인 토큰 시스템으로 (Tailwind면 `tailwind.config.ts`, CSS modules면 `tokens.css`)
- [ ] 마스코트 SVG는 그대로 가져다 React 컴포넌트로
- [ ] Pretendard, Space Grotesk 폰트 셀프 호스팅으로 전환 (CDN 의존 줄이기)
- [ ] 카톡 모달은 실제 카카오톡 채널(https://pf.kakao.com/_zkzIX/chat) 연결로 대체 검토
- [ ] 가격 결제는 PG 연동 (토스페이먼츠 / 포트원 등)
- [ ] 1660-4452 전화 링크는 그대로 `tel:`
- [ ] 변호사 사진 placeholder를 실제 사진으로 교체 (`Lawyer` 컴포넌트의 `.portrait-bg`)
- [ ] 후기 데이터를 CMS/DB에서 동적으로
- [ ] SEO: 메타 OG 태그, 구조화 데이터(LegalService schema), sitemap
- [ ] 접근성: 모달 focus trap, escape 키 닫기, 마스코트 aria-hidden 유지, 색대비 검증
- [ ] 변호사법 광고 심의기준 — 푸터의 "변호사법에 따른 광고물입니다" 고지 유지, 후기는 의뢰인 동의 명시
- [ ] 개인정보처리방침 / 이용약관 페이지 실제 작성
- [ ] 가짜 실시간 알림 토스트는 프로덕션에서는 실제 데이터 또는 제거 결정 (소비자 오인 가능성)

## Notes for Claude Code
- 코드베이스에 기존 디자인 시스템이 있다면, 그 시스템에 토큰을 맞추고 컴포넌트를 그 위에 빌드. 새 프로젝트면 위 토큰 그대로 사용 OK.
- "ㄹㅇ", "퇴준생" 같은 카피는 의도된 것 — 다듬지 마세요. 단, 법률 고지/변호사 인사말 부분의 정중한 존댓말은 유지.
- Neo-brutalist 무드(두꺼운 보더 + offset 그림자)가 핵심 시그니처. 그림자에 블러 추가하지 말 것.
