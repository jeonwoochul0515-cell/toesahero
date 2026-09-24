// 중앙 접수함(lead-inbox) 전송 — 사무실 알림 문자는 접수함이 보내고, 사이트 알림은 비상용으로만 쓴다.
// 규칙: ~/.claude/reference/lead-sms-rule.md §3. 응답 alert가 queued·skipped면 사이트는 알림을 보내지 않는다.
// off·오류·8초 초과·비정상 응답이면 호출부가 종전 알림톡을 그대로 보낸다(접수 누락 방지).

export const LEAD_INBOX_URL = "https://lead-inbox.jeonwoochul0515.workers.dev/api/lead";

export type LeadInboxResult = {
  saved: boolean; // 접수함이 저장했는가(2xx + ok:true)
  handled: boolean; // 접수함이 알림을 맡았는가(queued·skipped) — true면 사이트 알림 생략
  alert?: string;
};

export async function postLead(
  token: string,
  payload: Record<string, unknown>,
  timeoutMs = 8000
): Promise<LeadInboxResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(LEAD_INBOX_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-token": token },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!resp.ok) return { saved: false, handled: false };
    const data = (await resp.json().catch(() => null)) as { ok?: unknown; alert?: unknown } | null;
    const saved = data?.ok === true;
    const alert = typeof data?.alert === "string" ? data.alert : undefined;
    return { saved, handled: saved && (alert === "queued" || alert === "skipped"), alert };
  } catch {
    return { saved: false, handled: false };
  } finally {
    clearTimeout(timer);
  }
}

// attribution.js가 저장한 첫 방문 정보에서 실제 검색어와 첫 방문 시각을 꺼낸다.
export function attrFields(raw: unknown): { query: string; firstVisit: string } {
  let attr: Record<string, Record<string, unknown>> | null = null;
  try {
    attr = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof attr);
  } catch {
    attr = null;
  }
  const first = (attr && typeof attr === "object" && (attr.first || attr.current)) || {};
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  return {
    query: s(first.n_query, 80) || s(first.utm_term, 80),
    firstVisit: toKst(s(first.at, 16)),
  };
}

// attribution.js의 at은 UTC "YYYY-MM-DD HH:MM"이다. 문자에는 한국시간으로 싣는다.
function toKst(at: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(at);
  if (!m) return at;
  const t = Date.parse(`${m[1]}T${m[2]}:00Z`);
  if (Number.isNaN(t)) return at;
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}

// 브라우저가 보낸 방문 횟수 — 정수 1~9999만 받는다.
export function visitNoOf(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : undefined;
}
