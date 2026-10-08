// 손님이 위임계약서에 서명을 제출하는 API — POST /api/esign/sign. 검사 → 조건부 저장(한 번만) → 사무실 알림 순서.
// 알림이 실패해도 서명은 이미 저장돼 있다(알림은 저장 뒤 별도로 돈다).

import { getDocWithTime, patchDocIfUnchanged, type FirestoreEnv } from "../_firestore";
import { originAllowed } from "../_admin-auth";
import { sendAlimtalk, KAKAO_TPL, type NotifyEnv } from "../_notify";
import { postLead } from "../_leadInbox";
import { COLLECTION, checkSign, isTokenShape, json, rateLimited, toContract, type ContractDoc } from "../_esign";

interface Env extends FirestoreEnv, NotifyEnv {
  LEAD_INBOX_TOKEN?: string;
}

const MAX_BODY_BYTES = 400_000;

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!originAllowed(request)) return json({ ok: false, error: "forbidden_origin" }, 403);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (rateLimited(`sign:${ip}`, 10)) {
    return json({ ok: false, error: "too_many_requests", message: "잠시 후 다시 시도해 주세요." }, 429);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "too_large", message: "서명 그림이 너무 큽니다. 지우고 다시 그려 주세요." }, 413);
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "invalid_json" }, 400);
  if (!isTokenShape(body.token)) return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다." }, 404);
  const path = `${COLLECTION}/${body.token}`;

  let snap: Awaited<ReturnType<typeof getDocWithTime>>;
  try {
    snap = await getDocWithTime(env, path);
  } catch {
    return json({ ok: false, error: "lookup_failed", message: "잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!snap) return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다." }, 404);
  const c = toContract(snap.data);

  const r = await checkSign(c, {
    name: body.name,
    birth: body.birth,
    addr: body.addr,
    image: body.image,
    agree: body.agree,
    hash: body.hash,
  });
  if (!r.ok) return json({ ok: false, error: r.code, message: r.message }, r.status);

  const signedAt = new Date().toISOString();
  let saved: boolean;
  try {
    // 읽은 뒤 누가 먼저 서명(또는 무효 처리)했으면 전제가 깨져 저장되지 않는다
    saved = await patchDocIfUnchanged(
      env,
      path,
      {
        status: "signed",
        signedAt,
        ...r.fields,
        signedIp: ip.slice(0, 60),
        signedUa: (request.headers.get("user-agent") ?? "").slice(0, 300),
      },
      snap.updateTime
    );
  } catch {
    return json({ ok: false, error: "save_failed", message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
  if (!saved) {
    return json({ ok: false, error: "already_signed", message: "이미 서명이 끝났거나 계약서가 바뀌었습니다. 새로고침해 확인해 주세요." }, 409);
  }

  const done = notifyOffice(env, { ...c, signedAt, signedName: r.fields.signedName }).catch(() => undefined);
  if (typeof waitUntil === "function") waitUntil(done);
  else await done;

  return json({ ok: true, signedAt, fee: c.fee });
};

/** 사무실 알림 — 중앙 접수함이 먼저, 접수함이 못 맡으면 종전 알림톡(문자 대체)을 비상용으로 */
async function notifyOffice(env: Env, c: ContractDoc): Promise<"inbox" | "alimtalk" | "failed"> {
  const kst = new Date(Date.parse(c.signedAt ?? "") + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
  const fee = c.fee > 0 ? `${c.fee.toLocaleString("ko-KR")}원` : "없음(0원)";
  const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
  const detail = [
    "[위임계약서 서명 완료]",
    `계약서: ${oneLine(c.title)}`,
    `착수금: ${fee} · 성공보수: ${oneLine(c.successFee || "없음")}`,
    `서명 시각: ${kst} (한국시간)`,
    c.fee > 0 ? "착수금 결제는 사이트에서 받지 않았습니다. 사무실이 따로 안내해 주세요." : "착수금이 없어 결제 단계 없이 끝났습니다.",
  ].join("\n");
  const link = "https://toesahero.com/admin/esign";

  if (env.LEAD_INBOX_TOKEN) {
    const res = await postLead(env.LEAD_INBOX_TOKEN, {
      site: "퇴사히어로",
      name: oneLine(c.signedName || c.clientName),
      phone: c.clientPhone,
      detail,
      source: "위임계약서 전자서명",
      link,
      alertTo: String(env.ALERT_TO_PHONE ?? "").replace(/[^0-9,]/g, ""),
      notify: true,
    });
    if (res.handled) return "inbox";
  }
  const sms = await sendAlimtalk(
    env,
    KAKAO_TPL.intake,
    { "#{유형}": "위임계약서 서명 완료", "#{사건}": oneLine(c.clientName), "#{경로}": "전자서명", "#{내용}": detail },
    `[퇴사히어로] 위임계약서 서명 완료\n■ ${oneLine(c.clientName)} / ${c.clientPhone}\n${detail}\n▶ ${link}`
  );
  return sms.ok ? "alimtalk" : "failed";
}
