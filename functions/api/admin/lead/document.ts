// 접수함 lead/document — 서면 초안 본문. "검토 전 초안" 워터마크를 붙이고, 손님에게는 보내지 않는다.
import { checkAdmin, json, readJson, resolveRef, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { buildDocument } from "../../_adminDocs";

export const onRequestPost: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const b = await readJson(request);
  if (!b) return json({ ok: false, error: "bad_request" }, 400);
  try {
    const res = await resolveRef(env, b.ref);
    if (!res) return json({ ok: false, error: "not_found" }, 404);
    const doc = buildDocument(res.consultations, String(b.key ?? ""));
    if (!doc) return json({ ok: false, error: "이 접수에는 해당 서면이 없습니다." }, 404);
    return json({ ok: true, ...doc });
  } catch (e) {
    return upstreamError("lead/document", e);
  }
};
