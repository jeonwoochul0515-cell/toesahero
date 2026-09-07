// 결제 상태를 Firestore(orders·consultations)에 멱등하게 반영하고 변호사에게 알림톡(실패 시 문자 대체)으로 알리는 공통 함수.
// confirm(결제 승인)과 webhook(토스 콜백)이 같은 결과를 쓰도록 단일 경로로 모은다.

import { patchDoc, nowTimestamp, type FirestoreEnv } from "../_firestore";
import { sendAlimtalk, KAKAO_TPL, type NotifyEnv } from "../_notify";
import { PACKAGE_NAME, type PackageId } from "./_packages";

export interface ReflectEnv extends FirestoreEnv, NotifyEnv {}

type TossPayment = {
  status?: string; // DONE / CANCELED / PARTIAL_CANCELED ...
  approvedAt?: string;
  totalAmount?: number;
};

// 결제 완료(DONE) 반영. orders·consultations 갱신 후 변호사에게 문자.
export async function reflectPaid(
  env: ReflectEnv,
  args: {
    orderId: string;
    caseId: string | null;
    packageId: PackageId;
    amount: number;
    paymentKey: string;
    payment: TossPayment;
  }
): Promise<void> {
  const approvedAt = args.payment.approvedAt
    ? { __timestamp: args.payment.approvedAt }
    : nowTimestamp();

  await patchDoc(env, `orders/${args.orderId}`, {
    status: "paid",
    paymentKey: args.paymentKey,
    approvedAt,
  });

  if (args.caseId) {
    await patchDoc(env, `consultations/${args.caseId}`, {
      packageId: args.packageId,
      paymentAmount: args.amount,
      paymentStatus: "paid",
      paymentKey: args.paymentKey,
      paymentOrderId: args.orderId,
      paymentApprovedAt: approvedAt,
    });
  }

  const won = args.amount.toLocaleString("ko-KR");
  const ref = args.caseId ? `#${args.caseId.slice(0, 8)}` : "(접수번호 없음)";
  await sendAlimtalk(
    env,
    KAKAO_TPL.paid,
    {
      "#{상품}": PACKAGE_NAME[args.packageId],
      "#{금액}": won,
      "#{사건}": ref,
    },
    `[퇴사히어로] 결제 완료\n${PACKAGE_NAME[args.packageId]} ${won}원\n사건 ${ref}\n어드민에서 확인해 주세요.`
  );
}

// 결제 취소/실패 반영.
export async function reflectCanceled(
  env: ReflectEnv,
  args: {
    orderId: string;
    caseId: string | null;
    status: "canceled" | "failed";
  }
): Promise<void> {
  await patchDoc(env, `orders/${args.orderId}`, { status: args.status });
  if (args.caseId) {
    await patchDoc(env, `consultations/${args.caseId}`, {
      paymentStatus: args.status,
    });
  }
  const result = args.status === "canceled" ? "취소" : "실패";
  await sendAlimtalk(
    env,
    KAKAO_TPL.payFailed,
    {
      "#{결과}": result,
      "#{주문}": args.orderId,
    },
    `[퇴사히어로] 결제 ${result}\n주문 ${args.orderId}`
  );
}
