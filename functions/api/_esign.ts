// 위임계약서 전자서명 핵심 규칙 — 계약서 만들기·서명 검사·개인정보 가림을 한곳에 모은다(받아드림 worker/contracts.ts 원칙 이식).
//
// 왜 본문과 해시를 얼려 두는가.
//   전자서명이 효력을 가지려면 "서명한 그 문서가 그대로다"를 증명할 수 있어야 한다.
//   보낼 때의 제목·본문·착수금·성공보수를 한 글(contractText)로 묶어 저장하고 그 SHA-256 을 함께 남긴다.
//   서명할 때 서버가 다시 해싱해 대조하고, 손님 화면이 본 해시와도 대조한다.
//   그래서 보낸 계약서는 고치는 API 가 없다 — 조건이 바뀌면 무효로 돌리고 새로 만든다.
//
// 저장 위치: Firestore `esign_contracts/{token}` — 서버(서비스계정)만 읽고 쓴다.
//   firestore.rules 의 마지막 catch-all(read, write: false)이 브라우저 직접 접근을 막는다.
//
// 개인정보: 서명 뒤 SIGNED_DETAIL_DAYS 가 지나면 손님용 링크에서 주소·생년월일·서명 그림만 가린다.
//   계약 내용은 계속 보여 준다(손님이 무엇에 서명했는지 확인할 길은 남긴다). 관리자 화면은 그대로 본다.

export const COLLECTION = "esign_contracts";

/** 서명 링크 유효기간 — 무기한 서명 링크는 두지 않는다 */
export const SIGN_VALID_DAYS = 14;
/** 서명 뒤 손님 링크에서 주소·생년월일·서명 그림을 보여 주는 기간 */
export const SIGNED_DETAIL_DAYS = 90;

export const LIMITS = {
  title: 100,
  body: 30000,
  bodyMin: 50,
  successFee: 500,
  name: 40,
  addr: 200,
  feeMax: 100_000_000,
  /** 서명 그림 data URL 최대 길이(base64) — 600×220 손글씨는 보통 10~40KB */
  imageChars: 280_000,
  imageMaxSide: 2000,
} as const;

export type ContractStatus = "sent" | "signed" | "void";

export interface ContractDoc {
  token: string;
  title: string;
  body: string;
  fee: number;
  successFee: string;
  hash: string;
  clientName: string;
  clientPhone: string;
  status: ContractStatus;
  createdAt: string;
  expiresAt: string;
  createdBy?: string;
  signedAt?: string | null;
  signedName?: string | null;
  signedBirth?: string | null;
  signedAddr?: string | null;
  signedImage?: string | null;
  signedIp?: string | null;
  signedUa?: string | null;
  voidedAt?: string | null;
  smsSentAt?: string | null;
}

/** 해시 대상 글 — 손님 화면에 보이는 계약 내용 전부를 정해진 순서로 묶는다 */
export function contractText(c: Pick<ContractDoc, "title" | "body" | "fee" | "successFee">): string {
  const fee = c.fee > 0 ? `${c.fee.toLocaleString("ko-KR")}원` : "0원(없음)";
  return [c.title, "", c.body, "", `착수금: ${fee}`, `성공보수: ${c.successFee || "없음"}`].join("\n");
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 추측할 수 없는 링크 토큰 — 32바이트(256비트) 난수, URL 안전 base64 43자 */
export function newToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isTokenShape(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max + 1) : "";

export type NewContractInput = {
  title: string;
  body: string;
  fee: number;
  successFee: string;
  clientName: string;
  clientPhone: string;
};

/** 관리자가 보낸 값을 검사한다. 잘린 글을 몰래 저장하지 않도록 길이 초과는 거절한다. */
export function validateNew(raw: Record<string, unknown>): { ok: true; value: NewContractInput } | { ok: false; message: string } {
  const title = clean(raw.title, LIMITS.title) || "위임계약서";
  const body = clean(raw.body, LIMITS.body);
  const successFee = clean(raw.successFee, LIMITS.successFee);
  const clientName = clean(raw.clientName, LIMITS.name).replace(/\s+/g, " ");
  const clientPhone = String(raw.clientPhone ?? "").replace(/[^0-9]/g, "");
  const fee = Number(raw.fee);

  if (title.length > LIMITS.title) return { ok: false, message: `제목은 ${LIMITS.title}자 이내로 적어 주세요.` };
  if (body.length < LIMITS.bodyMin) return { ok: false, message: "계약서 본문을 붙여 넣어 주세요." };
  if (body.length > LIMITS.body) return { ok: false, message: `본문이 ${LIMITS.body.toLocaleString()}자를 넘습니다.` };
  if (successFee.length > LIMITS.successFee) return { ok: false, message: `성공보수 문구는 ${LIMITS.successFee}자 이내로 적어 주세요.` };
  if (clientName.length < 2 || clientName.length > LIMITS.name) return { ok: false, message: "의뢰인 성함을 확인해 주세요." };
  if (!/^01[016789][0-9]{7,8}$/.test(clientPhone)) return { ok: false, message: "의뢰인 휴대폰 번호를 확인해 주세요." };
  if (!Number.isInteger(fee) || fee < 0 || fee > LIMITS.feeMax) return { ok: false, message: "착수금을 확인해 주세요(0원 가능)." };
  return { ok: true, value: { title, body, fee, successFee, clientName, clientPhone } };
}

/** 저장할 새 계약서 문서를 만든다(저장은 호출부가 한다) */
export async function buildContract(input: NewContractInput, createdBy: string, now = Date.now()): Promise<ContractDoc> {
  return {
    ...input,
    token: newToken(),
    hash: await sha256Hex(contractText(input)),
    status: "sent",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SIGN_VALID_DAYS * 86400_000).toISOString(),
    createdBy,
  };
}

export function isExpired(c: Pick<ContractDoc, "expiresAt">, now = Date.now()): boolean {
  const t = Date.parse(c.expiresAt);
  // 만료 시각을 못 읽으면 열어 두지 않는다
  return !Number.isFinite(t) || now > t;
}

export function signedDetailExpired(c: Pick<ContractDoc, "signedAt">, now = Date.now()): boolean {
  if (!c.signedAt) return false;
  const t = Date.parse(c.signedAt);
  return Number.isFinite(t) && now - t > SIGNED_DETAIL_DAYS * 86400_000;
}

/** 생년월일 — YYYY-MM-DD, 실제 있는 날짜, 1900년 이후~오늘 */
export function validBirth(v: string, now = Date.now()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return false;
  return +m[1] >= 1900 && d.getTime() <= now;
}

/** 서명 그림 검사 — data URL 머리, base64 글자, PNG 머리글(8바이트)·IHDR 크기 */
export function checkSignatureImage(dataUrl: unknown): { ok: true } | { ok: false; message: string } {
  const prefix = "data:image/png;base64,";
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(prefix)) return { ok: false, message: "서명을 그려 주세요." };
  if (dataUrl.length > LIMITS.imageChars) return { ok: false, message: "서명 그림이 너무 큽니다. 지우고 다시 그려 주세요." };
  const b64 = dataUrl.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0) return { ok: false, message: "서명 그림을 읽을 수 없습니다. 다시 그려 주세요." };
  let head: Uint8Array;
  try {
    const bin = atob(b64.slice(0, 44)); // 앞 33바이트 — 시그니처 8 + IHDR 길이·이름 8 + 가로·세로 8
    head = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  } catch {
    return { ok: false, message: "서명 그림을 읽을 수 없습니다. 다시 그려 주세요." };
  }
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (head.length < 24 || sig.some((b, i) => head[i] !== b)) return { ok: false, message: "서명 그림 형식이 맞지 않습니다." };
  if (String.fromCharCode(head[12], head[13], head[14], head[15]) !== "IHDR") return { ok: false, message: "서명 그림 형식이 맞지 않습니다." };
  const dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const w = dv.getUint32(16);
  const h = dv.getUint32(20);
  if (w < 50 || h < 30 || w > LIMITS.imageMaxSide || h > LIMITS.imageMaxSide) return { ok: false, message: "서명 그림 크기가 맞지 않습니다." };
  return { ok: true };
}

export type SignInput = {
  name: unknown;
  birth: unknown;
  addr: unknown;
  image: unknown;
  agree: unknown;
  hash: unknown;
};

export type SignFields = {
  signedName: string;
  signedBirth: string;
  signedAddr: string;
  signedImage: string;
};

/**
 * 서명 제출을 검사한다. 통과하면 저장할 값을 돌려준다.
 * 순서: 무효 → 이미 서명 → 만료 → 해시(저장본 재계산·손님 화면 값) → 입력값.
 */
export async function checkSign(
  c: ContractDoc,
  input: SignInput,
  now = Date.now()
): Promise<{ ok: true; fields: SignFields } | { ok: false; status: number; code: string; message: string }> {
  if (c.status === "void") return { ok: false, status: 410, code: "void", message: "취소된 계약서입니다. 사무실로 연락해 주세요." };
  if (c.signedAt || c.status === "signed") return { ok: false, status: 409, code: "already_signed", message: "이미 서명이 끝난 계약서입니다." };
  if (isExpired(c, now)) {
    return { ok: false, status: 410, code: "expired", message: `서명 기한(${SIGN_VALID_DAYS}일)이 지났습니다. 사무실로 연락하시면 다시 보내 드립니다.` };
  }
  const recomputed = await sha256Hex(contractText(c));
  if (recomputed !== c.hash) {
    // 저장본이 보낸 뒤에 바뀌었다는 뜻 — 서명을 받지 않는다
    return { ok: false, status: 409, code: "hash_mismatch", message: "계약서 내용을 확인할 수 없습니다. 사무실로 연락해 주세요." };
  }
  if (input.hash !== c.hash) {
    return { ok: false, status: 409, code: "stale_view", message: "계약서 화면이 최신이 아닙니다. 새로고침한 뒤 다시 서명해 주세요." };
  }
  if (input.agree !== true) return { ok: false, status: 400, code: "no_agree", message: "계약 내용에 동의하셔야 서명할 수 있습니다." };

  const name = clean(input.name, LIMITS.name);
  if (name.length < 2 || name.length > LIMITS.name) return { ok: false, status: 400, code: "name", message: "성함을 정확히 입력해 주세요." };
  if (name.replace(/\s/g, "") !== c.clientName.replace(/\s/g, "")) {
    return { ok: false, status: 400, code: "name_mismatch", message: `계약서에 적힌 성함(${c.clientName})과 다릅니다. 다르다면 사무실로 연락해 주세요.` };
  }
  const birth = clean(input.birth, 10);
  if (!validBirth(birth, now)) return { ok: false, status: 400, code: "birth", message: "생년월일을 예) 1990-01-31 처럼 적어 주세요." };
  const addr = clean(input.addr, LIMITS.addr).replace(/\s+/g, " ");
  if (addr.length < 5 || addr.length > LIMITS.addr) return { ok: false, status: 400, code: "addr", message: "주소를 적어 주세요." };
  const img = checkSignatureImage(input.image);
  if (!img.ok) return { ok: false, status: 400, code: "image", message: img.message };

  return { ok: true, fields: { signedName: name, signedBirth: birth, signedAddr: addr, signedImage: input.image as string } };
}

/** 손님 링크로 보여 줄 값 — 연락처·IP·기기는 내보내지 않고, 90일 지나면 개인정보를 가린다 */
export function publicView(c: ContractDoc, now = Date.now()) {
  const hide = signedDetailExpired(c, now);
  return {
    title: c.title,
    body: c.body,
    fee: c.fee,
    successFee: c.successFee,
    hash: c.hash,
    clientName: c.clientName,
    status: c.status,
    expired: c.status === "sent" && isExpired(c, now),
    expiresAt: c.expiresAt,
    signedAt: c.signedAt ?? null,
    signedName: c.signedName ?? null,
    signedBirth: hide ? null : c.signedBirth ?? null,
    signedAddr: hide ? null : c.signedAddr ?? null,
    signedImage: hide ? null : c.signedImage ?? null,
    detailHidden: hide,
  };
}

/** Firestore 에서 읽은 값을 ContractDoc 으로 맞춘다(타입이 어긋난 칸은 빈 값) */
export function toContract(d: Record<string, unknown>): ContractDoc {
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const n = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : null);
  const st = s("status");
  return {
    token: s("token"),
    title: s("title"),
    body: s("body"),
    fee: typeof d.fee === "number" ? d.fee : 0,
    successFee: s("successFee"),
    hash: s("hash"),
    clientName: s("clientName"),
    clientPhone: s("clientPhone"),
    status: st === "signed" || st === "void" ? st : "sent",
    createdAt: s("createdAt"),
    expiresAt: s("expiresAt"),
    createdBy: s("createdBy"),
    signedAt: n("signedAt"),
    signedName: n("signedName"),
    signedBirth: n("signedBirth"),
    signedAddr: n("signedAddr"),
    signedImage: n("signedImage"),
    signedIp: n("signedIp"),
    signedUa: n("signedUa"),
    voidedAt: n("voidedAt"),
    smsSentAt: n("smsSentAt"),
  };
}

/** 한국시간 밤 9시~아침 8시에는 손님에게 문자를 보내지 않는다 */
export function isQuietHourKst(now = Date.now()): boolean {
  const h = new Date(now + 9 * 3600_000).getUTCHours();
  return h >= 21 || h < 8;
}

export function signLink(token: string): string {
  return `https://toesahero.com/sign/${token}`;
}

export function clientSmsText(c: Pick<ContractDoc, "clientName" | "token">): string {
  return [
    "[법률사무소 청송law]",
    `${c.clientName.replace(/[\r\n]/g, " ")}님, 위임계약서를 보내드립니다.`,
    "내용을 확인하시고 서명해 주세요.",
    signLink(c.token),
    `(${SIGN_VALID_DAYS}일간 유효 · 문의 1660-4452)`,
  ].join("\n");
}

// ── 요청 횟수 제한(베스트에포트) — 워커가 살아 있는 동안만 센다. notify.ts 와 같은 방식 ──
const buckets = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs = 10 * 60_000, now = Date.now()): boolean {
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return true;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return false;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
