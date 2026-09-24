// 접수함 lead/detail — 사이트 어드민 상담 상세의 정보(폼 항목·안전 신호·서면·결제 조회)를 표로 돌려준다.
import type { FsRow } from "../../_firestore";
import { checkAdmin, json, resolveRef, upstreamError, type AdminApiEnv } from "../../_adminApi";
import { buildDetail } from "../../_adminDetail";

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const ref = new URL(request.url).searchParams.get("ref");
  try {
    const res = await resolveRef(env, ref);
    if (!res) return json({ ok: false, error: "not_found" }, 404);
    const orders: FsRow[] = (
      await Promise.all(
        res.consultations.slice(0, 10).map((c) => res.fs.query("orders", { eq: ["caseId", c.id], limit: 10 }))
      )
    ).flat();
    return json({ ok: true, sections: buildDetail(res, orders) });
  } catch (e) {
    return upstreamError("lead/detail", e);
  }
};
