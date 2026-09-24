// 접수함 lead/files — 손님이 올린 사건 자료 목록.
import { checkAdmin, json, resolveRef, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { caseFiles, fileList } from "../../_adminFiles";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  try {
    const res = await resolveRef(env, new URL(request.url).searchParams.get("ref"));
    if (!res) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, files: fileList(await caseFiles(res.fs, res.consultations)) });
  } catch (e) {
    return upstreamError("lead/files", e);
  }
};
