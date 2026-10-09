// 관리자 전자계약 API — POST /api/esign/admin {action}. 기존 관리자 인증(Firebase ID 토큰 + admins 문서)을 그대로 쓴다.
// action: create(계약서 만들기) · list(목록) · get(서명본 전체) · void(무효, 서명 전만) · sms(손님에게 서명 요청 문자)
// 보낸 계약서를 고치는 action 은 일부러 없다 — 조건이 바뀌면 무효로 돌리고 새로 만든다(_esign.ts 머리 주석).

import {
  createDoc,
  fsClient,
  getDocWithTime,
  patchDoc,
  patchDocIfUnchanged,
} from "../_firestore";
import { requireAdmin, type AdminAuthEnv } from "../_admin-auth";
import { auditLog } from "../_guard";
import { sendLms, type NotifyEnv } from "../_notify";
import {
  COLLECTION,
  buildContract,
  clientSmsText,
  isExpired,
  isQuietHourKst,
  isTokenShape,
  json,
  signLink,
  toContract,
  validateNew,
} from "../_esign";

type Env = AdminAuthEnv & NotifyEnv;

const LIST_FIELDS = [
  "token", "title", "fee", "successFee", "hash", "clientName", "clientPhone", "status",
  "createdAt", "expiresAt", "signedAt", "signedName", "voidedAt", "smsSentAt",
];

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (!admin.ok) return json({ ok: false, error: admin.error, message: admin.message }, admin.status);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "invalid_json" }, 400);

  // 관리자 접속기록 — 계약서(의뢰인 이름·연락처) 열람·생성·무효·문자 발송을 한 줄씩 남긴다.
  await auditLog(env, request, {
    action: `esign-${String(body.action ?? "").slice(0, 20)}`,
    target: typeof body.token === "string" ? body.token.slice(0, 8) : null,
    via: "esign-admin",
  });

  try {
    switch (body.action) {
      case "create": {
        const v = validateNew(body);
        if (!v.ok) return json({ ok: false, error: "invalid", message: v.message }, 400);
        const c = await buildContract(v.value, admin.uid);
        await createDoc(env, COLLECTION, c.token, {
          token: c.token,
          title: c.title,
          body: c.body,
          fee: c.fee,
          successFee: c.successFee,
          hash: c.hash,
          clientName: c.clientName,
          clientPhone: c.clientPhone,
          status: c.status,
          createdAt: c.createdAt,
          expiresAt: c.expiresAt,
          createdBy: admin.uid,
        });
        return json({ ok: true, token: c.token, link: signLink(c.token), hash: c.hash, expiresAt: c.expiresAt });
      }

      case "list": {
        const fs = await fsClient(env);
        // 단순화: 최근 200건만 본다. 계약서가 200건을 넘으면 쪽 나누기를 붙인다.
        const rows = await fs.query(COLLECTION, { orderDesc: "createdAt", limit: 200, select: LIST_FIELDS });
        const now = Date.now();
        return json({
          ok: true,
          contracts: rows.map((r) => {
            const c = toContract(r.data);
            return {
              token: c.token, title: c.title, fee: c.fee, successFee: c.successFee, hash: c.hash,
              clientName: c.clientName, clientPhone: c.clientPhone, status: c.status,
              expired: c.status === "sent" && isExpired(c, now),
              createdAt: c.createdAt, expiresAt: c.expiresAt, signedAt: c.signedAt,
              signedName: c.signedName, voidedAt: c.voidedAt, smsSentAt: c.smsSentAt,
              link: signLink(c.token),
            };
          }),
        });
      }

      case "get": {
        if (!isTokenShape(body.token)) return json({ ok: false, error: "not_found" }, 404);
        const snap = await getDocWithTime(env, `${COLLECTION}/${body.token}`);
        if (!snap) return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다." }, 404);
        const c = toContract(snap.data);
        return json({ ok: true, contract: { ...c, expired: c.status === "sent" && isExpired(c), link: signLink(c.token) } });
      }

      case "void": {
        if (!isTokenShape(body.token)) return json({ ok: false, error: "not_found" }, 404);
        const path = `${COLLECTION}/${body.token}`;
        const snap = await getDocWithTime(env, path);
        if (!snap) return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다." }, 404);
        const c = toContract(snap.data);
        // 서명이 끝난 계약서는 무효로 돌리지 않는다 — 이미 효력이 생긴 문서다
        if (c.signedAt || c.status !== "sent") {
          return json({ ok: false, error: "not_voidable", message: "서명 전 계약서만 무효로 돌릴 수 있습니다." }, 409);
        }
        const ok = await patchDocIfUnchanged(env, path, { status: "void", voidedAt: new Date().toISOString() }, snap.updateTime);
        if (!ok) return json({ ok: false, error: "conflict", message: "그사이 상태가 바뀌었습니다. 목록을 새로고침해 주세요." }, 409);
        return json({ ok: true });
      }

      case "sms": {
        if (!isTokenShape(body.token)) return json({ ok: false, error: "not_found" }, 404);
        const path = `${COLLECTION}/${body.token}`;
        const snap = await getDocWithTime(env, path);
        if (!snap) return json({ ok: false, error: "not_found", message: "계약서를 찾을 수 없습니다." }, 404);
        const c = toContract(snap.data);
        if (c.status !== "sent" || c.signedAt) return json({ ok: false, error: "not_sendable", message: "서명 대기 중인 계약서만 보낼 수 있습니다." }, 409);
        if (isExpired(c)) return json({ ok: false, error: "expired", message: "서명 기한이 지났습니다. 새로 만들어 보내 주세요." }, 409);
        if (isQuietHourKst()) {
          return json({
            ok: false,
            error: "quiet_hours",
            message: "지금은 밤 9시~아침 8시라 보내지 않았습니다. 아침 8시 이후에 다시 누르거나 링크를 직접 전달해 주세요.",
          }, 409);
        }
        const claimed = typeof snap.data.smsClaimAt === "string" ? Date.parse(snap.data.smsClaimAt) : NaN;
        if (Number.isFinite(claimed) && Date.now() - claimed < 10 * 60_000) {
          return json({ ok: false, error: "recently_sent", message: "10분 안에 이미 보냈습니다. 잠시 뒤 다시 보내 주세요." }, 429);
        }
        // 보내기 전에 발송 권한을 먼저 잡는다 — 두 번 눌러도(동시 요청) 한 통만 나가게
        const got = await patchDocIfUnchanged(env, path, { smsClaimAt: new Date().toISOString() }, snap.updateTime);
        if (!got) return json({ ok: false, error: "conflict", message: "그사이 상태가 바뀌었습니다. 목록을 새로고침해 주세요." }, 409);
        const r = await sendLms(env, c.clientPhone, clientSmsText(c));
        if (!r.ok) {
          // 실패면 잠금을 풀어 바로 다시 누를 수 있게 한다(이 칸만 고치므로 서명 기록은 건드리지 않는다)
          await patchDoc(env, path, { smsClaimAt: null }).catch(() => undefined);
          return json({ ok: false, error: "sms_failed", message: `문자를 보내지 못했습니다(${r.reason ?? "원인 모름"}). 링크를 직접 전달해 주세요.` }, 502);
        }
        // 발송 기록 갱신 실패는 발송을 되돌리지 않는다
        await patchDoc(env, path, { smsSentAt: new Date().toISOString() }).catch(() => undefined);
        return json({ ok: true });
      }

      default:
        return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch {
    return json({ ok: false, error: "server_error", message: "처리 중 오류가 났습니다. 잠시 후 다시 시도해 주세요." }, 500);
  }
};
