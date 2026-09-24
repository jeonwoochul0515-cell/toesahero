// 헤드리스 어드민 API 검증 — 인증, ref 해석, 상태 대응, 민감값 가림, 서면 워터마크, 남의 첨부 차단, 답장 501.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { checkAdmin, masked, maskSensitive, parseRef } from "./_adminApi";
import { onRequestPost as leadStatus } from "./admin/lead/status";
import { onRequestGet as leadDetail } from "./admin/lead/detail";
import { onRequestGet as leadFile } from "./admin/lead/file";
import { onRequestPost as leadDocument } from "./admin/lead/document";
import { onRequestGet as chats } from "./admin/chats";
import { onRequestGet as weekly } from "./admin/weekly";
import { onRequestGet as chatMessages } from "./admin/chat/messages";
import { onRequestPost as chatSend } from "./admin/chat/send";
import { onRequestPost as notify } from "./notify";

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
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin)}\n-----END PRIVATE KEY-----`;
  SA = JSON.stringify({ client_email: "sa@test", private_key: pem, project_id: "p" });
});

const env = () => ({ TOESA_ADMIN_ID: "hq", TOESA_ADMIN_KEY: "secret-key", FIREBASE_SERVICE_ACCOUNT: SA });
const AUTH = { "x-admin-id": "hq", "x-admin-key": "secret-key" };
const SID = "11111111-2222-3333-4444-555555555555";

// ── 가짜 Firestore ──
type Doc = Record<string, unknown>;
const enc = (v: unknown): unknown => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}T/.test(v) ? { timestampValue: v } : { stringValue: v };
  if (typeof v === "number") return { integerValue: String(v) };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as Doc).map(([k, x]) => [k, enc(x)])) } };
};
const docJson = (col: string, id: string, d: Doc) => ({
  name: `projects/p/databases/(default)/documents/${col}/${id}`,
  fields: Object.fromEntries(Object.entries(d).map(([k, x]) => [k, enc(x)])),
});

type Db = Record<string, Record<string, Doc>>;
function stubFirestore(db: Db) {
  const patches: string[] = [];
  const fetched: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      fetched.push(u);
      if (u.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "tok" }));
      if (u.endsWith(":runQuery")) {
        const q = JSON.parse(String(init?.body)).structuredQuery;
        const col = q.from[0].collectionId as string;
        const f = q.where?.fieldFilter;
        const rows = Object.entries(db[col] ?? {})
          .filter(([, d]) => !f || d[f.field.fieldPath] === f.value.stringValue)
          .map(([id, d]) => ({ document: docJson(col, id, d) }));
        return new Response(JSON.stringify(rows.length ? rows : [{ readTime: "x" }]));
      }
      const m = /documents\/([^/?]+)\/([^/?]+)(\?.*)?$/.exec(u);
      if (m && u.includes("firestore.googleapis.com")) {
        if (init?.method === "PATCH") {
          patches.push(`${m[1]}/${m[2]}:${init.body}`);
          return new Response("{}");
        }
        const d = db[m[1]]?.[m[2]];
        return d ? new Response(JSON.stringify(docJson(m[1], m[2], d))) : new Response("{}", { status: 404 });
      }
      if (u.startsWith("https://firebasestorage.googleapis.com/")) {
        return new Response("PDFBYTES", { headers: { "content-type": "application/pdf" } });
      }
      return new Response("unexpected", { status: 599 });
    })
  );
  return { patches, fetched };
}

const DB = (): Db => ({
  consultations: {
    caseAAAA1111: {
      source: "chat",
      sessionId: SID,
      userName: "홍길동",
      contact: "010-2222-3333",
      userEmail: "hong@example.com",
      message: "주민번호 900101-1234567 계좌 110-123-456789 입니다",
      damageThreat: true,
      status: "new",
      createdAt: "2026-09-24T01:00:00.000Z",
      paymentStatus: "paid",
      packageId: "basic",
      paymentAmount: 99000,
      paymentKey: "pk_SECRET_should_not_leak",
      draftLetter: "통보합니다\n[작성일] [YYYY년 MM월 DD일]",
      draftStatus: "pending_review",
    },
    formBBBB2222: {
      source: "form",
      userName: "김철수",
      contact: "010-4444-5555",
      meta: { docType: "delegation", birth: "1990-01-01", address: "부산광역시 연제구 법원남로 10 202호", scope: ["임금 청구"] },
      createdAt: "2026-09-23T01:00:00.000Z",
    },
  },
  chat_messages: {
    m1: { sessionId: SID, role: "me", text: "퇴직금을 못 받았어요", createdAt: "2026-09-24T00:59:00.000Z" },
    m2: { sessionId: SID, role: "them", text: "언제 퇴사하셨나요?", createdAt: "2026-09-24T00:59:30.000Z" },
  },
  orders: {
    ord_123456789: { caseId: "caseAAAA1111", status: "paid", amount: 99000, packageId: "basic", paymentKey: "pk_SECRET_should_not_leak" },
  },
  case_files: {
    fileOK000001: { caseId: "caseAAAA1111", name: "근로계약서.pdf", url: "https://firebasestorage.googleapis.com/v0/b/x/o/a?token=t", size: 10 },
    fileOTHER002: { caseId: "someoneElse1", name: "남의것.pdf", url: "https://firebasestorage.googleapis.com/v0/b/x/o/b?token=t", size: 10 },
    fileEVIL0003: { caseId: "caseAAAA1111", name: "evil.pdf", url: "https://evil.example.com/steal", size: 10 },
  },
});

type H = (c: unknown) => Promise<Response>;
const get = (h: unknown, path: string, headers: Record<string, string> = AUTH, e: unknown = env()) =>
  (h as H)({ request: new Request(`https://toesahero.com${path}`, { headers }), env: e });
const post = (h: unknown, path: string, body: unknown, headers: Record<string, string> = AUTH) =>
  (h as H)({
    request: new Request(`https://toesahero.com${path}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env: env(),
  });

afterEach(() => vi.unstubAllGlobals());

describe("인증", () => {
  it("설정이 없으면 503, 열쇠가 틀리면 401, 맞으면 통과", async () => {
    const req = (h: Record<string, string>) => new Request("https://x/", { headers: h });
    expect((await checkAdmin(req(AUTH), {}))?.status).toBe(503);
    expect((await checkAdmin(req({ ...AUTH, "x-admin-key": "wrong" }), env()))?.status).toBe(401);
    expect((await checkAdmin(req({}), env()))?.status).toBe(401);
    expect(await checkAdmin(req(AUTH), env())).toBeNull();
    // 예전 이름으로만 설정돼 있어도 통한다
    expect(await checkAdmin(req(AUTH), { TOESAHERO_ADMIN_ID: "hq", TOESAHERO_ADMIN_KEY: "secret-key" })).toBeNull();
  });
  it("열쇠 없이 부르면 데이터 조회 전에 막힌다", async () => {
    const { fetched } = stubFirestore(DB());
    const r = await get(leadDetail, `/api/admin/lead/detail?ref=${SID}`, {});
    expect(r.status).toBe(401);
    expect(fetched.length).toBe(0);
  });
});

describe("ref 해석", () => {
  it("세션 id와 c:<문서 id>만 받는다", () => {
    expect(parseRef(SID)).toEqual({ kind: "session", sid: SID });
    expect(parseRef("c:formBBBB2222")).toEqual({ kind: "case", caseId: "formBBBB2222" });
    expect(parseRef("c:../admins/x")).toBeNull();
    expect(parseRef("short")).toBeNull();
    expect(parseRef(undefined)).toBeNull();
  });
  it("모르는 ref는 JSON 404", async () => {
    stubFirestore(DB());
    const r = await get(leadDetail, "/api/admin/lead/detail?ref=c:nothere12345");
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ ok: false, error: "not_found" });
  });
});

describe("민감값 가림", () => {
  it("주민번호·계좌는 가리고 휴대전화는 둔다", () => {
    const out = maskSensitive("900101-1234567 / 110-123-456789 / 010-2222-3333");
    expect(out).not.toContain("1234567");
    expect(out).toContain("******-*******");
    expect(out).toContain("6789");
    expect(out).not.toContain("110-123-456789");
    expect(out).toContain("010-2222-3333");
  });
  it("자르는 경계에 걸린 번호도 가린 뒤에 자른다", () => {
    const out = masked(`${"가".repeat(2990)}900101-1234567`, 3000);
    expect(out).not.toContain("900101-123");
  });
});

describe("lead/status", () => {
  it("접수함 상태를 칸반 상태로 옮겨 같은 대화 문서에 쓴다", async () => {
    const { patches } = stubFirestore(DB());
    const r = await post(leadStatus, "/api/admin/lead/status", { ref: SID, status: "수임" });
    expect(await r.json()).toEqual({ ok: true });
    expect(patches.length).toBe(1);
    expect(patches[0]).toContain("consultations/caseAAAA1111");
    expect(patches[0]).toContain('"contracted"');
  });
  it("옮길 곳 없는 상태는 무시", async () => {
    const { patches } = stubFirestore(DB());
    const r = await post(leadStatus, "/api/admin/lead/status", { ref: SID, status: "보류" });
    expect(await r.json()).toEqual({ ok: true, ignored: true });
    expect(patches.length).toBe(0);
  });
});

describe("lead/detail", () => {
  it("폼 항목·안전 신호·결제(조회)를 싣고 민감값·결제키는 빼거나 가린다", async () => {
    stubFirestore(DB());
    const r = await get(leadDetail, `/api/admin/lead/detail?ref=${SID}`);
    const d = (await r.json()) as { ok: boolean; sections: Array<{ title: string; rows: string[][] }> };
    expect(d.ok).toBe(true);
    const text = JSON.stringify(d);
    expect(text).toContain("감지됨");
    expect(text).toContain("결제 완료");
    expect(text).toContain("99,000원");
    expect(text).not.toContain("pk_SECRET");
    expect(text).not.toContain("900101-1234567");
    expect(text).not.toContain("hong@example.com");
    expect(d.sections.map((s) => s.title)).toContain("히로 대화");
  });
  it("위임장 생년월일·주소는 가린다", async () => {
    stubFirestore(DB());
    const d = await (await get(leadDetail, "/api/admin/lead/detail?ref=c:formBBBB2222")).json();
    const text = JSON.stringify(d);
    expect(text).toContain("1990년생");
    expect(text).not.toContain("1990-01-01");
    expect(text).not.toContain("202호");
  });
});

describe("lead/document", () => {
  it("통보문 초안에 워터마크를 붙이고 작성일을 채운다", async () => {
    stubFirestore(DB());
    const d = (await (await post(leadDocument, "/api/admin/lead/document", { ref: SID, key: "letter" })).json()) as Record<string, string>;
    expect(d.ok).toBe(true);
    expect(d.watermark).toContain("검토 전 초안");
    expect(d.body).toContain("법률사무소 청송law");
    expect(d.body).not.toContain("[YYYY년 MM월 DD일]");
  });
  it("없는 서면은 404", async () => {
    stubFirestore(DB());
    const r = await post(leadDocument, "/api/admin/lead/document", { ref: SID, key: "delegation" });
    expect(r.status).toBe(404);
  });
});

describe("lead/file", () => {
  it("이 접수 파일은 열고, 남의 파일·다른 호스트 주소는 404", async () => {
    const { fetched } = stubFirestore(DB());
    const ok = await get(leadFile, `/api/admin/lead/file?ref=${SID}&id=fileOK000001`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("PDFBYTES");
    expect(ok.headers.get("content-disposition")).toContain("attachment");
    expect((await get(leadFile, `/api/admin/lead/file?ref=${SID}&id=fileOTHER002`)).status).toBe(404);
    expect((await get(leadFile, `/api/admin/lead/file?ref=${SID}&id=fileEVIL0003`)).status).toBe(404);
    expect(fetched.some((u) => u.includes("evil.example.com"))).toBe(false);
  });
});

describe("대화 API", () => {
  it("목록과 전문 — 역할을 user/hiro로, 시각을 UTC 문자열로", async () => {
    stubFirestore(DB());
    const list = (await (await get(chats, "/api/admin/chats")).json()) as { sessions: Array<Record<string, unknown>> };
    expect(list.sessions[0]).toMatchObject({ sid: SID, name: "홍길동", live: false, n: 2 });
    expect(list.sessions[0].last_at).toBe("2026-09-24 00:59:30");
    const m = (await (await get(chatMessages, `/api/admin/chat/messages?sid=${SID}`)).json()) as {
      messages: Array<Record<string, string>>;
      phone: string;
    };
    expect(m.messages.map((x) => x.role)).toEqual(["user", "hiro"]);
    expect(m.messages[0].created_at).toBe("2026-09-24 00:59:00");
    expect(m.phone).toBe("010-2222-3333");
  });
  it("답장은 창구가 없어 501", async () => {
    const r = await post(chatSend, "/api/admin/chat/send", { sid: SID, content: "안녕하세요" });
    expect(r.status).toBe(501);
  });
});

describe("주간 지표", () => {
  const W = "/api/admin/weekly?since=2026-09-21%2000%3A00%3A00&until=2026-09-28%2000%3A00%3A00";
  it("열쇠가 틀리면 401, 기간 형식이 틀리면 400", async () => {
    stubFirestore(DB());
    expect((await get(weekly, W, { "x-admin-id": "hq", "x-admin-key": "wrong" })).status).toBe(401);
    expect((await get(weekly, "/api/admin/weekly?since=2026-09-21&until=2026-09-28")).status).toBe(400);
  });
  it("기간 안의 챗봇 접수·결제만 세고, 저장하지 않는 대화 수·AI 호출은 비운다", async () => {
    const db = DB();
    db.consultations.oldChat0001 = { source: "chat", sessionId: "old-session-1", createdAt: "2026-09-10T00:00:00.000Z" };
    db.consultations.sameSess002 = { source: "chat", sessionId: SID, createdAt: "2026-09-24T02:00:00.000Z" };
    db.orders.ord_123456789.approvedAt = "2026-09-24T03:00:00.000Z";
    db.orders.ord_old000001 = { status: "paid", amount: 50000, approvedAt: "2026-09-01T00:00:00.000Z" };
    stubFirestore(db);
    const r = await get(weekly, W);
    expect(r.status).toBe(200);
    const d = (await r.json()) as { ok: boolean; chat: Record<string, unknown>; ai: Record<string, unknown>; notes: string[] };
    expect(d.ok).toBe(true);
    expect(d.chat).toEqual({ conversations: null, leads: 1 });
    expect(d.ai).toEqual({});
    expect(d.notes).toEqual(["결제 완료 1건(합계 99,000원)", "서면 초안 검토 대기 1건(보고 시점)"]);
    expect(d.notes.join("")).not.toMatch(/홍길동|010-/);
  });
});

describe("접수 ref", () => {
  it("세션 없는 폼 접수는 extKey에 c:<상담 문서 id>를 싣는다", async () => {
    const sent: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("lead-inbox")) {
          sent.push(JSON.parse(String(init?.body)));
          return new Response(JSON.stringify({ ok: true, alert: "queued" }));
        }
        return new Response("{}");
      })
    );
    const request = new Request("https://toesahero.com/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://toesahero.com", "cf-connecting-ip": "10.9.9.9" },
      body: JSON.stringify({ type: "consultation", caseId: "formBBBB2222", name: "김철수", contact: "010-4444-5555" }),
    });
    await (notify as unknown as H)({ request, env: { LEAD_INBOX_TOKEN: "t" } });
    expect(sent[0].extKey).toBe("퇴사히어로:c:formBBBB2222");
  });
});
