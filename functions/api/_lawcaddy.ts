// 로캐디(law-caddy) 판례·법령 검색 엔진 — 노동 도메인용. 사무실이 보낼 답변 초안의 근거를 모은다.
//
// 정본: hakpok119/functions/src/hyeran/lawcaddy.ts (Firebase Functions)
// 이 파일은 Cloudflare Pages Functions(Workers 런타임)용으로 옮긴 것이라
// `process.env` 대신 요청마다 넘겨받는 `env` 객체를 쓴다.
//
// 공용 엔진 / 사이트별 지식 구조:
//   - 검색 로직은 도메인 중립이다. 다른 서비스에 그대로 이식할 수 있다.
//   - 도메인 특화는 DOMAIN_TERMS·ANCHORS·RELEVANCE·STATUTE_LAWS 네 곳에만 둔다.
//
// 검색은 두 단계로 내려간다:
//   ① 하이브리드(의미+키워드) — Voyage 임베딩이 되면. 표현이 달라도 사실관계가 닮은 판례를 찾는다.
//   ② 전문검색(FTS)만 — 임베딩이 실패하면 자동 강등. 키가 죽어도 초안 생성은 멈추지 않는다.
// ⚠ 질의 임베딩 모델은 반드시 voyage-3다. 로캐디 DB가 그 모델로 색인돼 있어,
//    다른 모델과 섞으면 같은 1024차원이라도 좌표계가 달라 결과가 망가진다.

export interface LawcaddyEnv {
  LAWCADDY_SUPABASE_URL?: string;
  LAWCADDY_SUPABASE_KEY?: string;
  VOYAGE_API_KEY?: string;
}

export interface CaseHit {
  caseNumber: string; // 인용 가능한 실제 사건번호만(없으면 빈 문자열)
  court: string;
  date: string;
  summary: string;
  citable: boolean; // false면 내용은 참고하되 사건번호를 인용하면 안 된다
}

export interface StatuteHit {
  name: string;
  article: string;
  title: string;
  content: string;
}

// 실제 사건번호 형태(2022구합74270, 2015두1234 등). DB에는 lbox_39528·kb_prec_177324 같은
// 내부 식별자도 섞여 있어, 그대로 인용하면 존재하지 않는 판례를 인용하는 꼴이 된다.
const REAL_CASE_NO = /((?:19|20)\d{2}[가-힣]{1,4}\d+)/;

const supaUrl = (env: LawcaddyEnv) =>
  (env.LAWCADDY_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const supaKey = (env: LawcaddyEnv) => (env.LAWCADDY_SUPABASE_KEY ?? "").trim();

function headers(env: LawcaddyEnv): Record<string, string> {
  const k = supaKey(env);
  return { apikey: k, Authorization: `Bearer ${k}` };
}

async function rest<T>(env: LawcaddyEnv, path: string): Promise<T[]> {
  const url = supaUrl(env);
  if (!url || !supaKey(env)) return [];
  try {
    const res = await fetch(url + path, { headers: headers(env) });
    if (!res.ok) return [];
    const body = (await res.json()) as unknown;
    return Array.isArray(body) ? (body as T[]) : [];
  } catch {
    return [];
  }
}

/** 로캐디 DB와 같은 모델(voyage-3)로 질의를 임베딩한다. 실패하면 null → 키워드 검색으로 강등 */
async function embedQuery(env: LawcaddyEnv, text: string): Promise<number[] | null> {
  const key = (env.VOYAGE_API_KEY ?? "").trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: [text.slice(0, 2000)],
        model: "voyage-3",
        input_type: "query",
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { embedding: number[] }[] };
    return j.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/** 하이브리드 검색 RPC — 의미(벡터)와 키워드(FTS) 점수를 가중합해 정렬한다 */
async function hybridRpc<T>(
  env: LawcaddyEnv,
  rpc: string,
  params: Record<string, unknown>
): Promise<T[]> {
  const url = supaUrl(env);
  if (!url || !supaKey(env)) return [];
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: { ...headers(env), "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as unknown;
    return Array.isArray(body) ? (body as T[]) : [];
  } catch {
    return [];
  }
}

// ── 도메인 사전 — 여기부터 네 블록만 사이트별로 갈아끼운다 ──────────────────
// 대화에 등장하면 검색어로 승격되는 말들. 앞쪽이 더 강한 신호(먼저 채택된다).
const DOMAIN_TERMS: { term: string; aliases?: string[] }[] = [
  // 처분·조치 (가장 강한 신호 — 판례가 처분별로 갈린다)
  { term: "부당해고", aliases: ["해고무효"] },
  { term: "해고", aliases: ["해고통보", "해고예고"] },
  { term: "징계해고" },
  { term: "정리해고", aliases: ["경영상해고"] },
  { term: "권고사직" },
  { term: "징계", aliases: ["견책", "감봉", "정직", "해임", "파면"] },
  { term: "경고장", aliases: ["시말서", "경위서"] },
  { term: "대기발령" },
  { term: "전보", aliases: ["전직", "배치전환"] },
  // 임금
  { term: "임금체불", aliases: ["체불임금", "미지급임금"] },
  { term: "퇴직금", aliases: ["퇴직급여"] },
  { term: "연차수당", aliases: ["연차유급휴가", "미사용연차"] },
  { term: "주휴수당" },
  { term: "연장근로", aliases: ["시간외근로", "야간근로", "휴일근로"] },
  { term: "통상임금" },
  { term: "평균임금" },
  { term: "성과급", aliases: ["상여금", "인센티브"] },
  // 절차
  { term: "노동위원회", aliases: ["지노위", "중노위", "구제신청"] },
  { term: "노동청", aliases: ["고용노동부", "진정", "근로감독관"] },
  { term: "취업규칙", aliases: ["불이익변경"] },
  { term: "근로계약", aliases: ["근로계약서"] },
  // 괴롭힘·안전
  { term: "직장내괴롭힘", aliases: ["직장 내 괴롭힘", "괴롭힘"] },
  { term: "성희롱", aliases: ["직장내성희롱"] },
  { term: "산업재해", aliases: ["산재", "업무상재해", "요양급여"] },
  { term: "안전배려의무" },
  // 퇴사·고용형태
  { term: "사직", aliases: ["사직서", "사직의사", "퇴사"] },
  { term: "실업급여", aliases: ["구직급여", "이직확인서"] },
  { term: "기간제", aliases: ["계약직", "갱신기대권"] },
  { term: "수습", aliases: ["시용", "본채용거부"] },
  // 회사 측 청구
  { term: "손해배상", aliases: ["위약금", "위약예정"] },
  { term: "경업금지", aliases: ["겸업금지", "비밀유지"] },
];

// 대화 성격에 맞는 앵커를 고른다. 노동은 하위 분야가 넓어 앵커 하나로 묶으면
// 검색이 뭉개진다(학폭은 "학교폭력" 하나로 충분했던 것과 다른 점).
const ANCHORS: { test: RegExp; anchor: string }[] = [
  { test: /괴롭힘|따돌림|폭언|모욕|갑질/, anchor: "직장 내 괴롭힘" },
  { test: /해고|권고사직|계약만료|갱신|본채용/, anchor: "부당해고" },
  { test: /산재|업무상\s*재해|요양급여|산업재해|공상/, anchor: "업무상 재해" },
  { test: /퇴직금|퇴직급여/, anchor: "퇴직금" },
  { test: /임금|급여|수당|체불|성과급|상여/, anchor: "임금" },
  { test: /징계|견책|감봉|정직|경고장|시말서/, anchor: "징계처분" },
  { test: /경업|비밀유지|위약금|손해배상/, anchor: "근로자 손해배상" },
];
const DEFAULT_ANCHOR = "근로자";

function pickAnchor(text: string): string {
  for (const a of ANCHORS) if (a.test.test(text)) return a.anchor;
  return DEFAULT_ANCHOR;
}

// 이 도메인 판례가 맞는지 판정하는 최소 신호 — 의미 검색이 끌어온 무관한 판례를 걸러낸다.
const RELEVANCE = [
  "근로자",
  "사용자",
  "근로계약",
  "근로기준법",
  "임금",
  "해고",
  "퇴직",
  "퇴직금",
  "취업규칙",
  "노동위원회",
  "사업주",
  "직장 내 괴롭힘",
  "업무상 재해",
  "산업재해",
  "징계",
];

function isRelevant(text: string): boolean {
  return RELEVANCE.some((t) => text.includes(t));
}

/** 대화에서 검색 키워드를 뽑는다 — 도메인 사전에 걸리는 말만 승격(잡음 차단) */
export function extractTerms(text: string, max = 3): string[] {
  const hits: string[] = [];
  for (const d of DOMAIN_TERMS) {
    if (hits.length >= max) break;
    const words = [d.term, ...(d.aliases ?? [])];
    if (words.some((w) => text.includes(w))) hits.push(d.term);
  }
  return hits;
}

/**
 * websearch_to_tsquery는 공백을 AND로 본다 — 너무 많이 넣으면 0건이 되므로 2개까지만 묶는다.
 * citableOnly: 사건번호가 연도로 시작하는 행만(=인용 가능한 실제 판례). DB에 내부 식별자
 * (lbox_*, kb_prec_*)가 섞여 있어, 이 필터가 없으면 인용할 수 없는 자료만 잔뜩 잡힌다.
 */
function ftsPath(
  table: string,
  select: string,
  query: string,
  limit: number,
  citableOnly = false
): string {
  return (
    `/rest/v1/${table}?select=${encodeURIComponent(select)}` +
    `&fts=wfts(simple).${encodeURIComponent(query)}` +
    (citableOnly ? `&case_number=match.${encodeURIComponent("^(19|20)[0-9]{2}")}` : "") +
    `&limit=${limit}`
  );
}

interface CaseRow {
  case_number?: string;
  court?: string;
  case_date?: string;
  summary?: string;
  full_text?: string;
}

/** 판례 검색 — 앵커 + 도메인 키워드 조합으로 여러 번 던져 합친다 */
export async function searchCases(
  env: LawcaddyEnv,
  conversation: string,
  limit = 5
): Promise<CaseHit[]> {
  const anchor = pickAnchor(conversation);
  const terms = extractTerms(conversation, 3);
  // 키워드가 많을수록 AND로 좁아진다 — 넓은 질의부터 좁은 질의까지 섞어 던진다
  const queries = [
    ...terms.slice(0, 2).map((t) => `${anchor} ${t}`),
    terms.length >= 2 ? `${terms[0]} ${terms[1]}` : "",
    anchor,
  ].filter(Boolean);

  const seen = new Set<string>();
  const out: CaseHit[] = [];

  // 0차 — 의미 검색(하이브리드). 표현이 달라도 사실관계가 닮은 판례를 잡아낸다.
  // ⚠ 로캐디 cases는 voyage-4-large로 색인됐는데 질의는 voyage-3라 좌표계가 살짝 어긋난다.
  //   의미 점수만 믿으면 무관한 판례가 섞여 들어오므로 아래 관련성 검사로 걸러낸다.
  const emb = await embedQuery(env, conversation.slice(0, 1500));
  if (emb) {
    const hasCaseNo = REAL_CASE_NO.test(conversation);
    const rows = await hybridRpc<CaseRow>(env, "hybrid_search_cases", {
      query_text: [anchor, ...terms].join(" ").slice(0, 300),
      query_embedding: emb,
      match_count: 10,
      keyword_weight: hasCaseNo ? 0.7 : 0.5,
      semantic_weight: hasCaseNo ? 0.3 : 0.5,
    });
    for (const r of rows) {
      if (out.length >= limit) break;
      const raw = r.case_number ?? "";
      const body = (r.summary || r.full_text || "").replace(/\s+/g, " ").trim();
      if (!raw || body.length < 40) continue;
      const real = raw.match(REAL_CASE_NO)?.[1] ?? "";
      const court = r.court && r.court !== "미상" ? r.court : "";
      if (!real || !court) continue; // 의미 검색분은 인용 가능한 것만 취한다
      if (seen.has(real)) continue; // 같은 사건이 청크별로 여러 번 올라온다
      if (!isRelevant(body)) continue; // 이 도메인 판례가 맞는지 확인
      seen.add(real);
      out.push({
        caseNumber: real,
        court,
        date: String(r.case_date ?? "").slice(0, 10),
        summary: body.slice(0, 900),
        citable: true,
      });
    }
  }

  // 1차는 인용 가능한 판례만(실제 사건번호), 2차는 제한 없이 — 인용감을 먼저 확보하고 내용을 보탠다
  const passes: { q: string; citableOnly: boolean }[] = [
    ...queries.map((q) => ({ q, citableOnly: true })),
    ...queries.map((q) => ({ q, citableOnly: false })),
  ];
  for (const { q, citableOnly } of passes) {
    if (out.length >= limit) break;
    const rows = await rest<CaseRow>(
      env,
      ftsPath("cases", "case_number,court,case_date,summary,full_text", q, 6, citableOnly)
    );
    for (const r of rows) {
      const raw = r.case_number ?? "";
      const body = (r.summary || r.full_text || "").replace(/\s+/g, " ").trim();
      if (!raw || body.length < 40) continue;
      // src115_2022구합20619 처럼 접두어가 붙은 것에서도 실제 사건번호만 추출한다
      const real = raw.match(REAL_CASE_NO)?.[1] ?? "";
      const court = r.court && r.court !== "미상" ? r.court : "";
      const dedupe = real || raw;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push({
        caseNumber: real,
        court,
        date: String(r.case_date ?? "").slice(0, 10),
        summary: body.slice(0, 900),
        citable: Boolean(real && court),
      });
      if (out.length >= limit) break;
    }
  }
  // 인용 가능한 판례를 앞으로 — 초안이 근거로 쓸 때 우선 잡히게
  return out.sort((a, b) => Number(b.citable) - Number(a.citable));
}

interface StatuteRow {
  statute_name?: string;
  article_number?: string;
  article_title?: string;
  article_content?: string;
}

// 이 도메인의 근거 법률 — 대화 내용에 따라 필요한 법만 조회한다(이름 정확 조회라 환각이 없다)
const STATUTE_LAWS: { test: RegExp | null; law: string }[] = [
  { test: null, law: "근로기준법" }, // 항상
  { test: /퇴직금|퇴직급여|중간정산/, law: "근로자퇴직급여 보장법" },
  { test: /산재|업무상\s*재해|요양급여|산업재해|휴업급여/, law: "산업재해보상보험법" },
  { test: /실업급여|구직급여|이직확인서|고용보험/, law: "고용보험법" },
  { test: /성희롱|육아휴직|출산전후|남녀|차별/, law: "남녀고용평등과 일·가정 양립 지원에 관한 법률" },
  { test: /안전|보건|폭언|고객응대|감정노동/, law: "산업안전보건법" },
  { test: /기간제|계약직|단시간|갱신기대권/, law: "기간제 및 단시간근로자 보호 등에 관한 법률" },
];

// 사안 유형별로 실제로 걸리는 핵심 조문. 제목 매칭만으로는 노동법 조문 수가 많아
// 무관한 조문(생리휴가 등)이 앞에 오는 일이 있어, 이 표로 먼저 끌어올린다.
const KEY_ARTICLES: { test: RegExp; law: string; articles: string[] }[] = [
  { test: /해고|권고사직|계약만료|갱신|본채용/, law: "근로기준법", articles: ["제23조", "제26조", "제27조", "제28조", "제30조"] },
  { test: /징계|견책|감봉|정직|경고장|시말서/, law: "근로기준법", articles: ["제23조", "제93조", "제94조", "제95조"] },
  { test: /임금|급여|수당|체불|성과급|상여/, law: "근로기준법", articles: ["제2조", "제36조", "제43조", "제48조"] },
  { test: /괴롭힘|폭언|모욕|갑질|따돌림/, law: "근로기준법", articles: ["제76조의2", "제76조의3"] },
  { test: /고객|민원인|감정노동|폭언/, law: "산업안전보건법", articles: ["제41조"] },
  { test: /퇴직금|퇴직급여/, law: "근로자퇴직급여 보장법", articles: ["제4조", "제8조", "제9조"] },
  { test: /취업규칙|불이익변경/, law: "근로기준법", articles: ["제93조", "제94조"] },
];

/** 법령 조문 — 근거 법률을 이름으로 정확 조회한다(임베딩 불필요, 환각 차단) */
export async function fetchStatutes(
  env: LawcaddyEnv,
  conversation: string,
  limit = 6
): Promise<StatuteHit[]> {
  const laws = STATUTE_LAWS.filter((x) => !x.test || x.test.test(conversation))
    .map((x) => x.law)
    .slice(0, 3); // 너무 많으면 초안 프롬프트가 근거로 뭉개진다

  const out: StatuteHit[] = [];
  const terms = extractTerms(conversation, 6);
  for (const law of laws) {
    const rows = await rest<StatuteRow>(
      env,
      `/rest/v1/statutes?select=${encodeURIComponent(
        "statute_name,article_number,article_title,article_content"
      )}&statute_name=eq.${encodeURIComponent(law)}&limit=80`
    );
    // 이 사안에서 실제로 걸리는 핵심 조문 번호 - 있으면 가장 앞으로 끌어올린다
    const keyNos = new Set(
      KEY_ARTICLES.filter((k) => k.law === law && k.test.test(conversation)).flatMap(
        (k) => k.articles
      )
    );
    // 그다음은 제목이 대화 맥락과 겹치는 것부터
    const scored = rows
      .map((r) => {
        const title = r.article_title ?? "";
        const no = (r.article_number ?? "").replace(/\s/g, "");
        let score = terms.reduce((n, t) => n + (title.includes(t) ? 2 : 0), 0);
        if (keyNos.has(no)) score += 10;
        return { r, score };
      })
      // 핵심 조문을 아는 사안이면 무관한 조문은 아예 뺀다
      .filter((x) => x.score > 0 || keyNos.size === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    for (const { r } of scored) {
      out.push({
        name: r.statute_name ?? law,
        article: r.article_number ?? "",
        title: r.article_title ?? "",
        content: (r.article_content ?? "").replace(/\s+/g, " ").trim().slice(0, 700),
      });
    }
  }
  return out;
}

/** 초안 프롬프트에 넣을 근거 블록으로 조립
 *
 * 2026-08-28 실측 - 로캐디 DB의 사건번호는 형식이 맞아도 실재가 확인되지 않는다.
 *   초안이 인용한 "대법원 2011다42324"가 법제처 조회 결과에 나오지 않았다.
 *   => 로캐디 판례는 사실관계 참고용으로만 쓰고 출처 표시를 금지한다.
 *      사건번호를 밝혀 인용할 수 있는 것은 법제처 공식 판례(_precedent.ts)뿐이다.
 *   (검색된 판례가 그 사안에 맞는 법리인지는 변호사가 판단한다. 이 코드의 역할은
 *    확인되지 않은 출처가 초안에 인용되지 않게 막는 것까지다.)
 */
export function formatEvidence(cases: CaseHit[], statutes: StatuteHit[]): string {
  const s = statutes.length
    ? statutes.map((x) => `- ${x.name} ${x.article}(${x.title}): ${x.content}`).join("\n")
    : "(조회된 조문 없음 - 조문을 인용하지 말 것)";
  // citable 여부와 무관하게 사건번호/법원/날짜를 프롬프트에서 아예 뺀다.
  // "쓰지 말라"고 지시하는 것보다 애초에 주지 않는 편이 확실하다.
  const c = cases.length
    ? cases.map((x) => `- ${x.summary}`).join("\n")
    : "(조회된 유사 사례 없음)";
  return (
    `[근거 자료 - 법령 조문(법제처 원문)]\n${s}\n\n` +
    `[참고 자료 - 유사 사안의 판결문 내용(로캐디 판례DB)]\n` +
    `※ 아래는 사건번호와 법원이 확인되지 않은 자료다. 사실관계와 판단 흐름을 참고하는 용도로만 쓰고, ` +
    `출처(법원/선고일/사건번호)를 절대 적지 말 것. 판례를 인용하려면 위 [법제처 공식 판례] 블록에 ` +
    `있는 것만 쓸 수 있다.\n${c}`
  );
}
