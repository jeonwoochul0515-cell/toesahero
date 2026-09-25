// 결제 승인(confirm)의 순수 판단 로직. 외부 I/O 없이 테스트 가능하도록 분리.
// 규칙: 주문 존재 → 멱등(이미 paid) → 패키지 유효성 → 금액 대조.

import { isPackageId, type PackageId } from "./_packages";

export type ConfirmDecision =
  | { kind: "error"; status: number; error: string; extra?: Record<string, unknown> }
  | { kind: "idempotent" }
  | { kind: "proceed"; storedAmount: number; packageId: PackageId; caseId: string | null };

// order: Firestore orders/{orderId} 디코딩 결과(없으면 null). clientAmount: 클라가 보낸 금액.
export function validateConfirm(
  order: Record<string, unknown> | null,
  clientAmount: number
): ConfirmDecision {
  if (!order) {
    return { kind: "error", status: 404, error: "order_not_found" };
  }

  // 이미 승인된 주문이면 토스 재호출 없이 멱등 성공
  if (order.status === "paid") {
    return { kind: "idempotent" };
  }

  if (!isPackageId(order.packageId)) {
    return { kind: "error", status: 500, error: "order_corrupt" };
  }

  const storedAmount = Number(order.amount);
  if (!Number.isFinite(storedAmount) || storedAmount <= 0) {
    return { kind: "error", status: 500, error: "order_corrupt" };
  }

  // 클라가 보낸 금액과 저장 금액이 일치해야 한다
  if (storedAmount !== clientAmount) {
    return {
      kind: "error",
      status: 400,
      error: "amount_mismatch",
      extra: { expected: storedAmount, got: clientAmount },
    };
  }

  return {
    kind: "proceed",
    storedAmount,
    packageId: order.packageId,
    caseId: (order.caseId as string | null) ?? null,
  };
}

// 주문 생성 전 사건-패키지 대조. 사무실이 상담 건에 패키지를 정해 결제 링크를 보냈는데(B안, 2026-09-25)
// 손님이 주소의 pkg를 바꿔 더 싼 패키지로 결제하는 것을 막는다.
// caseDoc: consultations/{caseId} 디코딩 결과(없으면 null). 정해진 패키지가 없으면 요청대로 진행한다.
// 없는 접수번호는 거절한다 — 그대로 두면 결제 반영 때 그 경로에 사건 문서가 새로 생긴다.
export function checkCasePackage(
  caseDoc: Record<string, unknown> | null,
  requested: PackageId
): { ok: true } | { ok: false; status: number; error: string; packageId?: PackageId } {
  if (!caseDoc) return { ok: false, status: 404, error: "case_not_found" };
  if (caseDoc.paymentStatus === "paid") {
    return { ok: false, status: 409, error: "already_paid" };
  }
  const fixed = caseDoc.packageId;
  if (isPackageId(fixed) && fixed !== requested) {
    return { ok: false, status: 409, error: "package_mismatch", packageId: fixed };
  }
  return { ok: true };
}
