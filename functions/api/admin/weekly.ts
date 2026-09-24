// 접수함 /api/admin/weekly — 주간 보고용 지표. 이미 저장된 Firestore 기록만 센다(조회 전용).
// 계약: ~/.antigravity/lead-inbox/admin-api-v2.md "주간 지표". 잴 수 없는 값은 빼거나 null(추정 금지).
// - chat.conversations: null. 히로 대화는 서버에 남지 않고(chat.ts 무상태) 전달 동의한 대화만 chat_messages 에 남아 전체 대화 수를 알 수 없다.
// - ai: 비움. AI 호출 기록을 저장하지 않는다.
import { fsClient, type FsRow } from "../_firestore";
import { checkAdmin, json, str, upstreamError, utc, type AdminApiEnv } from "../_adminApi";

const TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const LIMIT = 1000;

/** 최신순 목록이 기간 시작보다 오래된 문서까지 닿았는지. 닿지 않았으면(한도에 걸림) 기간 전체를 다 봤다고 할 수 없다. */
function covers(rows: FsRow[], field: string, since: string): boolean {
  if (rows.length < LIMIT) return true;
  const oldest = utc(rows[rows.length - 1].data[field]);
  return !!oldest && oldest < since;
}

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const since = q.get("since") ?? "";
  const until = q.get("until") ?? "";
  if (!TS_RE.test(since) || !TS_RE.test(until) || since >= until) {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  const inRange = (v: unknown) => {
    const t = utc(v);
    return !!t && t >= since && t < until;
  };
  try {
    // 접수함은 8초만 기다린다. 그보다 늦으면 빈 값 대신 오류로 끝낸다.
    const [cases, orders, pending] = await Promise.race([
      (async () => {
        const fs = await fsClient(env);
        return Promise.all([
          fs.query("consultations", { orderDesc: "createdAt", limit: LIMIT }),
          fs.query("orders", { orderDesc: "approvedAt", limit: LIMIT }),
          fs.query("consultations", { eq: ["draftStatus", "pending_review"], limit: 200 }),
        ]);
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 7000)),
    ]);

    // 챗봇에서 넘어온 접수 — 같은 대화가 여러 문서로 갱신되므로 대화(세션) 단위로 센다.
    let leads: number | null = null;
    if (covers(cases, "createdAt", since)) {
      const keys = new Set<string>();
      for (const c of cases) {
        if (c.data.source !== "chat" || !inRange(c.data.createdAt)) continue;
        keys.add(str(c.data.sessionId, 64) || c.id);
      }
      leads = keys.size;
    }

    const notes: string[] = [];
    // 결제 — 기간에 승인된 주문. 승인 시각 최신순으로 받는다(승인 전 주문은 approvedAt 이 없어 빠진다).
    if (covers(orders, "approvedAt", since)) {
      const paid = orders.filter((o) => o.data.status === "paid" && inRange(o.data.approvedAt));
      const sum = paid.reduce((a, o) => a + (Number(o.data.amount) || 0), 0);
      notes.push(`결제 완료 ${paid.length}건(합계 ${sum.toLocaleString("ko-KR")}원)`);
    }
    // 변호사 검토를 기다리는 서면 초안 — 기간과 무관한 지금 시점 값.
    if (pending.length) notes.push(`서면 초안 검토 대기 ${pending.length}건${pending.length >= 200 ? " 이상" : ""}(보고 시점)`);

    return json({ ok: true, chat: { conversations: null, leads }, ai: {}, notes });
  } catch (e) {
    return upstreamError("weekly", e);
  }
};
