// Cloudflare Pages Function: POST /api/payment/order
// 결제 주문 생성 — 서버가 패키지 가격을 결정하고 orders/{orderId} 에 저장한 뒤 orderId·amount 를 반환.
// 이후 클라이언트는 이 orderId·amount 로만 토스 결제창을 호출하고, /confirm 에서 저장 금액과 대조한다.
// 목적: 클라이언트 금액 위변조 차단 + 주문 영속화(멱등성·추적).

import { createDoc, nowTimestamp, type FirestoreEnv } from "../_firestore";
import { PACKAGE_PRICE, isPackageId } from "./_packages";

interface Env extends FirestoreEnv {}

type RequestBody = {
  packageId: string;
  caseId?: string | null;
  uid?: string | null;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
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

  if (!isPackageId(body.packageId)) {
    return json({ error: "invalid_package" }, 400);
  }

  const amount = PACKAGE_PRICE[body.packageId];
  const caseId = body.caseId || "noref";
  const rand = crypto.randomUUID().slice(0, 8);
  const orderId = `${body.packageId}_${caseId}_${Date.now()}_${rand}`;

  try {
    await createDoc(env, "orders", orderId, {
      orderId,
      packageId: body.packageId,
      amount,
      caseId: body.caseId ?? null,
      uid: body.uid ?? null,
      status: "ready",
      createdAt: nowTimestamp(),
    });
  } catch (e) {
    return json({ error: "order_create_failed", detail: String(e) }, 500);
  }

  return json({ ok: true, orderId, amount });
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
