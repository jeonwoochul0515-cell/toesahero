// 접수함 lead/status — 접수함 상태(신규·연락완료·진행중·수임·종결)를 사이트 칸반 상태로 옮긴다.
// 같은 대화(세션)의 상담 문서 전부에 쓴다. 어드민 목록은 최신 문서의 상태를 대표로 보여 주기 때문이다.
import { patchDoc, nowTimestamp } from "../../_firestore";
import { checkAdmin, json, readJson, resolveRef, STATUS_MAP, upstreamError, type AdminApiEnv } from "../../_adminApi";

export const onRequestPost: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const b = await readJson(request);
  if (!b) return json({ ok: false, error: "bad_request" }, 400);
  const status = typeof b.status === "string" ? STATUS_MAP[b.status] : undefined;
  try {
    const res = await resolveRef(env, b.ref);
    if (!res) return json({ ok: false, error: "not_found" }, 404);
    if (!status) return json({ ok: true, ignored: true });
    if (!res.consultations.length) return json({ ok: true, ignored: true });
    for (const c of res.consultations.slice(0, 50)) {
      await patchDoc(env, `consultations/${c.id}`, { status, updatedAt: nowTimestamp() });
    }
    return json({ ok: true });
  } catch (e) {
    return upstreamError("lead/status", e);
  }
};
