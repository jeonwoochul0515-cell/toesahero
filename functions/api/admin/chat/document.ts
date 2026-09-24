// 접수함 /api/admin/chat/document — 대화 세션의 서면 초안. {} 또는 {sid} 면 종류 목록, {sid, docKey} 면 본문.
import { fsClient } from "../../_firestore";
import { checkAdmin, json, readJson, sessionConsultations, SID_RE, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { availableTypes, buildDocument, DOC_TYPES } from "../../_adminDocs";

export const onRequestPost: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const b = (await readJson(request)) ?? {};
  const sid = typeof b.sid === "string" ? b.sid : "";
  const docKey = typeof b.docKey === "string" ? b.docKey : "";
  if (!sid) return json({ ok: true, types: DOC_TYPES.map((t) => ({ key: t.key, label: t.label })) });
  if (!SID_RE.test(sid)) return json({ ok: false, error: "invalid_input" }, 400);
  try {
    const cases = await sessionConsultations(await fsClient(env), sid);
    if (!docKey) return json({ ok: true, types: availableTypes(cases) });
    const doc = buildDocument(cases, docKey);
    if (!doc) return json({ ok: false, error: "이 대화에는 해당 서면이 없습니다." }, 404);
    return json({ ok: true, ...doc });
  } catch (e) {
    return upstreamError("chat/document", e);
  }
};
