// 접수함 /api/admin/chat/files — 대화 세션에 딸린 상담 문서들의 사건 자료 목록.
import { fsClient } from "../../_firestore";
import { checkAdmin, json, sessionConsultations, SID_RE, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { caseFiles, fileList } from "../../_adminFiles";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const sid = new URL(request.url).searchParams.get("sid") ?? "";
  if (!SID_RE.test(sid)) return json({ ok: false, error: "invalid_input" }, 400);
  try {
    const fs = await fsClient(env);
    return json({ ok: true, files: fileList(await caseFiles(fs, await sessionConsultations(fs, sid))) });
  } catch (e) {
    return upstreamError("chat/files", e);
  }
};
