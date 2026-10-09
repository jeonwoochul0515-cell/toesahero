// 관리자 화면 접속기록 API — POST /api/admin-log {action, target}. 관리자 화면은 Firestore 를 브라우저에서 바로 읽어
// 서버에 흔적이 안 남으므로, 열람·수정·삭제 때마다 화면이 이 주소를 불러 한 줄을 남긴다(시각·admin·행위·대상·IP 앞부분).
// 기록 컬렉션(admin_access_logs)은 서버만 쓰고 관리자만 읽는다. 지우는 코드는 없다(2년 보관).

import { requireAdmin, type AdminAuthEnv } from "./_admin-auth";
import { auditLog } from "./_guard";

const ACTION_RE = /^[a-z][a-z-]{1,39}$/;
const TARGET_RE = /^[A-Za-z0-9_:-]{1,64}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const onRequestPost: PagesFunction<AdminAuthEnv> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (!admin.ok) return json({ ok: false, error: admin.error }, admin.status);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const action = typeof body?.action === "string" ? body.action : "";
  const target = typeof body?.target === "string" && TARGET_RE.test(body.target) ? body.target : null;
  if (!ACTION_RE.test(action)) return json({ ok: false, error: "invalid_action" }, 400);

  const saved = await auditLog(env, request, { action, target, via: "admin-web" });
  return json({ ok: saved }, saved ? 200 : 503);
};
