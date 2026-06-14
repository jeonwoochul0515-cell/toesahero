// 서버가 소유하는 패키지 가격표. 결제 금액의 단일 진실 공급원.
// 클라이언트가 보낸 금액은 절대 신뢰하지 않고 이 값으로만 결제·검증한다.

export type PackageId = "basic" | "pro" | "max";

export const PACKAGE_PRICE: Record<PackageId, number> = {
  basic: 199000,
  pro: 390000,
  max: 790000,
};

export const PACKAGE_NAME: Record<PackageId, string> = {
  basic: "기본 절차",
  pro: "표준 절차",
  max: "분쟁 대응",
};

export function isPackageId(v: unknown): v is PackageId {
  return v === "basic" || v === "pro" || v === "max";
}
