# 문자 → 카카오 알림톡 전환 체크리스트 (2026-08-31 완료)

목표: 변호사에게 가는 알림 문자 4종을 알림톡(실패 시 문자 자동 대체)으로 전환.
채널: 기존 「법률사무소 청송Law」(pfId `KA01PF260830171533973ab0zLKJrwex`) — 사용자 확정.
검증 실발송: 사용자 승인됨(수신처 ALERT_TO_PHONE).

## 조사
- [x] 발송 지점 전수 조사 — `notify.ts` 2곳(신규 접수·대화록), `_reflect.ts` 2곳(결제 완료·취소/실패). 전부 변호사 수신, 손님 발송 없음
- [x] 4종 모두 정보성 고지로 알림톡 전환 가능 판정
- [x] Solapi 연동 채널 API로 확인(청송Law 1개)
- [x] 받아드림 `sendAlimtalk` 참조 구현·템플릿 구조 확인

## 템플릿
- [x] 템플릿 4종 설계(신규 접수 / 대화 접수 / 결제 완료 / 결제 미완료)
- [x] `POST /kakao/v2/templates` 등록 → templateId 4개 확보(`_notify.ts` KAKAO_TPL)
- [x] `PUT /kakao/v2/templates/{id}/inspection` 검수 신청 → 상태 INSPECTING 확인

## 코드
- [x] `_notify.ts`에 `sendAlimtalk` 추가 (type ATA + kakaoOptions + disableSms:false + text 대체)
- [x] ★ 추가 발견: 미승인 템플릿은 Solapi가 400으로 거절하고 자동 대체도 안 함 → ATA 거절 시 코드가 LMS 직접 재발송하도록 보강
- [x] `notify.ts` 2곳 교체 (기존 전문 문구는 fallback text로 유지)
- [x] `_reflect.ts` 2곳 교체
- [x] 실패가 흐름을 막지 않는지 확인(예외 삼킴 + {ok, reason} 계약 유지)

## 검증·배포
- [x] 기존 테스트(vitest 14/14) 통과 + 빌드 성공
- [x] production_branch(main) 확인 후 wrangler 배포, environment=production 확인
- [x] 실발송 1건 → ATA 1042 거절 → LMS 대체 statusCode 4000(전송 성공) 확인, 01026085099 수신
- [x] 검증 데이터 정리 — 연락처 없이 보내 접수함·Firestore 오염 없음, 지울 것 없음

## 기록
- [x] context-notes.md에 결정·함정 기록(2026-08-31 절)
- [x] 메모리 저장(toesahero-alimtalk-conversion)

## 후속(미완 — 별도 작업)
- [ ] 템플릿 승인/반려 확인(1~3영업일 뒤 `GET /kakao/v2/templates`). 반려 시 사유 읽고 수정 → 재검수
- [ ] ⚠ 받아드림(badadrim): 코드 레벨 문자 대체가 없어 템플릿 승인 전까지 계약서 링크 발송 실패 — 같은 패턴 적용 필요
