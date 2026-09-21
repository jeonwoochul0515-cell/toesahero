// 히로 대화 운영 정책(호객꾼 §6) — 정형 메시지 잠금과 세션 기록을 한곳에 모은다.
// 화면 위젯(HiroChat)과 대화창(ChatModal)은 서로 다른 시점에만 살아 있으므로,
// 상태는 컴포넌트가 아니라 탭 세션 저장소에 둔다 — 대화창이 닫혀도 잠금이 유지된다(§6-1).

const KEY_PENDING = "hiro:pendingQ";

// 답을 못 받은 채 이만큼 지나면 잠금을 푼다. 호객꾼의 유일한 고장은 침묵이다(헌장 제1조) —
// 손님이 대화창을 닫고 떠난 질문 하나 때문에 남은 방문 내내 히로가 조용해지면 안 된다.
// 윤창우 사고(2026-09-10)의 끼어듦은 질문 직후 수초~수십초 안에 일어났으므로 이 상한은 충분히 길다.
const LOCK_MAX_MS = 10 * 60 * 1000;

function session(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    // 사생활 보호 모드 등 — 잠금 없이 동작한다(침묵보다 끼어듦이 낫다는 뜻이 아니라,
    // 저장소가 없는 환경에서 기능 전체를 멈추지 않기 위함)
    return null;
  }
}

/** 히로의 발화가 질문인가 — 물음표로 끝나면 질문으로 본다(끝의 이모지·문장부호는 무시). */
export function isQuestion(text: string): boolean {
  return /\?$/.test(String(text ?? "").replace(/[^0-9A-Za-z가-힣?]+$/u, ""));
}

/** 히로가 질문을 던졌다 — 답을 받을 때까지 정형 메시지 큐를 잠근다. */
export function notePendingQuestion(text: string) {
  const s = session();
  if (!s) return;
  try {
    s.setItem(KEY_PENDING, JSON.stringify({ q: String(text).slice(0, 300), at: Date.now() }));
  } catch {
    /* 저장 실패 무시 */
  }
}

/** 손님이 답했다(또는 질문이 아닌 발화가 이어졌다) — 잠금을 푼다. */
export function noteAnswered() {
  const s = session();
  if (!s) return;
  try {
    s.removeItem(KEY_PENDING);
  } catch {
    /* 무시 */
  }
}

/** 답을 못 받은 히로의 마지막 질문. 없으면 null. 접수의 「미회수 질문」에 쓴다(§6-6). */
export function pendingQuestion(): string | null {
  const s = session();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY_PENDING);
    if (!raw) return null;
    const v = JSON.parse(raw) as { q?: string; at?: number };
    return typeof v.q === "string" && v.q ? v.q : null;
  } catch {
    return null;
  }
}

/**
 * 지금 정형 메시지(화면 안내·재접속 인사·쿨다운 만료 말걸기 등)를 내보내도 되는가.
 * 히로가 던진 질문의 답을 기다리는 중이면 false — 손님이 답을 쓰려는 순간을 덮지 않는다(§6-1).
 */
export function formalBlocked(): boolean {
  const s = session();
  if (!s) return false;
  try {
    const raw = s.getItem(KEY_PENDING);
    if (!raw) return false;
    const v = JSON.parse(raw) as { at?: number };
    const at = typeof v.at === "number" ? v.at : 0;
    return Date.now() - at < LOCK_MAX_MS;
  } catch {
    return false;
  }
}

// ── 접수 장부(§6-2 슬롯 · §6-3 세션당 1회 · §6-4 알림 억제 · §6-6 미회수 질문 · §6-7 절박 신호) ──
// 여기 함수들은 대화 배열만 보고 판단하는 순수 함수이거나 저장소 한 칸을 읽고 쓰는 정도다.
// 접수함(lead-inbox)은 이미 "사이트:세션id" 키로 기존 행을 갱신하도록 되어 있으므로,
// 사이트가 해야 할 일은 그 키를 보내는 것과 손님 상황을 장부에 알아볼 수 있게 적는 것뿐이다.

const KEY_VISITS = "hiro:visits"; // 브라우저에 남는 방문 횟수(재방문 판별 — 탭 세션이 아니라 기기 기준)
const KEY_VISIT_MARKED = "hiro:visit:marked"; // 이 탭 세션에서 이미 한 번 셌는지
const KEY_ONCE = "hiro:once:"; // 세션당 1회 정형 안내(§6-3)
const KEY_ALERTED = "hiro:alerted:"; // 세션별 마지막 알림 문자에 실렸던 내용(§6-4)

export type PolicyMsg = { who: "me" | "them"; text: string };

function local(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** 이 고정 안내를 이번 대화에서 이미 내보냈는가(§6-3). 저장소가 없으면 막지 않는다 — 침묵보다 중복이 낫다. */
export function usedOnce(key: string): boolean {
  const s = session();
  if (!s) return false;
  try {
    return !!s.getItem(KEY_ONCE + key);
  } catch {
    return false;
  }
}

/** 고정 안내를 실제로 내보낸 뒤에만 기록한다 — 막혀서 못 나간 안내를 "했음"으로 적지 않는다. */
export function markOnce(key: string) {
  const s = session();
  if (!s) return;
  try {
    s.setItem(KEY_ONCE + key, "1");
  } catch {
    /* 무시 */
  }
}

/** 이 방문을 한 번 센다(탭 세션당 1회). 돌려주는 값이 이 기기의 누적 방문 횟수다(§6-7). */
export function noteVisit(): number {
  const l = local();
  const s = session();
  if (!l) return 1;
  try {
    let n = parseInt(l.getItem(KEY_VISITS) || "0", 10) || 0;
    if (!s?.getItem(KEY_VISIT_MARKED)) {
      n += 1;
      l.setItem(KEY_VISITS, String(n));
      s?.setItem(KEY_VISIT_MARKED, "1");
    }
    return n || 1;
  } catch {
    return 1;
  }
}

/** 이 기기의 누적 방문 횟수(세는 것은 noteVisit이 한다). */
export function visitCount(): number {
  const l = local();
  if (!l) return 1;
  try {
    return parseInt(l.getItem(KEY_VISITS) || "1", 10) || 1;
  } catch {
    return 1;
  }
}

/** 22~05시 접수인가 — 가장 절박한 손님의 시간대다(헌장 서문 · §6-7). */
export function isLateNight(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= 22 || h < 5;
}

// 손님 말에서 찾아내는 쟁점. 새 쟁점이 붙으면 그때만 알림 문자를 한 통 더 보낸다(§6-4).
const ISSUES: Array<[string, RegExp]> = [
  ["퇴직금", /퇴직금/],
  ["임금체불", /임금\s*체불|월급\s*(안|못)\s*(주|받)|체불|급여\s*미지급/],
  ["부당해고", /해고|잘렸|짤렸|권고사직/],
  ["직장내괴롭힘", /괴롭힘|갑질|폭언|따돌림|모욕/],
  ["손해배상위협", /손해\s*배상|손배|위약금|배상\s*청구|물어내/],
  ["연차수당", /연차|휴가\s*수당/],
  ["실업급여", /실업\s*급여|구직\s*급여/],
  ["계약서조항", /계약서|근로계약|조항|서약서|각서/],
  ["산재", /산재|업무상\s*재해|다쳤/],
  ["성희롱", /성희롱|성추행/],
];

/** 손님 발화에서 찾은 쟁점 목록. 순서는 위 표 순서로 안정적이다. */
export function issuesFrom(msgs: PolicyMsg[]): string[] {
  const said = msgs.filter((m) => m.who === "me").map((m) => m.text).join("\n");
  return ISSUES.filter(([, re]) => re.test(said)).map(([name]) => name);
}

/**
 * 이미 받은 답(슬롯) — 히로가 같은 질문을 두 번 묻지 않게 서버 프롬프트에 실어 보낸다(§6-2).
 * 손님이 말한 표현을 그대로 옮겨, 되묻지 말고 확인형으로 쓰게 한다.
 */
export function slotsFrom(
  msgs: PolicyMsg[],
  known: { name?: string; contactSaved?: boolean } = {}
): string[] {
  const said = msgs.filter((m) => m.who === "me").map((m) => m.text).join("\n");
  const out: string[] = [];
  if (known.name?.trim()) out.push(`성함 ${known.name.trim()}`);
  if (known.contactSaved) out.push("회신 연락처 접수 완료");

  const size = said.match(/5\s*인\s*(미만|이상)|[0-9]{1,4}\s*명/);
  if (size) out.push(`회사 규모 "${size[0].trim()}"`);

  const evidence = [
    "카톡", "녹취", "녹음", "문자", "이메일", "메일",
    "급여명세", "근로계약서", "사진", "진단서", "목격자", "통장",
  ].filter((w) => said.includes(w));
  if (evidence.length) out.push(`보유 자료 "${evidence.slice(0, 5).join(", ")}"`);

  const reason = ["권고사직", "해고", "괴롭힘", "임금체불", "계약만료", "자진퇴사"].filter((w) =>
    said.includes(w)
  );
  if (reason.length) out.push(`퇴사·분쟁 사유 "${reason.slice(0, 3).join(", ")}"`);

  const when = said.match(/(마지막\s*출근|퇴사\s*(일|날짜|예정)|재직\s*중)/);
  if (when) out.push(`시점 "${when[0].trim()}"`);
  return out;
}

/**
 * 접수 맨 위에 붙는 머리말 — 회신하는 사람이 열자마자 무엇부터 물어야 하는지 알게 한다.
 * 「미회수 질문」(§6-6)과 심야·재방문 표시(§6-7)를 담는다.
 */
export function ledgerHead(opts: {
  unanswered?: string | null;
  lateNight?: boolean;
  visits?: number;
}): string {
  const lines: string[] = [];
  if (opts.unanswered) lines.push(`「미회수 질문」 ${opts.unanswered}`);
  const marks: string[] = [];
  if (opts.lateNight) marks.push("심야");
  if ((opts.visits ?? 1) >= 2) marks.push(`재방문 ${opts.visits}회`);
  if (marks.length) lines.push(`「표시」 ${marks.join(" · ")}`);
  return lines.join("\n");
}

/** 접수함 목록에 뜨는 한 줄 판정 — "사건/정보/불명 · 단계 · 근거"(2026-09-17 intent 칸). */
export function intentOf(opts: {
  issues: string[];
  userChars: number;
  contactSaved: boolean;
  lateNight: boolean;
  visits: number;
}): string {
  const kind =
    opts.issues.length && opts.userChars >= 40
      ? "사건"
      : opts.issues.length || opts.userChars >= 40
        ? "정보"
        : "불명";
  const stage = opts.contactSaved ? "연락처 접수" : "대화만";
  const why: string[] = [];
  if (opts.issues.length) why.push(opts.issues.slice(0, 3).join("·"));
  if (opts.lateNight) why.push("심야");
  if (opts.visits >= 2) why.push(`재방문 ${opts.visits}회`);
  return [kind, stage, ...why].join(" · ").slice(0, 120);
}

type SentAlert = { name?: string; phone?: string; issues?: string[] };
export type AlertState = {
  sessionId: string | null;
  name: string;
  phone: string;
  issues: string[];
};

function lastAlerted(sessionId: string | null): SentAlert | null {
  const s = session();
  if (!s || !sessionId) return null;
  try {
    const raw = s.getItem(KEY_ALERTED + sessionId);
    return raw ? (JSON.parse(raw) as SentAlert) : null;
  } catch {
    return null;
  }
}

/**
 * 이번 대화록 보고에 새 알림 문자를 실을 것인가(§6-4).
 * ①최초 접수 ②성함·연락처가 새로 확보된 때 ③마지막 알림 이후 새 쟁점이 붙은 때만 true.
 * 스냅샷마다 문자를 쏘면 담당자가 알림을 무시하게 되고, 그때부터 접수함은 장부가 아니다.
 */
export function alertNeeded(now: AlertState): boolean {
  if (!session() || !now.sessionId) return true; // 판단 근거가 없으면 알린다 — 누락보다 중복이 낫다
  const prev = lastAlerted(now.sessionId);
  if (!prev) return true;
  if (now.name && now.name !== prev.name) return true;
  if (now.phone && now.phone !== prev.phone) return true;
  return now.issues.some((i) => !(prev.issues ?? []).includes(i));
}

/** 알림이 실제로 나간 뒤에만 기록한다 — 보내지도 않고 "보냈음"으로 적으면 접수가 조용히 묻힌다. */
export function markAlerted(now: AlertState) {
  const s = session();
  if (!s || !now.sessionId) return;
  try {
    s.setItem(
      KEY_ALERTED + now.sessionId,
      JSON.stringify({ name: now.name, phone: now.phone, issues: now.issues })
    );
  } catch {
    /* 무시 */
  }
}
