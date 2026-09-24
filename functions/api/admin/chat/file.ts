// 접수함 /api/admin/chat/file — 사건 자료 원본 바이트. 이 대화 세션에 속한 파일만 연다.
import { fsClient } from "../../_firestore";
import { checkAdmin, json, sessionConsultations, SID_RE, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { streamFile } from "../../_adminFiles";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const sid = q.get("sid") ?? "";
  if (!SID_RE.test(sid)) return json({ ok: false, error: "invalid_input" }, 400);
  try {
    const fs = await fsClient(env);
    return await streamFile(fs, await sessionConsultations(fs, sid), q.get("fileId") ?? "");
  } catch (e) {
    return upstreamError("chat/file", e);
  }
};
