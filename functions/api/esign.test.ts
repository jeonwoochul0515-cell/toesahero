// 전자계약 서명 흐름 검증 — 해시 대조, 만료, 중복 서명 거절, 무효, 입력 검사, PNG 머리글, 90일 가림, 알림 실패 격리, 관리자 인증.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  SIGN_VALID_DAYS,
  buildContract,
  checkSign,
  checkSignatureImage,
  contractText,
  isQuietHourKst,
  publicView,
  sha256Hex,
  validBirth,
  validateNew,
  type ContractDoc,
} from "./_esign";
import { patchDocIfUnchanged } from "./_firestore";
import { onRequestPost as sign } from "./esign/sign";
import { onRequestPost as view } from "./esign/view";
import { onRequestPost as adminApi } from "./esign/admin";

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
afterEach(() => vi.unstubAllGlobals());

// 가상의 의뢰인 — 실제 의뢰인 정보는 쓰지 않는다
const INPUT = {
  title: "위임계약서",
  body: "위임인 홍길동은 수임인 법률사무소 청송law 담당변호사 김창희에게 아래 사건을 위임한다.\n제1조 ...".padEnd(120, "."),
  fee: 0,
  successFee: "회수액의 10%(부가세 별도)",
  clientName: "홍길동",
  clientPhone: "01012345678",
};

/** 가로 600 · 세로 220 PNG 머리글 + 덧붙인 바이트 */
function pngDataUrl(w = 600, h = 220): string {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(16, w);
  dv.setUint32(20, h);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return "data:image/png;base64," + btoa(s);
}

async function fresh(now = Date.now()): Promise<ContractDoc> {
  return buildContract(INPUT, "admin-uid", now);
}

const goodSign = (c: ContractDoc) => ({
  name: "홍 길동",
  birth: "1990-01-31",
  addr: "부산광역시 연제구 어딘가 1",
  image: pngDataUrl(),
  agree: true,
  hash: c.hash,
});

describe("계약서 만들기", () => {
  it("토큰은 43자(256비트)이고 매번 다르다, 만료는 14일 뒤", async () => {
    const now = Date.parse("2026-10-08T00:00:00Z");
    const a = await fresh(now);
    const b = await fresh(now);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
    expect(Date.parse(a.expiresAt) - now).toBe(SIGN_VALID_DAYS * 86400_000);
    expect(a.hash).toBe(await sha256Hex(contractText(INPUT)));
  });

  it("해시는 착수금·성공보수까지 묶는다", async () => {
    expect(await sha256Hex(contractText(INPUT))).not.toBe(await sha256Hex(contractText({ ...INPUT, fee: 1 })));
    expect(await sha256Hex(contractText(INPUT))).not.toBe(await sha256Hex(contractText({ ...INPUT, successFee: "없음" })));
  });

  it("입력 검사 — 착수금 0원 허용, 음수·소수·긴 본문·잘못된 번호 거절", () => {
    expect(validateNew({ ...INPUT }).ok).toBe(true);
    expect(validateNew({ ...INPUT, fee: -1 }).ok).toBe(false);
    expect(validateNew({ ...INPUT, fee: 1.5 }).ok).toBe(false);
    expect(validateNew({ ...INPUT, body: "짧음" }).ok).toBe(false);
    expect(validateNew({ ...INPUT, body: "가".repeat(30001) }).ok).toBe(false);
    expect(validateNew({ ...INPUT, clientPhone: "0212345678" }).ok).toBe(false);
  });
});

describe("서명 검사", () => {
  it("정상 서명은 통과한다(성함 띄어쓰기 무시)", async () => {
    const c = await fresh();
    const r = await checkSign(c, goodSign(c));
    expect(r.ok).toBe(true);
  });

  it("저장본이 보낸 뒤 바뀌었으면(해시 불일치) 거절", async () => {
    const c = await fresh();
    const r = await checkSign({ ...c, body: c.body + " 추가 조항" }, goodSign(c));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("hash_mismatch");
  });

  it("손님 화면이 본 해시가 다르면 거절", async () => {
    const c = await fresh();
    const r = await checkSign(c, { ...goodSign(c), hash: "0".repeat(64) });
    expect(!r.ok && r.code).toBe("stale_view");
  });

  it("14일이 지나면 만료", async () => {
    const made = Date.parse("2026-10-01T00:00:00Z");
    const c = await fresh(made);
    const r = await checkSign(c, goodSign(c), made + SIGN_VALID_DAYS * 86400_000 + 1000);
    expect(!r.ok && r.code).toBe("expired");
  });

  it("이미 서명했거나 무효면 거절", async () => {
    const c = await fresh();
    expect((await checkSign({ ...c, status: "signed", signedAt: new Date().toISOString() }, goodSign(c))).ok).toBe(false);
    const v = await checkSign({ ...c, status: "void" }, goodSign(c));
    expect(!v.ok && v.code).toBe("void");
  });

  it("성함 불일치·동의 없음·생년월일·주소·서명 그림 오류를 거절", async () => {
    const c = await fresh();
    const g = goodSign(c);
    expect(!(await checkSign(c, { ...g, name: "김철수" })).ok).toBe(true);
    expect(!(await checkSign(c, { ...g, agree: false })).ok).toBe(true);
    expect(!(await checkSign(c, { ...g, birth: "1990-02-30" })).ok).toBe(true);
    expect(!(await checkSign(c, { ...g, addr: "부산" })).ok).toBe(true);
    expect(!(await checkSign(c, { ...g, image: "data:image/jpeg;base64,AAAA" })).ok).toBe(true);
  });
});

describe("서명 그림·생년월일·조용한 시간", () => {
  it("PNG 머리글과 크기를 본다", () => {
    expect(checkSignatureImage(pngDataUrl()).ok).toBe(true);
    expect(checkSignatureImage("data:image/png;base64," + btoa("GIF89a" + "x".repeat(40))).ok).toBe(false);
    expect(checkSignatureImage(pngDataUrl(5000, 220)).ok).toBe(false);
    expect(checkSignatureImage("data:image/png;base64," + "A".repeat(300_000)).ok).toBe(false);
    expect(checkSignatureImage("data:image/png;base64,@@@@").ok).toBe(false);
  });
  it("생년월일은 실제 날짜만", () => {
    expect(validBirth("2000-02-29")).toBe(true);
    expect(validBirth("2001-02-29")).toBe(false);
    expect(validBirth("19900131")).toBe(false);
  });
  it("한국시간 밤 9시~아침 8시는 문자 금지", () => {
    expect(isQuietHourKst(Date.parse("2026-10-08T12:30:00Z"))).toBe(true); // 21:30 KST
    expect(isQuietHourKst(Date.parse("2026-10-08T22:59:00Z"))).toBe(true); // 07:59 KST
    expect(isQuietHourKst(Date.parse("2026-10-08T23:00:00Z"))).toBe(false); // 08:00 KST
  });
});

describe("90일 뒤 개인정보 가림", () => {
  it("서명 90일이 지나면 주소·생년월일·서명 그림만 가리고 본문은 보인다", async () => {
    const c = await fresh();
    const signed: ContractDoc = {
      ...c, status: "signed", signedAt: "2026-01-01T00:00:00Z", signedName: "홍길동",
      signedBirth: "1990-01-31", signedAddr: "부산 어딘가 1", signedImage: pngDataUrl(), signedIp: "1.2.3.4",
    };
    const early = publicView(signed, Date.parse("2026-02-01T00:00:00Z"));
    expect(early.signedAddr).toBe("부산 어딘가 1");
    const late = publicView(signed, Date.parse("2026-04-02T00:00:00Z"));
    expect(late.signedAddr).toBeNull();
    expect(late.signedBirth).toBeNull();
    expect(late.signedImage).toBeNull();
    expect(late.body).toBe(c.body);
    expect(JSON.stringify(late)).not.toContain("1.2.3.4");
    expect(JSON.stringify(late)).not.toContain(c.clientPhone);
  });
});

// ── 가짜 Firestore(updateTime 전제조건 흉내) ──
type Store = Record<string, { fields: Record<string, unknown>; updateTime: string }>;
function stubFs(store: Store, extra?: (u: string, init?: RequestInit) => Response | undefined) {
  let tick = 1;
  const enc = (v: unknown) =>
    typeof v === "number" ? { integerValue: String(v) } : v === null ? { nullValue: null } : { stringValue: String(v) };
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      calls.push(`${init?.method ?? "GET"} ${u}`);
      const x = extra?.(u, init);
      if (x) return x;
      if (u.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "t" }));
      const m = /documents\/([^?]+)(\?.*)?$/.exec(u);
      if (!m) return new Response("{}", { status: 404 });
      const path = decodeURIComponent(m[1]);
      const qs = new URLSearchParams(m[2]?.slice(1) ?? "");
      const doc = store[path];
      if (init?.method === "PATCH") {
        const pre = qs.get("currentDocument.updateTime");
        if (!doc || (pre && pre !== doc.updateTime)) {
          return new Response(JSON.stringify({ error: { status: "FAILED_PRECONDITION" } }), { status: 400 });
        }
        const f = JSON.parse(String(init.body)).fields as Record<string, Record<string, unknown>>;
        for (const [k, v] of Object.entries(f)) doc.fields[k] = Object.values(v)[0];
        doc.updateTime = `2026-10-08T00:00:0${tick++}Z`;
        return new Response("{}");
      }
      if (!doc) return new Response("{}", { status: 404 });
      return new Response(
        JSON.stringify({
          name: path,
          updateTime: doc.updateTime,
          fields: Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, enc(v)])),
        })
      );
    })
  );
  return calls;
}

async function storeWith(c: ContractDoc): Promise<Store> {
  return {
    [`esign_contracts/${c.token}`]: {
      fields: { ...c, signedAt: null } as unknown as Record<string, unknown>,
      updateTime: "2026-10-08T00:00:00Z",
    },
  };
}

const ORIGIN = { origin: "https://toesahero.com", "content-type": "application/json", "cf-connecting-ip": "" };
let ipSeq = 0;
function req(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://toesahero.com${path}`, {
    method: "POST",
    headers: { ...ORIGIN, "cf-connecting-ip": `10.0.0.${++ipSeq}`, ...headers },
    body: JSON.stringify(body),
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = (request: Request, env: Record<string, unknown>) => ({ request, env, waitUntil: undefined } as any);

describe("서명 API", () => {
  it("한 번 서명하면 같은 링크로 다시 서명할 수 없다", async () => {
    const c = await fresh();
    const store = await storeWith(c);
    stubFs(store);
    const env = { FIREBASE_SERVICE_ACCOUNT: SA };
    const r1 = await sign(ctx(req("/api/esign/sign", { token: c.token, ...goodSign(c) }), env));
    expect(r1.status).toBe(200);
    expect(store[`esign_contracts/${c.token}`].fields.status).toBe("signed");
    expect(store[`esign_contracts/${c.token}`].fields.signedIp).toMatch(/^10\.0\.0\./);
    const r2 = await sign(ctx(req("/api/esign/sign", { token: c.token, ...goodSign(c) }), env));
    expect(r2.status).toBe(409);
    expect(((await r2.json()) as { error: string }).error).toBe("already_signed");
  });

  it("읽은 뒤 다른 쪽이 먼저 저장했으면 조건부 저장이 거절된다", async () => {
    const c = await fresh();
    const store = await storeWith(c);
    stubFs(store);
    const env = { FIREBASE_SERVICE_ACCOUNT: SA };
    const path = `esign_contracts/${c.token}`;
    const stale = store[path].updateTime;
    expect(await patchDocIfUnchanged(env, path, { status: "signed" }, stale)).toBe(true);
    expect(await patchDocIfUnchanged(env, path, { status: "signed" }, stale)).toBe(false);
  });

  it("사무실 알림이 실패해도 서명은 저장된다", async () => {
    const c = await fresh();
    const store = await storeWith(c);
    stubFs(store, (u) => (u.includes("lead-inbox") || u.includes("solapi") ? new Response("down", { status: 500 }) : undefined));
    const env = {
      FIREBASE_SERVICE_ACCOUNT: SA, LEAD_INBOX_TOKEN: "x",
      SOLAPI_API_KEY: "k", SOLAPI_API_SECRET: "s", SOLAPI_SENDER: "0216604452", ALERT_TO_PHONE: "01000000000",
    };
    const r = await sign(ctx(req("/api/esign/sign", { token: c.token, ...goodSign(c) }), env));
    expect(r.status).toBe(200);
    expect(store[`esign_contracts/${c.token}`].fields.status).toBe("signed");
  });

  it("다른 사이트에서 온 요청·잘못된 토큰은 거절", async () => {
    const c = await fresh();
    stubFs(await storeWith(c));
    const env = { FIREBASE_SERVICE_ACCOUNT: SA };
    const evil = await sign(ctx(req("/api/esign/sign", { token: c.token }, { origin: "https://evil.example" }), env));
    expect(evil.status).toBe(403);
    const bad = await view(ctx(req("/api/esign/view", { token: "short" }), env));
    expect(bad.status).toBe(404);
    expect((await sign(ctx(req("/api/esign/sign", null), env))).status).toBe(400);
    expect((await view(ctx(req("/api/esign/view", null), env))).status).toBe(400);
  });

  it("보기 API는 연락처·IP를 내보내지 않는다", async () => {
    const c = await fresh();
    stubFs(await storeWith(c));
    const r = await view(ctx(req("/api/esign/view", { token: c.token }), { FIREBASE_SERVICE_ACCOUNT: SA }));
    const text = await r.text();
    expect(r.status).toBe(200);
    expect(text).not.toContain(c.clientPhone);
    expect(text).toContain(c.hash);
  });
});

describe("관리자 API", () => {
  it("로그인 토큰이 없으면 401", async () => {
    stubFs({});
    const r = await adminApi(ctx(req("/api/esign/admin", { action: "list" }), { FIREBASE_SERVICE_ACCOUNT: SA, VITE_FIREBASE_API_KEY: "k" }));
    expect(r.status).toBe(401);
  });

  async function smsSetup() {
    const c = await fresh(Date.parse("2026-10-08T00:00:00Z"));
    const store = await storeWith(c);
    store["admins/admin-uid"] = { fields: { role: "admin" }, updateTime: "x" };
    const calls = stubFs(store, (u) =>
      u.includes("identitytoolkit")
        ? new Response(JSON.stringify({ users: [{ localId: "admin-uid" }] }))
        : u.includes("solapi")
          ? new Response("{}")
          : undefined
    );
    const env = {
      FIREBASE_SERVICE_ACCOUNT: SA, VITE_FIREBASE_API_KEY: "k",
      SOLAPI_API_KEY: "k", SOLAPI_API_SECRET: "s", SOLAPI_SENDER: "0216604452",
    };
    const call = () =>
      adminApi(ctx(req("/api/esign/admin", { action: "sms", token: c.token }, { authorization: "Bearer idtok" }), env));
    return { calls, call };
  }

  it("문자 버튼을 연달아 눌러도 한 통만 나간다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T03:00:00Z")); // 낮 12시(한국)
    try {
      const { calls, call } = await smsSetup();
      const [a, b] = await Promise.all([call(), call()]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const again = await call();
      expect(again.status).toBe(429);
      expect(calls.filter((x) => x.includes("solapi")).length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("밤 9시~아침 8시에는 문자를 보내지 않는다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T13:00:00Z")); // 밤 10시(한국)
    try {
      const { calls, call } = await smsSetup();
      const r = await call();
      expect(r.status).toBe(409);
      expect(((await r.json()) as { error: string }).error).toBe("quiet_hours");
      expect(calls.some((x) => x.includes("solapi"))).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("서명된 계약서는 무효로 돌릴 수 없다", async () => {
    const c = await fresh();
    const store = await storeWith(c);
    store[`esign_contracts/${c.token}`].fields.status = "signed";
    store[`esign_contracts/${c.token}`].fields.signedAt = "2026-10-08T00:00:00Z";
    stubFs(store, (u) =>
      u.includes("identitytoolkit") ? new Response(JSON.stringify({ users: [{ localId: "admin-uid" }] })) : undefined
    );
    store["admins/admin-uid"] = { fields: { role: "admin" }, updateTime: "x" };
    const r = await adminApi(
      ctx(req("/api/esign/admin", { action: "void", token: c.token }, { authorization: "Bearer idtok" }), {
        FIREBASE_SERVICE_ACCOUNT: SA,
        VITE_FIREBASE_API_KEY: "k",
      })
    );
    expect(r.status).toBe(409);
    expect(store[`esign_contracts/${c.token}`].fields.status).toBe("signed");
  });
});
