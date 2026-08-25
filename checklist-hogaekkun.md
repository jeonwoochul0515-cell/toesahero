# 호객꾼 "히로" 설치 체크리스트 (2026-08-22)

원칙: `~/.claude/skills/hogaekkun/SKILL.md` (2026-08-22 개정 — 능동성 최우선, "나중에요" 버튼 폐지, 억제는 같은 화면 2분 쿨다운 하나만)

## 확정된 결정 (사용자)
- [x] 손님 페르소나 — 회사와의 갈등으로 지치고 위축된 근로자
- [x] 캐릭터 — 기존 브루탈리즘 SVG 마스코트 승격, 이름 "히로"
- [x] 전환 목표 — 신뢰를 쌓아 퇴사 업무·괴롭힘 신고를 맡기고 싶게 만드는 것 (연락처는 필수 단계)
- [x] 톤 변경 — 캐릭터 전면, 김창희 변호사는 "최종 검토·직접 상담" 포지션
- [x] 규제 — 변호사법(승소·무료·전문·1위 금지), AI 자칭 금지
- [x] 연락처 게이트(익명 채팅 차단)는 그대로 유지
- [x] 신규 원칙(2026-08-22) — 별도 전달 동의가 있는 경우에만 접수 후 대화 전문을 중앙 접수함에 보관하고 문자로 접수 사실 알림

## 구현
- [x] scripts/prerender-posts.mjs — functions용 블로그 지식 모듈(`functions/api/_blog-knowledge.ts`) 추가 생성
- [x] src/lib/entry.ts — 유입 경로 판별 (ibyeol119 이식, 키 `hiro:entry`)
- [x] src/lib/hiroSpeech.ts — pageIntro 맵(11개 화면) + greetingFor(화면 안내 > 재방문 > 유입 경로 > 시간대)
- [x] src/components/Mascot.tsx — `empathy` 포즈 추가 + 눈 깜빡임용 그룹 클래스
- [x] src/components/HiroChat.tsx — 도크(아바타+말풍선), 등장 3.5s, 타이핑, bubbleKey, 2분 쿨다운, 도달 경로 3개, 나중에요 버튼 없음
- [x] src/components/ChatModal.tsx — 히로 전면(헤더·첫인사), 표정 연동, 화면 안내 주입 수신, sessionStorage 이력, 긴급 카드
- [x] src/components/FloatingButton.tsx 삭제 — 전화 pill은 도크로 이동
- [x] src/Home.tsx — ChatModal/FloatingButton 마운트 제거, openChat은 전역 이벤트로
- [x] src/App.tsx — RootLayout에 HiroChat 전역 마운트 (admin/delegation 제외)
- [x] src/styles.css — hiro 도크 스타일(브루탈리즘), 등장 오버슈트·부유·깜빡임, reduced-motion
- [x] functions/api/chat.ts — 히로 SYSTEM(캐릭터+기존 변협 컴플라이언스), 표정 태그, 가드(반복·퇴행·sanitize·긴급 정규식·레이트리밋·referer), 서비스 지식+블로그 지식 주입, 프롬프트 캐시
- [x] functions/api/notify.ts — `chatlog` 타입 추가: 대화 전문은 중앙 접수함에 보관하고 LMS는 접수 사실만 한 통 발송
- [x] ChatModal — 접수 후 대화 전문 보고 트리거 3개(창 닫힘·pagehide sendBeacon·초안 접수) + 세션별 중복 방지

## 접수 누락 방지 A·B (2026-08-22 사용자 승인)
- [x] A. 접수 이중화 — saveConsultationDetailed: DB 저장·문자 알림 독립 실행, 둘 다 실패 시 거짓 성공 제거(재시도·전화 안내, 게이트 유지), DB 실패 시 문자에 "[주의] DB 저장 실패" 표기, notify 1회 재시도
- [x] B. 연락처 있는 알림 레이트리밋 면제 — 전용 버킷(20회/10분)으로 분리, 일반 한도(5회/10분)와 무경합
- [x] 검증 — 로컬: 일반 알림 6회째 429·연락처 알림 8연발 전부 200 / 브라우저: DB 성공+문자 실패 조합에서 접수 성립

## 접수 누락 방지 C·D + 실시간 채팅 유실방지 (2026-08-22 사용자 지시)
- [x] C. 솔라피 감시 초소 — lead-inbox Worker 크론(매일 09:00 KST): 잔액·인증 점검, 문제 시 문자+접수함 이중 경보 (실측: 잔액 31,815원 정상 조회)
- [x] ~~D. 미응대 재알림~~ — 같은 날 폐지(사용자: "귀찮고 헷깔려"). 크론·코드 제거 완료
- [x] 수동 실행 엔드포인트 POST /api/cron-run {job:'watch'} (관리자 토큰)
- [x] 실시간 채팅 유실방지 ① functions/api/chat-log.ts — 클라이언트 Firestore 막힘 시 서버(서비스계정 REST) 기록 폴백 (프로덕션 실기록 확인)
- [x] 실시간 채팅 유실방지 ② 대화 소강 3분 시 대화록 보고 + visibilitychange(hidden) 트리거 추가
- [x] lead-inbox 배포 + 시크릿 4종(SOLAPI_API_KEY/SECRET/SENDER, ALERT_TO_PHONE) 설정 (값은 저장소에 기록하지 않음)

## 동행 패널 전환 (2026-08-22 사용자 피드백)
- [x] 가운데 모달 → 우하단 고정 패널(백드롭 없음, 열린 채 탐색 가능)
- [x] 열림 상태 보존 — 링크 이동(전체 로드) 후 패널 유지 + 새 화면 안내 대화에 이어붙임
- [x] 서비스 소개·비용 퀵칩 추가
- [x] E2E 7건 + 실도메인 패널 확인 + 배포

## 연락처 전화번호 통일 (2026-08-22 사용자 확정)
- [x] 게이트 성함+전화번호 2칸, 형식 검증·하이픈 정규화, 카톡 ID 거절(프롬프트 포함)
- [x] 성함이 접수·문자·접수함·대화록·초안·엔진 호칭까지 전파
- [x] 브라우저 4분기 검증 + 프로덕션 실호출 + 배포

## 검증
- [x] `npm run build` (tsc + typecheck:functions + vite-react-ssg) 통과
- [x] `npm test` (vitest) 통과 — 결제 검증 9건 + Origin·동의 경계 5건
- [x] dist HTML에 히로 위젯 흔적 0 (프리렌더 게이트)
- [x] 로컬 실호출 시나리오 12종 (Python UTF-8 — CP949 함정 회피) 전부 통과
- [x] 배포 (wrangler pages deploy, project toesahero)
- [x] 프로덕션 스모크 (/api/chat 응답 + 표정 태그 + 사이트 로드)

## 개인정보·보안 보강 (2026-08-25)
- [x] 선택 동의가 없으면 대화를 Firestore·문자·중앙 접수함에 저장·전달하지 않음
- [x] 개별 메시지와 대화 전문 API가 `consent: true`를 서버에서도 검증
- [x] Firestore `chat_messages` 생성 규칙에 명시적 동의 필드 강제
- [x] 챗봇 API Origin 검사를 호스트 경계 정규식으로 강화하고 64KB 요청 상한 추가
- [x] 대화 전문은 서버 성공 확인 후에만 보고 완료로 기록하여 실패 시 재시도 가능
