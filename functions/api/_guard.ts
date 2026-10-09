// 서버 공용 검문 — 자기 도메인 출처 확인, 손님 IP, 저장소(Firestore) 기반 횟수 제한, 관리자 접속기록.
// 서버 메모리 횟수 제한은 서버가 여러 대라 우회가 쉬워(2026-10-09 보안점검 4번) Firestore 에 센다.

import { createDoc, getDoc, incrementCounter, nowTimestamp, patchDoc, type FirestoreEnv } from "./_firestore";

// 출처는 정확히 일치해야 한다. www 는 미들웨어가 apex 로 넘기므로 화면은 늘 apex 에서 뜬다.
const SITE_ORIGINS = new Set(["https://toesahero.com"]);

export function sameSiteOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return SITE_ORIGINS.has(origin);
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return SITE_ORIGINS.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

// 첫 IP 는 Cloudflare 가 붙이는 값만 믿는다(X-Forwarded-For 첫 값은 손님이 바꿀 수 있다).
export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") || "unknown";
}

// 접속기록에는 IP 앞부분만 남긴다(IPv4 앞 3칸, IPv6 앞 3묶음).
export function ipPrefix(ip: string): string {
  if (ip.includes(".")) return ip.split(".").slice(0, 3).join(".") + ".x";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + ":x";
  return ip;
}

async function ipKey(ip: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)));
  return Array.from(d.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

// winOffset: 0 = 지금 창, -1 = 바로 앞 창
async function counterPath(
  bucket: string,
  ip: string,
  windowSec: number,
  winOffset = 0
): Promise<{ path: string; expire: string }> {
  const win = Math.floor(Date.now() / (windowSec * 1000)) + winOffset;
  const expire = new Date((win + 2) * windowSec * 1000).toISOString();
  return { path: `rate_limits/${bucket}_${win}_${await ipKey(ip)}`, expire };
}

/**
 * 이번 요청을 세고, 창(windowSec) 안에서 max 를 넘었으면 true.
 * 저장소가 안 되면 손님 접수를 막지 않으려고 통과시키되 로그를 남긴다.
 */
export async function overLimit(
  env: FirestoreEnv,
  bucket: string,
  ip: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    console.error(`[guard] 횟수 제한 저장소 미설정 — ${bucket} 제한이 꺼져 있음`);
    return false;
  }
  try {
    const { path, expire } = await counterPath(bucket, ip, windowSec);
    return (await incrementCounter(env, path, expire)) > max;
  } catch (e) {
    console.error(`[guard] 횟수 제한 실패(${bucket}):`, e instanceof Error ? e.message : String(e));
    return false;
  }
}

// ── 실패 잠금(관리자 열쇠) ──
// 실패만 센다. 지금 창과 바로 앞 창의 실패를 합쳐 max 에 닿으면, 그 시각부터 lockSec 동안 잠금 문서를 둔다.
// 단순화: 앞 창을 통째로 더하므로 실제로는 "최근 10~20분에 5회"로 조금 더 엄하게 잠근다(안전한 쪽 오차).
// 창 경계(예: 09:59 → 10:00)에서 잠금이 일찍 풀리지 않게 잠금은 별도 문서의 "풀리는 시각"으로 판단한다.
async function lockPath(bucket: string, ip: string): Promise<string> {
  return `rate_limits/${bucket}lock_${await ipKey(ip)}`;
}

export async function isLocked(env: FirestoreEnv, bucket: string, ip: string): Promise<boolean> {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return false;
  try {
    const d = await getDoc(env, await lockPath(bucket, ip));
    const until = typeof d?.until === "string" ? Date.parse(d.until) : NaN;
    return until > Date.now();
  } catch (e) {
    console.error(`[guard] 잠금 조회 실패(${bucket}):`, e instanceof Error ? e.message : String(e));
    return false;
  }
}

export async function recordFailure(
  env: FirestoreEnv,
  bucket: string,
  ip: string,
  max: number,
  lockSec: number
): Promise<void> {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return;
  try {
    const cur = await counterPath(bucket, ip, lockSec);
    const prev = await counterPath(bucket, ip, lockSec, -1);
    const nCur = await incrementCounter(env, cur.path, cur.expire);
    const nPrev = Number((await getDoc(env, prev.path))?.n ?? 0) || 0;
    if (nCur + nPrev >= max) {
      const until = new Date(Date.now() + lockSec * 1000).toISOString();
      await patchDoc(env, await lockPath(bucket, ip), {
        until: { __timestamp: until },
        expireAt: { __timestamp: until },
      });
    }
  } catch (e) {
    console.error(`[guard] 실패 기록 실패(${bucket}):`, e instanceof Error ? e.message : String(e));
  }
}

// ── 관리자 접속기록 ──
// 관리자가 상담·대화·첨부를 열람/수정/삭제/발송할 때마다 한 줄. 지우는 코드는 두지 않는다(2년 보관 기준).
// 행위자는 사무실 공용 관리자 1인이라 "admin" 고정(대표 결정 2026-10-05).
export type AuditEntry = {
  action: string; // 예: view, update, delete, send, list, GET /api/admin/lead/detail
  target?: string | null; // 상담 id·세션 id 등
  via: string; // admin-web(관리자 화면) | admin-api(중앙 접수함) | send-letter | esign-admin
};

export async function auditLog(env: FirestoreEnv, request: Request, entry: AuditEntry): Promise<boolean> {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("[audit] 저장소 미설정 — 접속기록을 남기지 못함", entry.action);
    return false;
  }
  try {
    await createDoc(env, "admin_access_logs", crypto.randomUUID().replace(/-/g, ""), {
      at: nowTimestamp(),
      actor: "admin",
      action: String(entry.action).slice(0, 120),
      target: entry.target ? String(entry.target).slice(0, 200) : null,
      via: entry.via,
      ip: ipPrefix(clientIp(request)),
    });
    return true;
  } catch (e) {
    console.error("[audit] 접속기록 저장 실패:", e instanceof Error ? e.message : String(e), entry.action);
    return false;
  }
}
