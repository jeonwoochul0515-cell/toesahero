// 보관 기한 지난 자료 정리 — POST /api/admin/retention (관리자 열쇠 필요, 매달 GitHub Actions 가 부른다).
// 기준(2026-10-05 사무소 결정): 수임 안 된 상담 1년, 수임 사건은 종결 뒤 1년, 방문 기록·문자 원문 1년.
// 기본은 꺼짐 — 지울 대상의 건수만 세어 돌려주고 로그에 남긴다. Cloudflare 환경변수
// RETENTION_DELETE_ENABLED=true 일 때만 실제로 지운다(대표 최종 확인 뒤 켠다).
// 일부러 지우지 않는 것: 수임·종료·결제된 상담(종결일을 알 수 없어 사람이 판단), 결제 주문(orders),
// 전자계약, 증거 파일(case_files·Storage), 관리자 접속기록(2년 보관).

import { fsClient, serviceAuth } from "../_firestore";
import { checkAdmin, json, upstreamError, type AdminApiEnv } from "../_adminApi";

interface Env extends AdminApiEnv {
  RETENTION_DELETE_ENABLED?: string;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
// 단순화: 한 번에 1000건까지만 본다(이어 보기 표시 없음). 1년 지난 "남겨 둘" 상담이 1000건을 넘으면
// 그 뒤 문서를 못 보게 되므로, 그때는 이어 보기(커서)를 붙인다.
const SCAN_LIMIT = 1000;
const OPEN_STATUSES = new Set(["new", "contacted", "consulted", ""]);

type Row = { name: string; updateTime: string; data: Record<string, unknown> };

async function olderThan(token: string, base: string, col: string, cutoffIso: string, fields: string[]): Promise<Row[]> {
  const resp = await fetch(`${base}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: col }],
        where: { fieldFilter: { field: { fieldPath: "createdAt" }, op: "LESS_THAN", value: { timestampValue: cutoffIso } } },
        select: { fields: fields.map((fieldPath) => ({ fieldPath })) },
        limit: SCAN_LIMIT,
      },
    }),
  });
  if (!resp.ok) throw new Error(`runQuery ${col} 실패: ${resp.status}`);
  const rows = (await resp.json()) as Array<{
    document?: { name: string; updateTime?: string; fields?: Record<string, Record<string, unknown>> };
  }>;
  return rows
    .filter((r) => r.document)
    .map((r) => {
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r.document!.fields ?? {})) data[k] = Object.values(v)[0];
      return { name: r.document!.name, updateTime: String(r.document!.updateTime ?? ""), data };
    });
}

function consultationExpired(d: Record<string, unknown>, cutoff: number): boolean {
  const status = typeof d.status === "string" ? d.status : "";
  if (!OPEN_STATUSES.has(status)) return false; // 수임·종료 건은 사람이 판단
  if (d.paymentStatus || d.packageId) return false; // 결제·패키지가 걸린 건은 남긴다
  // updatedAt 이 없으면 서버에서 바뀐 적이 없는 건(나이는 createdAt 으로 이미 걸렀다).
  // 있는데 읽을 수 없으면 남긴다.
  if (d.updatedAt == null) return true;
  const updated = typeof d.updatedAt === "string" ? Date.parse(d.updatedAt) : NaN;
  return updated < cutoff;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const enabled = (env.RETENTION_DELETE_ENABLED ?? "").trim() === "true";
  const cutoff = Date.now() - YEAR_MS;
  const cutoffIso = new Date(cutoff).toISOString();
  try {
    const { token, base } = await serviceAuth(env);
    const fs = await fsClient(env);

    const cons = await olderThan(token, base, "consultations", cutoffIso, ["status", "updatedAt", "paymentStatus", "packageId", "sessionId"]);
    const consDel = cons.filter((r) => consultationExpired(r.data, cutoff));
    const consKept = cons.length - consDel.length;

    // 대화는 그 대화로 만들어진 상담이 하나라도 남아 있으면(수임·종료·결제 등) 함께 남긴다.
    const msgs = await olderThan(token, base, "chat_messages", cutoffIso, ["sessionId"]);
    // 단순화: 요청 하나가 부를 수 있는 바깥 호출 수에 한도가 있어 한 번에 대화 40개까지만 확인한다.
    // 확인 못 한 대화는 이번에는 남기고 다음 달 실행에서 본다.
    const keepSession = new Map<string, boolean>();
    const sids = [...new Set(msgs.map((m) => String(m.data.sessionId ?? "")).filter(Boolean))].slice(0, 40);
    for (const sid of sids) {
      const linked = await fs.query("consultations", { eq: ["sessionId", sid], limit: 50, select: ["status", "updatedAt", "paymentStatus", "packageId", "createdAt"] });
      // 50건을 꽉 채워 받았으면 못 본 상담이 더 있을 수 있어 남긴다.
      keepSession.set(
        sid,
        linked.length >= 50 ||
        linked.some((c) => {
          // 생성일이 없거나 읽을 수 없으면 1년 지났다고 볼 수 없어 남긴다.
          const created = typeof c.data.createdAt === "string" ? Date.parse(c.data.createdAt) : NaN;
          return !(created < cutoff) || !consultationExpired(c.data, cutoff);
        })
      );
    }
    const msgDel = msgs.filter((m) => {
      const sid = String(m.data.sessionId ?? "");
      return sid ? keepSession.get(sid) === false : true;
    });

    const summary = {
      cutoff: cutoffIso,
      enabled,
      consultations: { expired: consDel.length, keptForReview: consKept, scanned: cons.length },
      chat_messages: { expired: msgDel.length, scanned: msgs.length },
      scanLimit: SCAN_LIMIT,
    };
    console.log("[retention]", JSON.stringify(summary));

    let deleted = 0;
    if (enabled) {
      // 상담은 조회했을 때 그대로일 때만 지운다(그사이 수임·결제로 바뀌었으면 Firestore 가 거절한다).
      // 대화 메시지는 고쳐지지 않는 기록이라 조건 없이 지운다.
      const writes = [
        ...consDel.map((r) => ({ delete: r.name, currentDocument: { updateTime: r.updateTime } })),
        ...msgDel.map((r) => ({ delete: r.name })),
      ];
      for (let i = 0; i < writes.length; i += 400) {
        const resp = await fetch(`${base}:batchWrite`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ writes: writes.slice(i, i + 400) }),
        });
        if (!resp.ok) throw new Error(`batchWrite 삭제 실패: ${resp.status}`);
        const out = (await resp.json()) as { status?: Array<{ code?: number }> };
        deleted += (out.status ?? []).filter((st) => !st.code).length;
      }
      console.log("[retention] 삭제", deleted);
    }
    return json({ ok: true, ...summary, deleted });
  } catch (e) {
    return upstreamError("retention", e);
  }
};
