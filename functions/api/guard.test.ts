// 공용 검문 검증 — 출처 정확 일치, 초안 API(draft·notice)의 출처·횟수·길이 제한.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ipPrefix, sameSiteOrigin } from "./_guard";
import { onRequestPost as draft } from "./draft";
import { onRequestPost as notice } from "./notice";

let SA = "";
beforeAll(async () => {
  const kp = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;
  const der = new Uint8Array((await crypto.subtle.exportKey("pkcs8", kp.privateKey)) as ArrayBuffer);
  let bin = "";
  for (const b of der) bin += String.fromCharCode(b);
  SA = JSON.stringify({
    client_email: "sa@test",
    private_key: `-----BEGIN PRIVATE KEY-----\n${btoa(bin)}\n-----END PRIVATE KEY-----`,
    project_id: "p",
  });
});

// 가짜 바깥 세상 — Firestore 횟수 세기와 AI 호출만 흉내 낸다.
function stubWorld() {
  const counters: Record<string, number> = {};
  const calls = { ai: 0 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "tok" }));
      if (u.endsWith(":commit")) {
        const id = String(JSON.parse(String(init?.body)).writes[0].update.name);
        counters[id] = (counters[id] ?? 0) + 1;
        return new Response(JSON.stringify({ writeResults: [{ transformResults: [{ integerValue: String(counters[id]) }] }] }));
      }
      if (u.startsWith("https://api.anthropic.com/")) {
        calls.ai++;
        return new Response(JSON.stringify({ content: [{ type: "text", text: "초안" }] }));
      }
      return new Response("unexpected", { status: 599 });
    })
  );
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

type H = (c: unknown) => Promise<Response>;
const ENV = () => ({ ANTHROPIC_API_KEY: "k", FIREBASE_SERVICE_ACCOUNT: SA });
const call = (h: unknown, path: string, body: unknown, origin = "https://toesahero.com", ip = "203.0.113.5") =>
  (h as H)({
    request: new Request(`https://toesahero.com${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
    env: ENV(),
  });

const DRAFT_BODY = { conversation: [{ role: "user", content: "회사를 그만두고 싶어요" }] };
const NOTICE_BODY = { factSummary: "월급 300만원", items: [{ label: "퇴직금", amount: 3000000 }] };

describe("출처 정확 일치", () => {
  const r = (h: Record<string, string>) => new Request("https://toesahero.com/api/x", { method: "POST", headers: h });
  it("우리 도메인만 통과", () => {
    expect(sameSiteOrigin(r({ origin: "https://toesahero.com" }))).toBe(true);
    expect(sameSiteOrigin(r({ referer: "https://toesahero.com/calc" }))).toBe(true);
    expect(sameSiteOrigin(r({ origin: "https://evil.toesahero.com" }))).toBe(false);
    expect(sameSiteOrigin(r({ origin: "https://toesahero.com.evil.example" }))).toBe(false);
    expect(sameSiteOrigin(r({ origin: "http://toesahero.com" }))).toBe(false);
    expect(sameSiteOrigin(r({ origin: "http://localhost:5173" }))).toBe(false);
    expect(sameSiteOrigin(r({}))).toBe(false);
  });
  it("접속기록 IP는 앞부분만", () => {
    expect(ipPrefix("203.0.113.5")).toBe("203.0.113.x");
    expect(ipPrefix("2001:db8:1:2::5")).toBe("2001:db8:1:x");
  });
});

describe("초안 API 잠금", () => {
  it("남의 사이트에서 부르면 AI를 부르지 않고 403", async () => {
    const calls = stubWorld();
    expect((await call(draft, "/api/draft", DRAFT_BODY, "https://evil.example")).status).toBe(403);
    expect((await call(notice, "/api/notice", NOTICE_BODY, "https://evil.example")).status).toBe(403);
    expect(calls.ai).toBe(0);
  });
  it("같은 IP는 한 시간에 5번까지, 6번째는 429", async () => {
    const calls = stubWorld();
    for (let i = 0; i < 5; i++) expect((await call(draft, "/api/draft", DRAFT_BODY)).status).toBe(200);
    expect((await call(draft, "/api/draft", DRAFT_BODY)).status).toBe(429);
    expect(calls.ai).toBe(5);
    // 다른 IP는 영향 없음
    expect((await call(draft, "/api/draft", DRAFT_BODY, undefined, "198.51.100.7")).status).toBe(200);
  });
  it("너무 긴 대화·이상한 청구 항목은 거른다", async () => {
    const calls = stubWorld();
    const longConv = { conversation: Array.from({ length: 40 }, () => ({ role: "user", content: "가".repeat(2000) })) };
    expect((await call(draft, "/api/draft", longConv)).status).toBe(413);
    const many = { items: Array.from({ length: 21 }, () => ({ label: "x", amount: 1 })) };
    expect((await call(notice, "/api/notice", many, undefined, "198.51.100.8")).status).toBe(400);
    const bad = { items: [{ label: "x", amount: "1e99" }] };
    expect((await call(notice, "/api/notice", bad, undefined, "198.51.100.9")).status).toBe(400);
    expect(calls.ai).toBe(0);
  });
  it("AI 오류 내용은 손님 응답에 싣지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "tok" }));
        if (u.endsWith(":commit"))
          return new Response(JSON.stringify({ writeResults: [{ transformResults: [{ integerValue: "1" }] }] }));
        return new Response("secret upstream detail", { status: 500 });
      })
    );
    const r = await call(notice, "/api/notice", NOTICE_BODY);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain("secret upstream detail");
  });
});

// ── 보관 기한 정리 — 기본은 세기만, 스위치를 켜야 지운다 ──
import { onRequestPost as retention } from "./admin/retention";

describe("보관 기한 정리", () => {
  const OLD = "2024-01-01T00:00:00Z";
  const docs: Record<string, Array<{ id: string; f: Record<string, unknown> }>> = {
    consultations: [
      { id: "c1", f: { status: { stringValue: "new" } } },
      { id: "c2", f: { status: { stringValue: "contracted" } } },
      { id: "c3", f: { status: { stringValue: "consulted" }, paymentStatus: { stringValue: "paid" } } },
    ],
    chat_messages: [
      { id: "m1", f: { sessionId: { stringValue: "sA" } } }, // 연결 상담 없음 → 지움
      { id: "m2", f: { sessionId: { stringValue: "sB" } } }, // 수임 상담과 연결 → 남김
      { id: "m3", f: {} }, // 대화 id 없음 → 지움
    ],
  };
  function stubRetention() {
    const deletes: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "tok" }));
        if (u.endsWith(":batchWrite")) {
          const writes = JSON.parse(String(init?.body)).writes as Array<{ delete?: string; currentDocument?: { updateTime?: string } }>;
          for (const w of writes) {
            const id = w.delete!.split("/").pop() as string;
            // 상담 삭제는 조회 때 updateTime 조건이 붙어야 한다
            if (id.startsWith("c")) expect(w.currentDocument?.updateTime).toBe("2024-01-02T00:00:00Z");
            deletes.push(id);
          }
          return new Response(JSON.stringify({ status: writes.map(() => ({})) }));
        }
        if (u.endsWith(":runQuery")) {
          const q = JSON.parse(String(init?.body)).structuredQuery;
          const col = q.from[0].collectionId as string;
          const f = q.where.fieldFilter;
          if (f.op === "EQUAL") {
            const linked = f.value.stringValue === "sB" ? [{ document: { name: "x/consultations/c9", fields: { status: { stringValue: "contracted" }, createdAt: { timestampValue: OLD } } } }] : [];
            return new Response(JSON.stringify(linked.length ? linked : [{ readTime: "x" }]));
          }
          return new Response(JSON.stringify(docs[col].map((d) => ({ document: { name: `projects/p/databases/(default)/documents/${col}/${d.id}`, updateTime: "2024-01-02T00:00:00Z", fields: d.f } }))));
        }
        if (u.includes("?documentId=")) return new Response("{}"); // 접속기록
        if (u.includes("/rate_limits/")) return new Response("{}", { status: 404 });
        return new Response("unexpected", { status: 599 });
      })
    );
    return deletes;
  }
  const run = (extra: Record<string, string> = {}) =>
    (retention as unknown as H)({
      request: new Request("https://toesahero.com/api/admin/retention", {
        method: "POST",
        headers: { "x-admin-id": "hq", "x-admin-key": "k" },
      }),
      env: { TOESA_ADMIN_ID: "hq", TOESA_ADMIN_KEY: "k", FIREBASE_SERVICE_ACCOUNT: SA, ...extra },
    });

  it("스위치가 꺼져 있으면 세기만 하고 지우지 않는다", async () => {
    const deletes = stubRetention();
    const r = await run();
    const b = (await r.json()) as Record<string, any>;
    expect(b.enabled).toBe(false);
    expect(b.consultations).toMatchObject({ expired: 1, keptForReview: 2 });
    expect(b.chat_messages).toMatchObject({ expired: 2 });
    expect(deletes).toEqual([]);
  });
  it("RETENTION_DELETE_ENABLED=true 일 때만 대상만 지운다", async () => {
    const deletes = stubRetention();
    await run({ RETENTION_DELETE_ENABLED: "true" });
    expect(deletes.sort()).toEqual(["c1", "m1", "m3"]);
  });
});
