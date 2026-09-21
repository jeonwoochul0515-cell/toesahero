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
