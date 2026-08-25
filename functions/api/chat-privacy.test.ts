import { describe, expect, it } from "vitest";
import { onRequestPost as chat } from "./chat";
import { onRequestPost as chatLog } from "./chat-log";
import { onRequestPost as notify } from "./notify";

type Handler = (context: { request: Request; env: Record<string, unknown> }) =>
  | Response
  | Promise<Response>;

function request(
  path: string,
  body: unknown,
  origin?: string,
  headers: Record<string, string> = {}
) {
  return new Request(`https://toesahero.com${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function run(handler: unknown, req: Request) {
  return (handler as Handler)({ request: req, env: {} });
}

describe("챗봇 API 요청 경계", () => {
  it("Origin 없는 직접 호출을 거부한다", async () => {
    const response = await run(
      chat,
      request("/api/chat", { messages: [{ role: "user", content: "안녕" }] })
    );
    expect(response.status).toBe(403);
  });

  it("허용 도메인이 문자열에 포함되기만 한 악성 Origin을 거부한다", async () => {
    const response = await run(
      chat,
      request(
        "/api/chat",
        { messages: [{ role: "user", content: "안녕" }] },
        "https://evil.example/?next=toesahero.com"
      )
    );
    expect(response.status).toBe(403);
  });

  it("명시된 상한보다 큰 요청을 모델 호출 전에 거부한다", async () => {
    const response = await run(
      chat,
      request(
        "/api/chat",
        { messages: [{ role: "user", content: "안녕" }] },
        "https://toesahero.com",
        { "content-length": String(64 * 1024 + 1) }
      )
    );
    expect(response.status).toBe(413);
  });
});

describe("대화 저장 동의", () => {
  it("개별 메시지 저장은 consent=true 없이는 거부한다", async () => {
    const response = await run(
      chatLog,
      request(
        "/api/chat-log",
        { role: "me", text: "저장하면 안 되는 대화", sessionId: "session-1" },
        "https://toesahero.com"
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it("대화 전문 보고도 consent=true 없이는 거부한다", async () => {
    const response = await run(
      notify,
      request(
        "/api/notify",
        {
          type: "chatlog",
          transcript: "손님: 저장하면 안 되는 대화",
          contact: "010-0000-0000",
        },
        "https://toesahero.com"
      )
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      reason: "consent_required",
    });
  });
});
