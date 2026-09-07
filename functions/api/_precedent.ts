// 법제처 판례 OPEN API — 공식 판례를 실시간 조회한다(판시사항·판결요지·참조조문 원문).
//
// 왜 프록시를 경유하는가: 법제처는 **호출자 IP**로 사용자를 검증한다(Referer/Origin 위장은 통하지 않는다).
// Cloudflare Pages는 나가는 IP가 유동적이라 등록이 불가능하므로, 이미 법제처에 주소가 등록된
// 고정 IP 프록시(api.law-caddy.com)를 통해 호출한다. 이 프록시는 그대로 법제처로 넘겨준다.
//
// 로캐디 판례DB(_lawcaddy.ts)와 역할이 다르다:
//   - 이쪽(법제처): 사건번호·법원·선고일이 **공식 확인된** 판례. 인용 안전. 다만 키워드 매칭이 엄격하다.
//   - 저쪽(로캐디DB): 하급심 판결문까지 폭넓게. 사실관계 유사 검색에 강하다.
// 초안 엔진은 둘을 함께 쓴다.

const OC = "jeonwoochul0515";
const BASE = "http://api.law-caddy.com/DRF";
const TIMEOUT_MS = 12_000;

export interface Precedent {
  caseNumber: string;
  court: string;
  date: string; // YYYY-MM-DD
  name: string; // 사건명
  keyPoints?: string; // 판시사항
  summary?: string; // 판결요지
  refStatutes?: string; // 참조조문
}

const clean = (v: unknown): string =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** 20250909 → 2025-09-09 형태로 */
function fmtDate(v: unknown): string {
  const s = String(v ?? "").replace(/\D/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : "";
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const body = await res.text();
    if (!body.trim().startsWith("{")) return null; // 검증 실패 시 HTML이 온다
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * 판례 검색 — 법제처는 질의를 엄격히 매칭해서 "부당해고 퇴직금"처럼 두 단어를 붙이면 0건이 나온다.
 * 그래서 한 단어씩 던져 합친다.
 */
export async function searchPrecedents(
  keywords: string[],
  limit = 3
): Promise<Precedent[]> {
  const seen = new Set<string>();
  const out: Precedent[] = [];

  for (const kw of keywords) {
    if (out.length >= limit) break;
    const url =
      `${BASE}/lawSearch.do?OC=${OC}&target=prec&type=JSON` +
      `&query=${encodeURIComponent(kw)}&display=5`;
    const j = await getJson(url);
    const search = (j?.PrecSearch ?? j) as Record<string, unknown> | undefined;
    const rows = ([] as Record<string, unknown>[]).concat(
      (search?.prec as Record<string, unknown>[] | Record<string, unknown> | undefined) ?? []
    );
    for (const p of rows) {
      if (out.length >= limit) break;
      const caseNumber = clean(p["사건번호"]);
      if (!caseNumber || seen.has(caseNumber)) continue;
      seen.add(caseNumber);
      const id = clean(p["판례일련번호"]);
      const detail = id
        ? await getJson(`${BASE}/lawService.do?OC=${OC}&target=prec&type=JSON&ID=${id}`)
        : null;
      const d = ((detail?.PrecService ?? detail) ?? {}) as Record<string, unknown>;
      out.push({
        caseNumber,
        court: clean(p["법원명"]),
        date: fmtDate(p["선고일자"]),
        name: clean(p["사건명"]),
        keyPoints: clean(d["판시사항"]).slice(0, 900) || undefined,
        summary: clean(d["판결요지"]).slice(0, 900) || undefined,
        refStatutes: clean(d["참조조문"]).slice(0, 300) || undefined,
      });
    }
  }
  return out;
}

/** 초안 프롬프트에 넣을 블록 — 법제처 확인분이라 사건번호를 그대로 인용해도 안전하다 */
export function formatPrecedents(list: Precedent[]): string {
  if (!list.length) return "(법제처 조회 결과 없음)";
  return list
    .map((p) => {
      const head = `- ${[p.court, p.date, p.caseNumber].filter(Boolean).join(" ")} ${p.name}`;
      const body = [
        p.keyPoints ? `  판시사항: ${p.keyPoints}` : "",
        p.summary ? `  판결요지: ${p.summary}` : "",
        p.refStatutes ? `  참조조문: ${p.refStatutes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return body ? `${head}\n${body}` : head;
    })
    .join("\n");
}
