# 퇴사히어로 사용성 점검 — 결제·주문

점검자 시점. 퇴사를 고민하는 40대 직장인. 개발을 모르고, 휴대폰으로 본다. 불안한 상태라 화면에 뜬 글자를 그대로 믿고 그대로 따라 한다.

## 읽은 파일

- `src/pages/CheckoutPage.tsx`
- `src/pages/DiagnosePage.tsx`(결제 링크 생성부), `src/pages/MyPage.tsx`, `src/pages/DelegationSignPage.tsx`
- `src/components/Pricing.tsx`
- `src/admin/OrdersAdmin.tsx`
- `functions/api/payment/order.ts` · `confirm.ts` · `webhook.ts` · `_reflect.ts` · `_packages.ts` · `_validate.ts`
- `functions/api/_firestore.ts` · `functions/api/_notify.ts` · `functions/_middleware.ts`
- `firestore.rules`

---

## 발견

### 1. 토스와 통신이 잠깐 끊기면 "직접 입금하세요"라고 안내한다 · 심각도 막힘

**어디서** 결제창에서 카드 인증을 마치고 화면으로 돌아온 직후.

**무슨 일이** 서버가 토스 승인 서버에 연결하지 못하면 `503`을 돌려준다(`functions/api/payment/confirm.ts:112-115`, 주석에 "Cloudflare 엣지가 502를 가로채므로 503을 쓴다"고 적혀 있다). 그런데 화면은 `503`이면 무조건 "❌ 결제 인프라 미설정. 변호사 사무소에 직접 입금 안내드립니다."를 띄운다(`src/pages/CheckoutPage.tsx:149-154`). 즉 **일시적인 통신 장애인데 손님은 "결제 시스템이 아예 없으니 계좌로 직접 보내라"는 말로 읽는다.** 불안한 사람은 그 말대로 사무소에 전화해 계좌이체를 하려 하고, 그 사이 토스 쪽에서 승인이 정상 처리됐다면 이중 지불이 된다. 서버가 같은 `503`을 쓰는 자리가 두 곳(미설정 `confirm.ts:43-51`, 통신 실패 `confirm.ts:112-115`)인데 화면은 둘을 구분하지 않는다.

**근거** `functions/api/payment/confirm.ts:43-51`, `functions/api/payment/confirm.ts:112-115`, `src/pages/CheckoutPage.tsx:149-154`

**고칠 방향** 화면이 상태코드가 아니라 `error` 값(`payment_not_configured` / `upstream_fetch_failed`)으로 갈라 말하게 한다. 통신 실패는 "결제가 처리 중일 수 있습니다. 카드사 문자를 확인하시고, 5분 뒤에도 안내가 없으면 1660-4452로 연락 주세요. 새로 결제하지 마세요."로. 직접 입금 안내는 정말 미설정일 때만.

---

### 2. 같은 사건을 두 번 결제해도 아무도 막지 않는다 · 심각도 위험

**어디서** 이미 결제한 사람이 카톡에 남은 결제 링크를 다시 누르거나, 결과 화면에서 뒤로 간 뒤 버튼을 다시 누를 때.

**무슨 일이** 주문은 누를 때마다 새로 만들어진다. 주문번호에 시각과 난수가 섞여 있어 매번 다른 번호가 된다(`functions/api/payment/order.ts:44-45`). 중복 방지 장치는 "같은 주문번호를 두 번 승인하지 않는다"뿐이고(`functions/api/payment/_validate.ts:20-23`), **같은 사건·같은 사람이 이미 결제했는지는 어디서도 보지 않는다.** 화면도 마찬가지다. 결제 화면은 사건 문서를 읽어 오지만(`src/pages/CheckoutPage.tsx:96-101`) 쓰는 곳은 접수번호와 이름 표시뿐이고(`:288-293`), 이미 `paymentStatus === "paid"`인 사건이어도 결제 버튼이 그대로 눌린다. 39만원을 두 번 내는 일이 실제로 가능하다.

**근거** `functions/api/payment/order.ts:44-45`, `functions/api/payment/_validate.ts:20-23`, `src/pages/CheckoutPage.tsx:96-101`·`:288-293`·`:355-368`

**고칠 방향** ① 화면 — 불러온 사건이 이미 결제 완료면 결제 버튼 대신 "이미 결제가 완료된 사건입니다(결제일 ○○)"와 사무소 연락처를 보여준다. ② 서버 — `order.ts`에서 같은 `caseId`에 `status: "paid"`인 주문이 있으면 새 주문을 만들지 말고 그 사실을 돌려준다.

---

### 3. 서버 반영이 실패해도 손님에겐 "정상 처리"라고 뜨고, 사무실은 전혀 모른다 · 심각도 위험

**어디서** 결제 승인 직후, 눈에 보이지 않는 곳에서.

**무슨 일이** 토스 승인은 성공했는데 Firestore 기록이 실패하면 서버는 `ok: true`에 `warn: "reflect_failed"`를 붙여 성공으로 답한다(`functions/api/payment/confirm.ts:136-144`). 화면은 `warn`을 보지 않으므로(`src/pages/CheckoutPage.tsx:155-170`) 손님에게는 "✓ 결제가 정상 처리되었습니다"만 뜬다. 문제는 **변호사에게 가는 알림톡이 그 실패한 반영 함수 안에, 그것도 기록을 다 쓴 다음에 있다**는 점이다(`functions/api/payment/_reflect.ts:32-60`). 기록이 실패하면 알림도 안 나간다. 결과적으로 돈은 빠졌는데 주문은 "대기", 사건에는 결제 표시 없음, 사무실 알림 없음, 손님만 결제됐다고 믿는 상태가 된다. 코드 주석은 "webhook이 보정한다"고 적었지만(`confirm.ts:137`) 웹훅은 토스 대시보드에 주소를 등록해야만 오는 외부 설정이고(`functions/api/payment/webhook.ts:3`), 등록 여부를 코드에서 확인할 방법은 없다.

**근거** `functions/api/payment/confirm.ts:136-144`, `src/pages/CheckoutPage.tsx:155-170`, `functions/api/payment/_reflect.ts:32-60`, `functions/api/payment/webhook.ts:1-5`

**고칠 방향** 반영이 실패하면 최소한 알림은 따로 보낸다. 알림 발송을 기록 성공 여부와 분리하고, "결제는 승인됐으나 기록 실패 — 주문번호 ○○, 즉시 확인 필요" 문구로 변호사에게 보낸다. 손님 화면에도 "결제는 완료됐습니다. 접수 처리에 시간이 걸리고 있어 사무소가 곧 연락드립니다"처럼 사실대로 쓴다.

---

### 4. 알림톡·문자가 안 나가도 아무 데도 안 남는다 · 심각도 위험

**어디서** 결제 완료 뒤 사무실 쪽.

**무슨 일이** 결제 알림은 카카오 알림톡으로 보내고 실패하면 문자로 대체한다(`functions/api/_notify.ts:88-131`). 그런데 **둘 다 실패해도 예외를 던지지 않고 `{ok:false}`만 돌려주며, 호출부는 그 값을 받지도 않는다**(`functions/api/payment/_reflect.ts:51-60` — `await sendAlimtalk(...)` 결과를 버린다). 솔라피 키가 빠져 있으면 아예 조용히 건너뛴다(`functions/api/_notify.ts:100-102`). 즉 알림이 한 달째 죽어 있어도 사무실은 모른다. 결제한 손님은 "영업일 기준 회신드립니다"라는 안내(`src/pages/CheckoutPage.tsx:166-170`)를 믿고 기다린다. 어드민 결제 주문 화면을 사람이 직접 열어봐야만 발견된다(`src/admin/OrdersAdmin.tsx:36`).

**근거** `functions/api/payment/_reflect.ts:51-60`, `functions/api/_notify.ts:88-131`(특히 `:100-102`, `:127-130`), `src/pages/CheckoutPage.tsx:166-170`

**고칠 방향** 발송 실패를 주문 문서에 `notifyError` 같은 필드로 남기고, 어드민 주문 목록에서 "알림 실패" 배지로 보이게 한다. 사람이 눈으로 볼 수 있는 자리에 흔적을 남기는 것이 핵심이다.

---

### 5. 환불·취소를 요청할 창구가 화면에도 서버에도 없다 · 심각도 막힘

**어디서** 결제한 다음 날, 마음이 바뀌었거나 변호사가 "이 사안은 어렵다"고 했을 때.

**무슨 일이** 약관에는 "결제 완료 후 변호사 검토를 거쳐 사실관계 확인이 어려운 경우, 결제 취소 후 환불 절차가 진행될 수 있습니다"라고 적혀 있다(`src/pages/CheckoutPage.tsx:340-343`). 그런데 **환불을 요청하는 버튼도, 취소 API도 없다.** 결제 관련 서버 파일은 주문 생성·승인·웹훅 셋뿐이고, 취소 반영 함수(`functions/api/payment/_reflect.ts:64-88`)는 웹훅이 토스에서 "취소됨"을 통보받았을 때만 불린다(`functions/api/payment/webhook.ts:95-105`). 즉 **취소는 사무소가 토스 대시보드에서 손으로 해야만 시작되고, 손님이 그 절차를 여는 방법은 화면 어디에도 안내되지 않는다.** 게다가 비로그인으로 결제하면 주문 조회 권한이 없다 — 주문 읽기는 로그인 사용자의 `uid`가 일치할 때만 허용되는데(`firestore.rules:52-55`), 비로그인 결제는 `uid`가 비어 저장된다(`functions/api/payment/order.ts:52`). 손님은 자기 주문번호조차 다시 확인할 수 없다.

**근거** `src/pages/CheckoutPage.tsx:340-343`, `functions/api/payment/_reflect.ts:64-88`, `functions/api/payment/webhook.ts:95-105`, `firestore.rules:52-55`, `functions/api/payment/order.ts:52`

**고칠 방향** 최소한 결제 완료 화면과 결제 안내 문구에 "결제 취소·환불 문의 1660-4452 / 카카오톡 채널"을 버튼으로 놓고, 주문번호를 화면에 크게 보여준다(지금은 주문번호가 손님 화면에 아예 안 나온다). 그다음 단계로 어드민에서 부분·전액 취소를 누를 수 있는 화면을 만든다.

---

### 6. "결제 대기" 주문이 영원히 쌓인다 · 심각도 답답

**어디서** 사무실의 결제 주문 화면.

**무슨 일이** 결제 버튼을 누르는 순간 주문이 `status: "ready"`로 저장된다(`functions/api/payment/order.ts:48-59`). 손님이 결제창에서 마음을 바꿔 창을 닫으면 그 주문을 바꾸는 코드가 아무 데도 없다 — 주문을 수정하는 곳은 승인 반영과 취소 반영 둘뿐이고(`functions/api/payment/_reflect.ts:32-36`·`:72`), 둘 다 실제 결제 사건이 있어야 돈다. 게다가 결제 버튼에는 중복 클릭을 막는 처리가 없어(`src/pages/CheckoutPage.tsx:179-240`, `confirming`은 승인 단계에만 걸린다) 휴대폰에서 두 번 눌리면 대기 주문이 두 개 생긴다. 어드민 목록에는 "대기"로 계속 남아(`src/admin/OrdersAdmin.tsx:6-11`·`:87`) 진짜 확인해야 할 건과 구경만 하고 간 건이 섞인다.

**근거** `functions/api/payment/order.ts:48-59`, `functions/api/payment/_reflect.ts:32-36`·`:72`, `src/pages/CheckoutPage.tsx:179-240`, `src/admin/OrdersAdmin.tsx:6-11`

**고칠 방향** 주문에 생성 시각이 이미 있으니(`order.ts:58`), 어드민 목록에서 24시간 넘은 `ready`는 "미완료(이탈)"로 흐리게 표시한다. 결제 버튼에도 진행 중 잠금을 건다.

---

### 7. 결제에 실패해 돌아오면 화면의 패키지가 제일 싼 것으로 바뀐다 · 심각도 위험

**어디서** 카드 한도초과·거절로 결제가 실패해 화면으로 되돌아왔을 때.

**무슨 일이** 실패 시 돌아오는 주소가 `현재경로 + "?fail=1"`이다(`src/pages/CheckoutPage.tsx:251`). 원래 있던 `?pkg=max`가 사라진다. 그런데 화면은 `pkg`가 없으면 말없이 "기본 절차"로 되돌린다(`src/pages/CheckoutPage.tsx:64-65`). **79만원 분쟁 대응을 결제하려다 실패한 사람이 돌아오면 화면엔 "기본 절차 199,000원 결제" 버튼이 서 있다.** 실패 안내조차 없는 상태라 손님은 그냥 다시 눌러 엉뚱한 패키지를 산다. 접수번호 없이 `/checkout?pkg=...`로 들어오는 경로가 가격표에 실제로 있으므로(`src/components/Pricing.tsx:222`) 드문 상황이 아니다.

**근거** `src/pages/CheckoutPage.tsx:251`, `src/pages/CheckoutPage.tsx:64-65`, `src/components/Pricing.tsx:222`

**고칠 방향** 실패 주소에 `pkg`(와 있으면 사건 id)를 그대로 실어 보낸다. 그리고 `pkg` 값이 알 수 없는 값이면 조용히 기본으로 바꾸지 말고 "어떤 패키지인지 확인되지 않았습니다. 아래에서 골라 주세요"로 멈춘다.

---

### 8. 승인에 실패하면 영어 코드가 뜨고, 다시 시도할 방법이 사라진다 · 심각도 답답

**어디서** 결제 승인 단계에서 문제가 생겼을 때.

**무슨 일이** 화면은 서버가 준 코드를 그대로 붙여 보여준다 — "❌ 결제 승인 실패: toss_error", "order_not_found", "amount_mismatch", "unhandled"(`src/pages/CheckoutPage.tsx:155-161`, 코드 값은 `functions/api/payment/confirm.ts:60-61`·`:121-124`·`:30-36`, `functions/api/payment/_validate.ts:16-42`). 손님은 이 글자를 읽고 무엇을 해야 하는지 알 수 없다. 더 나쁜 것은 **결과가 뜨는 순간 결제 화면 전체가 사라진다**는 점이다. 결과가 있으면 패키지·동의·결제 버튼을 통째로 숨기고(`src/pages/CheckoutPage.tsx:280`) 남는 것은 "내 사건 보기"와 "홈" 링크뿐이다(`:270-277`). 실패했는데 다시 시도하는 버튼도, 전화번호도 없다. "내 사건 보기"는 비로그인이면 로그인 화면으로 간다.

**근거** `src/pages/CheckoutPage.tsx:155-161`·`:270-277`·`:280`, `functions/api/payment/confirm.ts:30-36`·`:60-61`·`:121-124`, `functions/api/payment/_validate.ts:16-42`

**고칠 방향** 코드마다 손님 말로 바꾼 문장을 붙인다(예: `amount_mismatch` → "결제 금액이 맞지 않아 승인을 멈췄습니다. 돈은 빠져나가지 않습니다"). 실패 화면에는 항상 "다시 결제하기" 버튼과 1660-4452, 카카오톡 채널 링크를 같이 둔다.

---

### 9. 결제창이 열리지 않거나 손님이 닫아도 화면엔 아무 일도 안 일어난다 · 심각도 답답

**어디서** 결제 버튼을 눌렀는데 창이 안 뜨거나, 뜬 창을 닫았을 때.

**무슨 일이** 토스 결제창 호출이 실패하거나 사용자가 닫으면 예외가 나는데, 코드는 콘솔에만 적고 끝낸다(`src/pages/CheckoutPage.tsx:253-255` — `console.warn` 한 줄). 화면은 결제 버튼이 그대로 있는 처음 상태다. 휴대폰에서 팝업 차단이나 앱 전환 실패로 창이 안 뜨면, 손님은 버튼이 고장 난 줄 알고 몇 번 더 누른다(그때마다 대기 주문이 쌓인다 — 발견 6번).

**근거** `src/pages/CheckoutPage.tsx:242-255`

**고칠 방향** 예외를 잡아 화면에 문구를 띄운다. "결제창을 열지 못했습니다. 팝업 차단을 해제하시거나 1660-4452로 연락 주세요."

---

### 10. 영수증·현금영수증·세금계산서를 받을 길이 없다 · 심각도 답답

**어디서** 결제한 다음. 연말정산이나 회사 정산에 쓰려고 할 때.

**무슨 일이** 결제 승인 응답에서 쓰는 값은 상태·승인시각·총액 세 개뿐이고(`functions/api/payment/confirm.ts:117-119`), 토스가 주는 영수증 주소는 읽지도 저장하지도 않는다. 결제창을 부를 때도 현금영수증 관련 설정을 넘기지 않는다(`src/pages/CheckoutPage.tsx:244-252`). 저장되는 주문 항목에도 영수증 자리가 없고(`functions/api/payment/order.ts:48-59`, `functions/api/payment/_reflect.ts:32-36`), 어드민 주문 화면에도 없다(`src/admin/OrdersAdmin.tsx:97-108`). 결제 완료 화면에는 승인 시각 한 줄만 뜬다(`src/pages/CheckoutPage.tsx:166-170`). 손님은 전화로 요청하는 수밖에 없는데 그 안내도 없다.

**근거** `functions/api/payment/confirm.ts:117-119`, `src/pages/CheckoutPage.tsx:244-252`·`:166-170`, `functions/api/payment/_reflect.ts:32-36`, `src/admin/OrdersAdmin.tsx:97-108`

**고칠 방향** 승인 응답의 영수증 주소를 주문에 저장하고, 결제 완료 화면과 어드민 양쪽에 "영수증 보기" 링크를 건다. 현금영수증이 필요한 손님을 위해 결제 전에 선택 칸을 두거나, 적어도 "현금영수증·세금계산서는 1660-4452로 요청해 주세요"라고 적는다.

---

### 11. 결제 수단이 카드 하나뿐이다 · 심각도 답답

**어디서** 결제 버튼을 누른 순간.

**무슨 일이** 결제창을 부를 때 수단이 `"카드"`로 고정되어 있다(`src/pages/CheckoutPage.tsx:244`). 타입 선언에는 계좌이체·가상계좌가 들어 있으나(`:45`) 고르는 자리가 화면에 없다. 퇴사를 앞두고 카드 한도가 빠듯하거나 카드가 없는 사람은 79만원을 낼 방법이 없고, 대신 무엇을 하면 되는지도 안 적혀 있다. 가격표의 "결제 방식 — 위임계약 시 안내"(`src/components/Pricing.tsx:262-265`)가 유일한 설명인데 아무것도 알려 주지 않는다.

**근거** `src/pages/CheckoutPage.tsx:41-56`·`:244`, `src/components/Pricing.tsx:262-265`

**고칠 방향** 계좌이체·가상계좌를 함께 노출하거나, 최소한 결제 화면에 "카드 결제가 어려우시면 1660-4452로 연락 주세요. 계좌이체로 안내드립니다."를 눌리는 연락처와 함께 둔다.

---

### 12. "부가세 별도"라고 해 놓고 결제 금액엔 부가세가 없다 · 심각도 말

**어디서** 가격표에서 결제 화면으로 넘어올 때.

**무슨 일이** 가격표에는 "※ 위 보수에는 부가세가 별도로 부과될 수 있습니다"가 붙어 있다(`src/components/Pricing.tsx:157`). 그런데 결제 화면은 199,000원을 그대로 보여주고(`src/pages/CheckoutPage.tsx:286`·`:365`) 서버도 같은 금액으로 승인한다(`functions/api/payment/_packages.ts:6-10`). **손님은 "그럼 나중에 19,900원이 더 청구되나?"를 알 수 없다.** 위임 동의문에도 "사안의 난이도에 따라 추가 협의될 수 있습니다"(`src/pages/CheckoutPage.tsx:332-335`)가 있어 불안이 겹친다. 돈에 예민한 상태에서 가장 먼저 걸리는 문장이다.

**근거** `src/components/Pricing.tsx:157`, `src/pages/CheckoutPage.tsx:286`·`:332-335`·`:365`, `functions/api/payment/_packages.ts:6-10`

**고칠 방향** 결제 화면 금액 옆에 "부가세 포함 금액입니다" 또는 "부가세 별도 — 결제 금액은 199,000원이며 부가세는 청구되지 않습니다"처럼 한쪽으로 확정해 적는다. 가격표 문구도 같은 말로 맞춘다.

---

### 13. 결제하면 위임장까지 끝난 줄 안다 · 심각도 말

**어디서** 결제 화면의 동의 문구와 결제 완료 화면.

**무슨 일이** 동의 문구가 "본인은 법률사무소 청송law(대표 변호사 김창희)에 본 사안의 처리를 위임함을 확인합니다"이고 체크하면 결제로 넘어간다(`src/pages/CheckoutPage.tsx:324-352`). 손님은 이걸 위임장에 서명한 것으로 읽는다. 그런데 **실제 위임장 전자서명은 별개 화면이고**(`src/pages/DelegationSignPage.tsx:83-116` — 성명·생년월일·주소·손서명을 따로 받는다), 결제 완료 화면은 그쪽으로 가는 링크를 주지 않는다. 완료 화면에 있는 것은 "내 사건 보기"와 "홈"뿐이다(`src/pages/CheckoutPage.tsx:270-277`). 결제한 사람이 다음에 무엇을 해야 하는지 화면에서 이어지지 않는다.

**근거** `src/pages/CheckoutPage.tsx:324-352`·`:270-277`, `src/pages/DelegationSignPage.tsx:83-116`

**고칠 방향** 결제 완료 화면에 "다음 단계 — 위임장 전자서명" 버튼을 `/delegation`으로 걸고, 한 줄 설명("변호사가 회사에 위임 사실을 알리려면 서명이 필요합니다")을 붙인다. 결제 화면의 동의 문구에도 "정식 위임장은 결제 후 별도로 서명하십니다"를 적는다.

---

### 14. 상담 없이 바로 결제하면 사무실은 무슨 일인지 모른 채 돈만 받는다 · 심각도 위험

**어디서** 가격표에서 "위임 진행 / 결제 안내 →"를 눌러 바로 결제한 경우.

**무슨 일이** 이 링크에는 사건 번호가 없다(`src/components/Pricing.tsx:222` — `/checkout?pkg=...`). 사건 없이 결제하면 서버는 사건 문서를 만들지도 갱신하지도 않는다(`functions/api/payment/_reflect.ts:38-47` — `caseId`가 있을 때만 처리). 변호사에게 가는 알림에는 "사건 (접수번호 없음)"만 찍힌다(`functions/api/payment/_reflect.ts:50`). 어드민 주문 목록에도 "상담 미연결"로 표시된다(`src/admin/OrdersAdmin.tsx:141-147`). 남는 정보는 이름·전화번호뿐이다(`functions/api/payment/order.ts:54-56`). **79만원을 받았는데 어떤 회사에서 무슨 일을 당했는지 한 줄도 없다.** 손님은 "영업일 기준 회신드립니다"를 믿고 기다리고, 사무실은 전화를 걸어 처음부터 다시 물어야 한다.

**근거** `src/components/Pricing.tsx:222`, `functions/api/payment/_reflect.ts:38-50`, `functions/api/payment/order.ts:54-56`, `src/admin/OrdersAdmin.tsx:141-147`, `src/pages/CheckoutPage.tsx:166-170`

**고칠 방향** 사건 없이 들어온 결제는 결제 직전에 "어떤 일로 오셨는지 한 줄만 적어 주세요" 칸을 필수로 받아 상담 기록을 함께 만든다(진단 화면은 이미 사건을 만들고 넘긴다 — `src/pages/DiagnosePage.tsx:174-175`). 가격표 링크도 진단이나 상담을 한 번 거치게 돌리는 편이 낫다.

---

### 15. 결제 결과를 다시 볼 수 있는 곳이 없다 · 심각도 답답

**어디서** 결제 완료 화면을 닫은 뒤, 또는 휴대폰이 꺼졌다가 다시 켠 뒤.

**무슨 일이** 결제 결과는 화면 안 임시 상태로만 존재한다. 승인 처리는 주소에 `paymentKey`·`orderId`·`amount`가 붙어 있을 때만 돌고(`src/pages/CheckoutPage.tsx:129-133`), 그 주소를 잃으면 결과를 다시 부를 방법이 없다. 주문번호는 손님 화면에 아예 표시되지 않는다(`:270-277`). 로그인한 사람이 「내 사건」에서 볼 수 있는 것은 사건에 결제 표시가 반영된 경우의 "결제완료" 배지 한 개뿐이고(`src/pages/MyPage.tsx:193-197`) 금액·결제일·주문번호는 나오지 않는다. 사건 없이 결제했다면 그 배지조차 없다. 새로고침해서 다시 승인 요청이 가면 이미 처리된 주문이라 승인 시각 없이 성공만 돌아오고(`functions/api/payment/_validate.ts:20-23` → `functions/api/payment/confirm.ts:74-76`), 화면에는 "결제 승인 시각: —"이 뜬다(`src/pages/CheckoutPage.tsx:166-170`). 불안한 사람에게는 결제가 된 건지 아닌지 확인할 근거가 없는 상태다.

**근거** `src/pages/CheckoutPage.tsx:129-133`·`:166-170`·`:270-277`, `functions/api/payment/_validate.ts:20-23`, `functions/api/payment/confirm.ts:74-76`, `src/pages/MyPage.tsx:193-197`

**고칠 방향** 결제 완료 화면에 주문번호·패키지·금액·승인시각을 함께 찍고, 같은 내용을 결제자 본인 휴대폰으로 문자 한 통 보낸다(알림 도구는 이미 있다 — `functions/api/_notify.ts`, 지금은 변호사에게만 간다). 「내 사건」에도 금액과 주문번호를 표시한다.

---

## 확신이 낮은 항목

- **결제 도중 창을 닫으면 돈이 빠지는가.** 코드 흐름상으로는 승인 호출이 `/api/payment/confirm`에서만 일어나므로(`functions/api/payment/confirm.ts:100-111`) 화면으로 돌아오기 전에 창을 닫으면 승인이 안 되고 돈도 빠지지 않을 것으로 본다. 다만 이는 토스 v1의 "승인 전에는 청구되지 않는다"는 규약에 기댄 추정이며, 코드만으로는 확인할 수 없다. 카드 인증 직후 통신이 끊겨 승인 요청이 서버에 도달했는데 응답을 못 받은 경우는 실제로 돈이 빠질 수 있고, 이때 화면엔 발견 1번의 잘못된 안내가 뜬다.
- **웹훅이 실제로 동작하는지.** 발견 3번의 보정 장치는 토스 대시보드에 주소를 등록했을 때만 작동한다(`functions/api/payment/webhook.ts:1-6`). 등록 여부는 코드 밖의 설정이라 이 점검에서 확인하지 못했다. 등록돼 있지 않다면 발견 3번의 심각도는 더 올라간다.
- **휴대폰에서 결제창이 새 탭·앱으로 갔다가 돌아오는 주소.** 돌아오는 주소를 `현재 도메인 + 현재 경로`로 만들고(`src/pages/CheckoutPage.tsx:250-251`), `/checkout`은 서버가 앱 화면으로 되돌려 주도록 처리되어 있어(`functions/_middleware.ts:8-19`·`:38-48`) 경로 자체는 맞게 돌아올 것으로 보인다. `www` 주소로 들어온 경우 돌아올 때 한 번 이동이 끼지만(`functions/_middleware.ts:22-28`) 주소의 물음표 뒤 값은 유지된다. 다만 카드사 앱을 거치는 실제 복귀 동작은 코드만으로 검증할 수 없다.
- **어드민 패키지 이름 표기 차이.** 어드민 주문 목록은 `pro`를 "표준"으로 적고(`src/admin/OrdersAdmin.tsx:13-17`) 손님 화면·알림톡은 "표준 절차"로 적는다(`src/pages/CheckoutPage.tsx:27`, `functions/api/payment/_packages.ts:12-16`). 내부 화면이라 손님에게는 보이지 않지만, 전화로 확인할 때 말이 어긋날 수 있다.
