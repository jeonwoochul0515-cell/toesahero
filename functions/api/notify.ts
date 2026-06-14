// Cloudflare Pages Function: POST /api/notify
// 신규 상담 신청 등 클라이언트 이벤트 발생 시 변호사에게 문자로 알린다.
// 클라이언트가 Firestore 저장 성공 후 fire-and-forget 으로 호출한다.
// 시크릿은 서버 env(_notify)에 있으므로 본 엔드포인트가 SOLAPI 키를 노출하지 않는다.

import { sendSms, type NotifyEnv } from "./_notify";

interface Env extends NotifyEnv {}

type RequestBody = {
  type: "consultation" | "draft" | "notice";
  caseId?: string;
  summary?: string;
};

const LABEL: Record<RequestBody["type"], string> = {
  consultation: "신규 상담 신청",
  draft: "AI 통보문 초안 신청",
  notice: "내용증명(표준) 신청",
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 200);
  }

  const label = LABEL[body.type];
  if (!label) {
    return json({ ok: false, reason: "unknown_type" }, 200);
  }

  const ref = body.caseId ? `#${body.caseId.slice(0, 8)}` : "";
  const summary = (body.summary ?? "").slice(0, 120);
  const text = `[퇴사히어로] ${label}${ref ? `\n사건 ${ref}` : ""}${
    summary ? `\n${summary}` : ""
  }\n어드민에서 확인해 주세요.`;

  const r = await sendSms(env, text);
  return json({ ok: r.ok, reason: r.reason }, 200);
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
