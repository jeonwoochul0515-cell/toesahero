// 접수함 lead/file — 사건 자료 원본 바이트. 이 접수에 속한 파일만 연다.
import { checkAdmin, json, resolveRef, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { streamFile } from "../../_adminFiles";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  try {
    const res = await resolveRef(env, q.get("ref"));
    if (!res) return json({ ok: false, error: "not_found" }, 404);
    return await streamFile(res.fs, res.consultations, q.get("id") ?? "");
  } catch (e) {
    return upstreamError("lead/file", e);
  }
};
