// 결제 승인 검증 로직(validateConfirm) 단위 테스트.
import { describe, it, expect } from "vitest";
import { validateConfirm } from "./_validate";
import { PACKAGE_PRICE, isPackageId } from "./_packages";

const baseOrder = {
  orderId: "basic_abc_1_xy",
  packageId: "basic",
  amount: 199000,
  caseId: "case1234",
  status: "ready",
};

describe("validateConfirm", () => {
  it("주문이 없으면 404 order_not_found", () => {
    const r = validateConfirm(null, 199000);
    expect(r).toEqual({ kind: "error", status: 404, error: "order_not_found" });
  });

  it("이미 paid 면 멱등 처리", () => {
    const r = validateConfirm({ ...baseOrder, status: "paid" }, 199000);
    expect(r.kind).toBe("idempotent");
  });

  it("금액이 일치하면 proceed", () => {
    const r = validateConfirm(baseOrder, 199000);
    expect(r).toEqual({
      kind: "proceed",
      storedAmount: 199000,
      packageId: "basic",
      caseId: "case1234",
    });
  });

  it("클라 금액이 저장 금액과 다르면 amount_mismatch (변조 차단)", () => {
    const r = validateConfirm(baseOrder, 1000);
    expect(r).toMatchObject({
      kind: "error",
      status: 400,
      error: "amount_mismatch",
      extra: { expected: 199000, got: 1000 },
    });
  });

  it("패키지 ID가 손상되면 order_corrupt", () => {
    const r = validateConfirm({ ...baseOrder, packageId: "vip" }, 199000);
    expect(r).toMatchObject({ kind: "error", status: 500, error: "order_corrupt" });
  });

  it("저장 금액이 0/음수/NaN 이면 order_corrupt", () => {
    expect(validateConfirm({ ...baseOrder, amount: 0 }, 0)).toMatchObject({
      error: "order_corrupt",
    });
    expect(validateConfirm({ ...baseOrder, amount: -1 }, -1)).toMatchObject({
      error: "order_corrupt",
    });
    expect(
      validateConfirm({ ...baseOrder, amount: "x" as unknown as number }, 1)
    ).toMatchObject({ error: "order_corrupt" });
  });

  it("caseId 가 없으면 proceed.caseId 는 null", () => {
    const { caseId, ...noCaseRaw } = baseOrder;
    void caseId;
    const r = validateConfirm(noCaseRaw, 199000);
    expect(r).toMatchObject({ kind: "proceed", caseId: null });
  });
});

describe("패키지 가격표", () => {
  it("세 패키지 가격이 고정값", () => {
    expect(PACKAGE_PRICE).toEqual({ basic: 199000, pro: 390000, max: 790000 });
  });

  it("isPackageId 가 유효 값만 통과", () => {
    expect(isPackageId("basic")).toBe(true);
    expect(isPackageId("pro")).toBe(true);
    expect(isPackageId("max")).toBe(true);
    expect(isPackageId("vip")).toBe(false);
    expect(isPackageId(null)).toBe(false);
    expect(isPackageId(undefined)).toBe(false);
  });
});
