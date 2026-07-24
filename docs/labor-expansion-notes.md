# 노동 분쟁 확장 — 컨텍스트 노트

## 결정 사항
- **포지셔닝**: 퇴사대행 유지 + 노동분쟁 형제 확장. 전면 리브랜딩·홈 전면개편 안 함.
  이유: 브랜드(브루탈리즘 MZ) 유지 + 진짜 타깃 "갈등회피형" 유지 + 리스크 최소.
- **브랜드 브릿지**: 분쟁 키워드는 얼핏 "싸우는" 키워드라 갈등회피 타깃과 반대로 보이나,
  실제론 같은 감정의 다음 단계 — "내가 직접 안 부딪히고 변호사가 대신 싸운다".
  카피 톤을 "당신 대신 변호사가 다툽니다"로 통일해 브랜드 일관성 유지.
- **인프라 재사용**: SegmentLandingPage.tsx가 config 기반 단일 컴포넌트라 새 랜딩을 config로 추가.
  기존 harassment/small-business와 동일 패턴.

## URL 슬러그(영문·하이픈·permalink — SEO 가이드)
- 부당해고 → /unfair-dismissal
- 임금체불 → /unpaid-wages
- 퇴직금 미지급 → /severance-pay

## SEO 업그레이드 (기존 SegmentLandingPage에 없던 것 추가)
- 기존 세그먼트 랜딩은 JSON-LD가 없었음 → 신규/강화 페이지에 FAQPage + BreadcrumbList 추가.
- AEO/GEO 가이드: 질문형 헤딩 + 40~60단어 두괄식 정답 + FAQPage 스키마가 핵심 레버.
- usePageMeta의 faqJsonLd / breadcrumbJsonLd 헬퍼 활용.

## 아이콘 매핑(Icon.tsx 기존 이름만 사용, de-AI 규칙)
- 부당해고 → gavel, 임금체불 → coins, 퇴직금 → bank, 괴롭힘 → shield(기존)

## 규제 업종 카피 주의
- 변호사법 광고물. 과장·단정·승률 표현 금지. 기존 면책 문구 유지.

## 미결/후속
- 각 키워드 블로그 칼럼(OSMU)은 별도 작업으로. 이번엔 랜딩+진입로+SEO까지.
