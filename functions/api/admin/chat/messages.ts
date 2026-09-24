// 접수함 /api/admin/chat/messages — 한 대화의 전문. 내부 역할(me/them)을 접수함 규약(user/hiro)으로 바꿔 내보낸다.
import { fsClient } from "../../_firestore";
import {
  checkAdmin,
  json,
  masked,
  sessionConsultations,
  sessionMessages,
  SID_RE,
  str,
  upstreamError,
  utc,
  type AdminApiEnv,
} from "../../_adminApi";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const sid = new URL(request.url).searchParams.get("sid") ?? "";
  if (!SID_RE.test(sid)) return json({ ok: false, error: "invalid_input" }, 400);
  try {
    const fs = await fsClient(env);
    const [msgs, cases] = await Promise.all([sessionMessages(fs, sid), sessionConsultations(fs, sid)]);
    if (!msgs.length && !cases.length) return json({ ok: false, error: "not_found" }, 404);
    const pick = (k: string) => cases.map((c) => str(c.data[k], 40).trim()).find(Boolean) ?? "";
    return json({
      messages: msgs.map((m) => ({
        role: m.data.role === "me" ? "user" : "hiro",
        content: masked(m.data.text, 4000),
        created_at: utc(m.data.createdAt),
      })),
      live: false,
      name: pick("userName"),
      phone: pick("contact"),
    });
  } catch (e) {
    return upstreamError("chat/messages", e);
  }
};
