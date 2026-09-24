// 접수 알림 이관 검증 — 중앙 접수함이 알림을 맡으면 알림톡을 생략하고, 못 맡으면 종전 알림톡을 보낸다.
import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost as notify } from "./notify";
import { attrFields } from "./_leadInbox";

const ENV = {
  LEAD_INBOX_TOKEN: "t",
  SOLAPI_API_KEY: "k",
  SOLAPI_API_SECRET: "s",
  SOLAPI_SENDER: "0215990000",
  ALERT_TO_PHONE: "010-1111-2222",
};

let ipSeq = 0;
function call(body: unknown) {
  const request = new Request("https://toesahero.com/api/notify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://toesahero.com",
      "cf-connecting-ip": `10.0.0.${++ipSeq}`,
    },
    body: JSON.stringify(body),
  });
  return (notify as unknown as (c: unknown) => Promise<Response>)({ request, env: ENV });
}

type Calls = { inbox: Record<string, unknown>[]; solapi: number };
function stubFetch(inbox: () => Promise<Response>): Calls {
  const calls: Calls = { inbox: [], solapi: 0 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("lead-inbox")) {
        calls.inbox.push(JSON.parse(String(init?.body)));
        return inbox();
      }
      calls.solapi++;
      return new Response("{}", { status: 200 });
    })
  );
  return calls;
}
const reply = (b: unknown, status = 200) => async () => new Response(JSON.stringify(b), { status });

const INTAKE = {
  type: "consultation",
  caseId: "abcdef123456",
  summary: "퇴직금 문의",
  name: "홍길동",
  contact: "010-2222-3333",
  sessionId: "sess1",
  visitNo: 3,
  attr: { first: { n_query: "퇴직금 안줌", at: "2026-09-24 01:05" } },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("신규 접수 → 중앙 접수함", () => {
  it("queued면 알림톡을 보내지 않고 새 필드를 넘긴다", async () => {
    const calls = stubFetch(reply({ ok: true, id: 1, alert: "queued" }));
    const res = await call(INTAKE);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(calls.solapi).toBe(0);
    expect(calls.inbox[0]).toMatchObject({
      site: "퇴사히어로",
      extKey: "퇴사히어로:sess1",
      query: "퇴직금 안줌",
      firstVisit: "2026-09-24 10:05",
      visitNo: 3,
      alertTo: "01011112222",
      notify: true,
    });
  });

  it("skipped면 알림톡을 보내지 않는다", async () => {
    const calls = stubFetch(reply({ ok: true, id: 1, alert: "skipped" }));
    await call(INTAKE);
    expect(calls.solapi).toBe(0);
  });

  for (const [label, inbox] of [
    ["off", reply({ ok: true, id: 1, alert: "off" })],
    ["alert 없음(옛 접수함)", reply({ ok: true, id: 1 })],
    ["비정상 응답", reply({ ok: false }, 500)],
    ["네트워크 오류", async () => { throw new Error("down"); }],
  ] as const) {
    it(`${label}이면 종전 알림톡을 비상용으로 보낸다`, async () => {
      const calls = stubFetch(inbox as () => Promise<Response>);
      const res = await call(INTAKE);
      expect(calls.solapi).toBeGreaterThan(0);
      expect(((await res.json()) as { ok?: boolean }).ok).toBe(true);
    });
  }

  it("8초 안에 답이 없으면 비상 알림톡을 보낸다", async () => {
    vi.useFakeTimers();
    const calls: Calls = { inbox: [], solapi: 0 };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).includes("lead-inbox")) {
          calls.inbox.push({});
          return new Promise((_, rej) =>
            init?.signal?.addEventListener("abort", () => rej(new Error("aborted")))
          );
        }
        calls.solapi++;
        return Promise.resolve(new Response("{}", { status: 200 }));
      })
    );
    const p = call(INTAKE);
    await vi.advanceTimersByTimeAsync(8001);
    await p;
    expect(calls.solapi).toBeGreaterThan(0);
  });
});

describe("대화 보고(chatlog) → 같은 건 갱신", () => {
  const LOG = {
    type: "chatlog",
    consent: true,
    sessionId: "sess1",
    name: "홍길동",
    contact: "010-2222-3333",
    transcript: "손님: 퇴직금을 못 받았어요",
    visitNo: 2,
    unanswered: "입사일이 언제인가요?",
  };

  it("갱신 스냅샷은 notify 없이 올리고 skipped면 알림톡을 보내지 않는다", async () => {
    const calls = stubFetch(reply({ ok: true, id: 1, updated: true, alert: "skipped" }));
    const res = await call({ ...LOG, alert: false });
    expect(calls.solapi).toBe(0);
    expect(calls.inbox[0]).not.toHaveProperty("notify");
    expect(calls.inbox[0]).toMatchObject({ extKey: "퇴사히어로:sess1", unanswered: "입사일이 언제인가요?", visitNo: 2 });
    expect(await res.json()).toMatchObject({ ok: true, smsOk: false });
  });

  it("사이트가 알림을 청한 보고는 notify:true, queued면 smsOk=true", async () => {
    const calls = stubFetch(reply({ ok: true, id: 1, alert: "queued" }));
    const res = await call({ ...LOG, alert: true });
    expect(calls.inbox[0]).toMatchObject({ notify: true });
    expect(calls.solapi).toBe(0);
    expect(await res.json()).toMatchObject({ ok: true, smsOk: true });
  });

  it("접수함이 off면 알림을 청한 보고만 비상 알림톡을 보낸다", async () => {
    let calls = stubFetch(reply({ ok: true, id: 1, alert: "off" }));
    await call({ ...LOG, alert: false });
    expect(calls.solapi).toBe(0);
    vi.unstubAllGlobals();
    calls = stubFetch(reply({ ok: true, id: 1, alert: "off" }));
    await call({ ...LOG, alert: true });
    expect(calls.solapi).toBeGreaterThan(0);
  });

  it("접수함 저장 실패면 alert와 무관하게 비상 알림톡을 보낸다", async () => {
    const calls = stubFetch(reply({ ok: false }, 500));
    await call({ ...LOG, alert: false });
    expect(calls.solapi).toBeGreaterThan(0);
  });
});

describe("attrFields", () => {
  it("검색어가 없으면 utm_term, 기록이 없으면 빈 값", () => {
    expect(attrFields({ first: { utm_term: "실업급여" } }).query).toBe("실업급여");
    expect(attrFields(null)).toEqual({ query: "", firstVisit: "" });
    expect(attrFields("{bad")).toEqual({ query: "", firstVisit: "" });
  });
});
