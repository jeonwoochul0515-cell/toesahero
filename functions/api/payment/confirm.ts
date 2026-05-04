// Cloudflare Pages Function: POST /api/payment/confirm
// 토스페이먼츠 결제 승인 — 결제 위젯 SDK가 paymentKey/orderId/amount를 반환하면 서버에서 최종 승인 호출
//
// 흐름:
//   클라이언트 (CheckoutPage) → 토스 결제 위젯 → 카드 인증 →
//   /api/payment/confirm 으로 paymentKey 전송 → Toss API 호출 → 승인 결과
//
// 보안: TOSS_SECRET_KEY 는 서버 사이드 (Pages Function env) 에만 두고 클라이언트에 노출 X.
// 클라이언트는 TOSS_CLIENT_KEY 만 사용 (test_ck_... 형식, 노출 안전).
//
// Firestore 업데이트는 추가 인증 필요해서 어드민 측에서 webhook 으로 처리하거나
// 의뢰인이 카카오 로그인된 상태일 때 Firebase SDK로 자체 update.
// 본 endpoint 는 Toss 승인만 처리하고, 클라이언트가 결과 받아 Firestore에 반영.

interface Env {
  TOSS_SECRET_KEY?: string;
}

type RequestBody = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TOSS_SECRET_KEY) {
    return jsonResponse(
      {
        error: "payment_not_configured",
        message:
          "결제 인프라가 아직 설정되지 않았습니다. 토스페이먼츠 가맹 등록 후 활성화 예정입니다.",
      },
      503
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  if (!body.paymentKey || !body.orderId || typeof body.amount !== "number") {
    return jsonResponse({ error: "missing_required_fields" }, 400);
  }

  // Toss API 인증: Basic + base64(secret_key:)
  const secretWithColon = `${env.TOSS_SECRET_KEY}:`;
  const auth = btoa(secretWithColon);

  let upstream: Response;
  try {
    upstream = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: body.paymentKey,
          orderId: body.orderId,
          amount: body.amount,
        }),
      }
    );
  } catch (e) {
    return jsonResponse(
      { error: "upstream_fetch_failed", detail: String(e) },
      502
    );
  }

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return jsonResponse(
      {
        error: "toss_error",
        status: upstream.status,
        body: data,
      },
      502
    );
  }

  return jsonResponse({ ok: true, payment: data });
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
