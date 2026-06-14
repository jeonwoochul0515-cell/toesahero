// Cloudflare Pages Function: POST /api/payment/confirm
// 토스페이먼츠 결제 승인 — 결제창이 paymentKey/orderId/amount 를 반환하면 서버에서 최종 승인 호출.
//
// 흐름:
//   /api/payment/order (주문 생성·금액 저장) → 토스 결제창 → 카드 인증 →
//   /api/payment/confirm → 저장 주문 조회·금액 대조 → 토스 승인 → Firestore 반영 + 문자 알림
//
// 보안:
//   - TOSS_SECRET_KEY 는 서버 env 에만. 클라이언트는 TOSS_CLIENT_KEY 만 사용.
//   - 금액은 클라이언트가 보낸 값이 아니라 orders/{orderId} 에 저장된 값을 신뢰한다.
//   - 이미 paid 인 주문은 멱등 처리(중복 승인 차단).

import { getDoc, type FirestoreEnv } from "../_firestore";
import { reflectPaid, type ReflectEnv } from "./_reflect";
import { validateConfirm } from "./_validate";

interface Env extends FirestoreEnv, ReflectEnv {
  TOSS_SECRET_KEY?: string;
}

type RequestBody = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TOSS_SECRET_KEY || !env.FIREBASE_SERVICE_ACCOUNT) {
    return json(
      {
        error: "payment_not_configured",
        message: "결제 인프라가 아직 설정되지 않았습니다.",
      },
      503
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.paymentKey || !body.orderId || typeof body.amount !== "number") {
    return json({ error: "missing_required_fields" }, 400);
  }

  // 1) 저장된 주문 조회 — 금액의 단일 진실 공급원
  let order: Record<string, unknown> | null;
  try {
    order = await getDoc(env, `orders/${body.orderId}`);
  } catch (e) {
    return json({ error: "order_lookup_failed", detail: String(e) }, 500);
  }

  // 2~3) 주문 존재·멱등·패키지·금액 검증 (순수 로직, _validate)
  const decision = validateConfirm(order, body.amount);
  if (decision.kind === "idempotent") {
    return json({ ok: true, idempotent: true });
  }
  if (decision.kind === "error") {
    return json({ error: decision.error, ...decision.extra }, decision.status);
  }
  const { storedAmount, packageId, caseId } = decision;

  // 4) 토스 승인 — 저장된 금액으로 호출
  const auth = btoa(`${env.TOSS_SECRET_KEY}:`);
  let upstream: Response;
  try {
    upstream = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: storedAmount,
      }),
    });
  } catch (e) {
    return json({ error: "upstream_fetch_failed", detail: String(e) }, 502);
  }

  const data = (await upstream.json().catch(() => null)) as
    | { status?: string; approvedAt?: string; totalAmount?: number }
    | null;

  if (!upstream.ok || !data) {
    return json({ error: "toss_error", status: upstream.status, body: data }, 502);
  }

  // 5) Firestore 반영 + 문자 알림 (멱등 공통 경로)
  try {
    await reflectPaid(env, {
      orderId: body.orderId,
      caseId,
      packageId,
      amount: storedAmount,
      paymentKey: body.paymentKey,
      payment: data,
    });
  } catch (e) {
    // 토스 승인은 성공했으나 DB 반영 실패 — webhook 이 보정한다. 클라엔 성공 안내.
    return json({
      ok: true,
      payment: data,
      warn: "reflect_failed",
      detail: String(e),
    });
  }

  return json({ ok: true, payment: data });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
