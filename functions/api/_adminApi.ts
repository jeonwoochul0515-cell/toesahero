// 중앙 접수함(lead-inbox)용 헤드리스 어드민 API 공용부 — 서버 간 인증, ref 해석, 민감값 가림, 상태 대응표.
// 계약: ~/.claude/skills/중앙상담함연결작업/SKILL.md §1, ~/.antigravity/lead-inbox/admin-api-v2.md.
// 이 API는 조회와 상태 변경만 한다. 결제 승인·환불 같은 돈이 움직이는 쓰기는 넣지 않는다.

import { fsClient, type FirestoreEnv, type FsClient, type FsRow } from "./_firestore";

export interface AdminApiEnv extends FirestoreEnv {
  TOESA_ADMIN_ID?: string;
  TOESA_ADMIN_KEY?: string;
  // 예전 이름(chat/draft 가 먼저 쓰던 값). 새 이름이 없을 때만 쓴다.
  TOESAHERO_ADMIN_ID?: string;
  TOESAHERO_ADMIN_KEY?: string;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

// 길이와 내용이 새지 않게 해시끼리 끝까지 비교한다.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** 통과하면 null, 막히면 돌려줄 응답. 설정이 없으면 503(열어 두지 않는다). */
export async function checkAdmin(request: Request, env: AdminApiEnv): Promise<Response | null> {
  const id = (env.TOESA_ADMIN_ID || env.TOESAHERO_ADMIN_ID || "").trim();
  const key = (env.TOESA_ADMIN_KEY || env.TOESAHERO_ADMIN_KEY || "").trim();
  if (!id || !key) return json({ ok: false, error: "not_configured" }, 503);
  const gotId = request.headers.get("x-admin-id") ?? "";
  const gotKey = request.headers.get("x-admin-key") ?? "";
  const [a, b] = await Promise.all([safeEqual(gotId, id), safeEqual(gotKey, key)]);
  if (!a || !b) return json({ ok: false, error: "unauthorized" }, 401);
  return null;
}

// ── 시각 ──
// Firestore timestampValue(ISO) → 접수함 규약 UTC "YYYY-MM-DD HH:MM:SS"
export function utc(ts: unknown): string {
  if (typeof ts !== "string") return "";
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return "";
  return new Date(t).toISOString().slice(0, 19).replace("T", " ");
}

// 사람이 읽는 상세 칸에는 한국시간으로 적는다(라벨에 "한국시간"을 붙인다).
export function kst(ts: unknown): string {
  if (typeof ts !== "string") return "";
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return "";
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}

// ── 식별자 ──
export const SID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const DOC_ID_RE = /^[A-Za-z0-9]{8,40}$/;

// ref 는 접수함 ext_key 에서 첫 ':' 뒤. 채팅 접수 = 대화 세션 id, 폼·계산기 접수 = "c:<상담 문서 id>".
export type ParsedRef = { kind: "session"; sid: string } | { kind: "case"; caseId: string };

export function parseRef(ref: unknown): ParsedRef | null {
  if (typeof ref !== "string") return null;
  if (ref.startsWith("c:")) {
    const caseId = ref.slice(2);
    return DOC_ID_RE.test(caseId) ? { kind: "case", caseId } : null;
  }
  return SID_RE.test(ref) ? { kind: "session", sid: ref } : null;
}

export type Resolved = {
  fs: FsClient;
  sid: string | null;
  consultations: FsRow[]; // 최신순
  messages: FsRow[]; // 오래된 순
};

const byCreatedDesc = (a: FsRow, b: FsRow) =>
  String(b.data.createdAt ?? "").localeCompare(String(a.data.createdAt ?? ""));

// 정렬(orderBy)을 붙이면 sessionId+createdAt 복합 색인이 필요한데 이 프로젝트엔 없다(어드민 화면도 같은 이유로 안 붙인다).
// 그래서 넉넉히 받아 여기서 정렬한다. 한 대화의 접수 문서는 몇 건, 메시지는 수십~수백 건 수준이다.
export async function sessionConsultations(fs: FsClient, sid: string): Promise<FsRow[]> {
  const rows = await fs.query("consultations", { eq: ["sessionId", sid], limit: 200 });
  return rows.sort(byCreatedDesc);
}

export async function sessionMessages(fs: FsClient, sid: string): Promise<FsRow[]> {
  const rows = await fs.query("chat_messages", { eq: ["sessionId", sid], limit: 1000 });
  return rows.sort(byCreatedDesc).reverse();
}

/** ref 를 사이트 원본으로 푼다. 아무것도 없으면 null(→ 404). */
export async function resolveRef(env: FirestoreEnv, ref: unknown): Promise<Resolved | null> {
  const p = parseRef(ref);
  if (!p) return null;
  const fs = await fsClient(env);
  if (p.kind === "session") {
    const [consultations, messages] = await Promise.all([
      sessionConsultations(fs, p.sid),
      sessionMessages(fs, p.sid),
    ]);
    if (!consultations.length && !messages.length) return null;
    return { fs, sid: p.sid, consultations, messages };
  }
  const doc = await fs.get(`consultations/${p.caseId}`);
  if (!doc) return null;
  return { fs, sid: null, consultations: [doc], messages: [] };
}

// ── 상태 ── 접수함 상태 → 사이트 칸반 상태
export const STATUS_MAP: Record<string, string> = {
  신규: "new",
  연락완료: "contacted",
  진행중: "consulted",
  수임: "contracted",
  종결: "closed",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "신규",
  contacted: "연락 완료",
  consulted: "상담 완료",
  contracted: "위임 체결",
  closed: "종료",
};

// ── 민감값 가림 ──
// 주민등록번호는 통째로, 12자리 이상 숫자열(계좌·카드)은 끝 4자리만 남긴다. 휴대전화(10~11자리)는 둔다.
export function maskSensitive(text: string): string {
  return text.replace(/\d[\d -]{8,}\d/g, (m) => {
    const digits = m.replace(/\D/g, "");
    if (/^\d{6}[ -]?[1-8]\d{6}$/.test(m.trim())) return "******-*******";
    if (digits.length >= 12) return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
    return m;
  });
}

/** 전체를 가린 뒤에 자른다(먼저 자르면 경계에 걸린 번호가 가림 없이 남는다). */
export function masked(v: unknown, n: number): string {
  return typeof v === "string" ? maskSensitive(v.slice(0, 50000)).slice(0, n) : "";
}

export function maskEmail(v: unknown): string {
  if (typeof v !== "string" || !v.includes("@")) return "";
  const [user, domain] = v.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}

// 생년월일은 연도만, 주소는 앞 두 마디(시·구)만.
export function maskBirth(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return "";
  const m = /(\d{4})/.exec(v) ?? /^(\d{2})/.exec(v.trim());
  return m ? `${m[1]}년생` : "(가림)";
}

export function maskAddress(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return "";
  const parts = v.trim().split(/\s+/);
  return parts.length > 2 ? `${parts.slice(0, 2).join(" ")} ***` : parts.join(" ");
}

export const str = (v: unknown, n = 2000): string =>
  typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : "";

/** 요청 본문 JSON. 깨졌으면 null. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = (await request.json()) as unknown;
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Firestore 오류는 내부 메시지를 내보내지 않는다. */
export function upstreamError(where: string, e: unknown): Response {
  console.error(`[admin-api] ${where}`, e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200));
  return json({ ok: false, error: "upstream" }, 502);
}
