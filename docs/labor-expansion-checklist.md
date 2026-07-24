# 노동 분쟁 확장 체크리스트

퇴사히어로를 "퇴사대행"에서 "퇴사대행 + 노동 분쟁 대응"으로 확장.
포지셔닝: 퇴사대행을 플래그십으로 유지, 노동분쟁을 형제 카테고리로 신설(전면 리브랜딩 아님).

## 대상 키워드 (image copy 15.png 분석 기반)
- [ ] 부당해고 `/unfair-dismissal` — 단가 15,790원, 핵심 거래성
- [ ] 임금체불 `/unpaid-wages` — 단가 6,280원, 명확한 분쟁
- [ ] 퇴직금 미지급 `/severance-pay` — 검색량 23,090, 저단가 상단 퍼널
- [ ] 직장내괴롭힘 `/harassment` — 기존 페이지 분쟁 대응 톤으로 강화

## 작업
- [ ] SegmentLandingPage.tsx: Seg 타입 확장 + 신규 config 3개 + FAQ/JSON-LD 필드 추가 → verify: 타입 통과
- [ ] harassment config 톤 강화("대신 싸웁니다" 갈등회피 브릿지) → verify: 기존 문구 유지+보강
- [ ] App.tsx: 신규 라우트 3개 추가 → verify: /unfair-dismissal 등 렌더
- [ ] LaborDisputes 홈 허브 섹션 신설 → verify: 홈에 4개 카드 노출
- [ ] Footer 서비스 목록에 3개 링크 추가 → verify: 링크 동작
- [ ] functions/sitemap.xml.ts STATIC_PAGES에 3개 경로 추가 → verify: sitemap 포함
- [ ] Home SEO 키워드 점검(대부분 이미 있음)
- [ ] npm test + build → verify: 통과

## 성공 기준
- 4개 노동분쟁 랜딩이 각각 고유 title/desc/canonical/FAQ 스키마를 갖고 프리렌더됨
- 홈에서 노동분쟁 카테고리로 진입 가능
- 브랜드(브루탈리즘 MZ·갈등회피 톤) 유지, 전면 리디자인 없음
