// 채팅 메시지 서버측 기록 폴백 — 클라이언트 Firestore 경로(광고차단·일시 장애)가 막혔을 때
// 같은 도메인 경유로 chat_messages 에 기록해 실시간 대화가 유실되지 않게 한다. (접수 누락 방지 원칙)
import { createDoc, nowTimestamp, type FirestoreEnv } from "./_firestore";

type Env = FirestoreEnv;

type RequestBody = {
  sessionId?: string | null;
  role?: string;
  text?: string;
  consent?: boolean;
};

const ALLOWED_ORIGIN =
  /^https?:\/\/([a-z0-9-]+\.)?toesahero\.com(\/|$)|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)|^https:\/\/[a-z0-9-]+\.toesahero\.pages\.dev(\/|$)/i;

// 폴백 경로라 평소엔 호출이 없지만, 광고차단 사용자는 메시지마다 올 수 있어 넉넉히 잡는다.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits)
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return false;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin =
    request.headers.get("origin") || request.headers.get("referer") || "";
  if (!ALLOWED_ORIGIN.test(origin)) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (rateLimited(ip)) {
    return json({ ok: false, reason: "too_many_requests" }, 429);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 400);
  }
  const role = body.role === "me" || body.role === "them" ? body.role : null;
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
  if (!role || !text || body.consent !== true) {
    return json({ ok: false, reason: "invalid_input" }, 400);
  }

  try {
    const docId = crypto.randomUUID().replace(/-/g, "");
    await createDoc(env, "chat_messages", docId, {
      text,
      role,
      sessionId,
      uid: null,
      consent: true,
      via: "server-fallback",
      createdAt: nowTimestamp(),
    });
    return json({ ok: true });
  } catch (e) {
    // 서비스계정 미설정·일시 오류 — 대화록 문자(chatlog)와 sessionStorage가 마지막 방어선
    return json({ ok: false, reason: String(e).slice(0, 200) }, 200);
  }
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
