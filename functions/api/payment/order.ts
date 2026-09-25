// Cloudflare Pages Function: POST /api/payment/order
// 결제 주문 생성 — 서버가 패키지 가격을 결정하고 orders/{orderId} 에 저장한 뒤 orderId·amount 를 반환.
// 이후 클라이언트는 이 orderId·amount 로만 토스 결제창을 호출하고, /confirm 에서 저장 금액과 대조한다.
// 목적: 클라이언트 금액 위변조 차단 + 주문 영속화(멱등성·추적).

import { createDoc, getDoc, nowTimestamp, type FirestoreEnv } from "../_firestore";
import { PACKAGE_PRICE, isPackageId } from "./_packages";
import { checkCasePackage } from "./_validate";

interface Env extends FirestoreEnv {}

type RequestBody = {
  packageId: string;
  caseId?: string | null;
  uid?: string | null;
  userName?: string | null; // 결제자 이름 — 어드민 결제자 표시용 (직접 입력 or 로그인 이름)
  userEmail?: string | null;
  contact?: string | null; // 결제자 연락처 — 변호사 회신용
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

  // 사무실이 상담 건에 패키지를 정해 두었으면 그 패키지로만 결제된다(B안, 2026-09-25).
  if (typeof body.caseId === "string" && body.caseId) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(body.caseId)) {
      return json({ error: "invalid_case" }, 400);
    }
    let caseDoc: Record<string, unknown> | null;
    try {
      caseDoc = await getDoc(env, `consultations/${body.caseId}`);
    } catch (e) {
      return json({ error: "case_lookup_failed", detail: String(e) }, 500);
    }
    const check = checkCasePackage(caseDoc, body.packageId);
    if (!check.ok) {
      return json({ error: check.error, packageId: check.packageId ?? null }, check.status);
    }
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
      userName: typeof body.userName === "string" ? body.userName.slice(0, 100) : null,
      userEmail: typeof body.userEmail === "string" ? body.userEmail.slice(0, 200) : null,
      contact: typeof body.contact === "string" ? body.contact.slice(0, 40) : null,
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
