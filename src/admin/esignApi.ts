// 관리자 전자계약 API 호출부 — 로그인한 관리자의 Firebase ID 토큰을 실어 /api/esign/admin 을 부른다.
import { getIdToken } from "../firebase";

export type ESignRow = {
  token: string;
  title: string;
  fee: number;
  successFee: string;
  hash: string;
  clientName: string;
  clientPhone: string;
  status: "sent" | "signed" | "void";
  expired: boolean;
  createdAt: string;
  expiresAt: string;
  signedAt: string | null;
  signedName: string | null;
  voidedAt: string | null;
  smsSentAt: string | null;
  link: string;
};

export type ESignFull = ESignRow & {
  body: string;
  createdBy?: string;
  signedBirth: string | null;
  signedAddr: string | null;
  signedImage: string | null;
  signedIp: string | null;
  signedUa: string | null;
};

export async function esignAdmin<T = Record<string, unknown>>(
  payload: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getIdToken();
  if (!token) return { ok: false, message: "관리자 로그인이 필요합니다. 다시 로그인해 주세요." };
  try {
    const resp = await fetch("/api/esign/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; message?: string } & T;
    if (!resp.ok || !data.ok) return { ok: false, message: data.message ?? `처리하지 못했습니다(${resp.status}).` };
    return { ok: true, data };
  } catch {
    return { ok: false, message: "연결이 끊겼습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export function kstText(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) : "—";
}

export function feeText(fee: number): string {
  return fee > 0 ? `${fee.toLocaleString("ko-KR")}원` : "없음 (0원)";
}
