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
