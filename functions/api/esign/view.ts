// 손님 서명 페이지가 계약서를 불러오는 API — POST /api/esign/view {token}. 로그인 없이 링크 토큰으로만 연다.
// 토큰을 주소창 쿼리가 아니라 본문으로 받는 것은 접속 기록에 토큰이 덜 남게 하려는 것이다.

import { getDoc, type FirestoreEnv } from "../_firestore";
import { originAllowed } from "../_admin-auth";
import { COLLECTION, isTokenShape, json, publicView, rateLimited, toContract } from "../_esign";

export const onRequestPost: PagesFunction<FirestoreEnv> = async ({ request, env }) => {
  if (!originAllowed(request)) return json({ ok: false, error: "forbidden_origin" }, 403);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (rateLimited(`view:${ip}`, 60)) {
    return json({ ok: false, error: "too_many_requests", message: "잠시 후 다시 열어 주세요." }, 429);
  }
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "invalid_json" }, 400);
  if (!isTokenShape(body.token)) {
    return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다. 링크를 다시 확인해 주세요." }, 404);
  }
  let raw: Record<string, unknown> | null;
  try {
    raw = await getDoc(env, `${COLLECTION}/${body.token}`);
  } catch {
    return json({ ok: false, error: "lookup_failed", message: "잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!raw) {
    return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다. 링크를 다시 확인해 주세요." }, 404);
  }
  const c = toContract(raw);
  if (c.status === "void") {
    return json({ ok: false, error: "void", message: "취소된 계약서입니다. 사무실로 연락해 주세요." }, 410);
  }
  return json({ ok: true, contract: publicView(c) });
};
