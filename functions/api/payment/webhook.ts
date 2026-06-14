// Cloudflare Pages Function: POST /api/payment/webhook
// 토스페이먼츠 webhook 수신 — 결제 상태 변경 콜백.
// 토스 대시보드에 https://toesahero.com/api/payment/webhook 로 등록한다.
//
// 보안: webhook 페이로드를 단독 신뢰하지 않고, 토스 API로 결제를 재조회하여 상태를 확정한다.
//       confirm 과 동일한 반영 경로(_reflect)를 멱등하게 호출한다.

import { getDoc, type FirestoreEnv } from "../_firestore";
import {
  reflectPaid,
  reflectCanceled,
  type ReflectEnv,
} from "./_reflect";
import { isPackageId, type PackageId } from "./_packages";

interface Env extends FirestoreEnv, ReflectEnv {
  TOSS_SECRET_KEY?: string;
}

type WebhookBody = {
  eventType?: string;
  data?: { orderId?: string; paymentKey?: string; status?: string };
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 토스에는 항상 200을 빠르게 돌려준다(재전송 폭주 방지). 처리 결과는 본문에 표기.
  if (!env.TOSS_SECRET_KEY || !env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ ok: false, reason: "not_configured" }, 200);
  }

  let body: WebhookBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 200);
  }

  const orderId = body.data?.orderId;
  if (!orderId) {
    return json({ ok: false, reason: "no_order_id" }, 200);
  }

  // 토스 재조회로 상태 확정 (orderId 기준)
  const auth = btoa(`${env.TOSS_SECRET_KEY}:`);
  let payment: {
    status?: string;
    paymentKey?: string;
    approvedAt?: string;
    totalAmount?: number;
  } | null;
  try {
    const resp = await fetch(
      `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    payment = resp.ok ? await resp.json() : null;
  } catch {
    payment = null;
  }
  if (!payment || !payment.status) {
    return json({ ok: false, reason: "toss_lookup_failed" }, 200);
  }

  // 주문 조회
  let order: Record<string, unknown> | null;
  try {
    order = await getDoc(env, `orders/${orderId}`);
  } catch {
    order = null;
  }
  if (!order) {
    return json({ ok: false, reason: "order_not_found" }, 200);
  }

  const caseId = (order.caseId as string | null) ?? null;
  const packageId = order.packageId;
  const amount = Number(order.amount);

  try {
    if (payment.status === "DONE") {
      if (order.status === "paid") {
        return json({ ok: true, idempotent: true }, 200);
      }
      if (!isPackageId(packageId)) {
        return json({ ok: false, reason: "order_corrupt" }, 200);
      }
      await reflectPaid(env, {
        orderId,
        caseId,
        packageId: packageId as PackageId,
        amount,
        paymentKey: payment.paymentKey ?? "",
        payment,
      });
    } else if (
      payment.status === "CANCELED" ||
      payment.status === "PARTIAL_CANCELED"
    ) {
      await reflectCanceled(env, { orderId, caseId, status: "canceled" });
    } else if (
      payment.status === "ABORTED" ||
      payment.status === "EXPIRED"
    ) {
      await reflectCanceled(env, { orderId, caseId, status: "failed" });
    }
  } catch (e) {
    return json({ ok: false, reason: "reflect_failed", detail: String(e) }, 200);
  }

  return json({ ok: true, status: payment.status }, 200);
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
