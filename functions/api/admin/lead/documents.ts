// 접수함 lead/documents — 이 접수로 만들 수 있는 서면 종류.
import { checkAdmin, json, resolveRef, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { availableTypes } from "../../_adminDocs";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  try {
    const res = await resolveRef(env, new URL(request.url).searchParams.get("ref"));
    if (!res) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, types: availableTypes(res.consultations) });
  } catch (e) {
    return upstreamError("lead/documents", e);
  }
};
