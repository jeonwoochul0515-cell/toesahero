// Cloudflare Pages Function: POST /api/notify
// 신규 상담 신청 등 클라이언트 이벤트 발생 시 변호사에게 알림톡(실패 시 문자 대체)으로 알린다.
// 클라이언트가 Firestore 저장 성공 후 fire-and-forget 으로 호출한다.
// 시크릿은 서버 env(_notify)에 있으므로 본 엔드포인트가 SOLAPI 키를 노출하지 않는다.

import { sendAlimtalk, KAKAO_TPL, type NotifyEnv } from "./_notify";

interface Env extends NotifyEnv {
  LEAD_INBOX_TOKEN?: string; // 중앙 접수함(lead-inbox) 전송 토큰
}

type RequestBody = {
  type: "consultation" | "draft" | "notice" | "chatlog";
  caseId?: string;
  summary?: string;
  name?: string | null;
  contact?: string | null;
  attr?: unknown;
  // chatlog(접수 후 대화 전문 보고) 전용
  sessionId?: string;
  transcript?: string;
  consent?: boolean;
};

const LABEL: Record<Exclude<RequestBody["type"], "chatlog">, string> = {
  consultation: "신규 상담 신청",
  draft: "AI 통보문 초안 신청",
  notice: "내용증명(표준) 신청",
};

// 스팸 방어 — 이 엔드포인트는 호출 1건당 문자 요금이 나가므로 봇이 두드리면 그대로 비용이 된다.
// (Origin 화이트리스트 + IP 레이트리밋. 2026-08-16 보강 — 호스트 경계 고정, 헤더 없는 요청 차단)
// 워커 isolate가 살아 있는 동안만 카운터가 유지되는 베스트에포트 방식이다 — 완전 차단이 아니라 감속이 목적.
// 브라우저는 POST에 항상 Origin을 붙이므로(fetch 표준) 헤더 부재 = 스크립트 직접 호출로 본다.
const ALLOWED_ORIGIN =
  /^https?:\/\/([a-z0-9-]+\.)?toesahero\.com(\/|$)|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)|^https:\/\/[a-z0-9-]+\.toesahero\.pages\.dev(\/|$)/i;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

// 이미 한도에 걸린 요청은 히트로 세지 않는다 — 거부까지 세면 사용 중인 IP는 창이
// 계속 미끄러져 차단이 영영 안 풀리고, 정작 연락처가 담긴 마지막 호출이 유실된다.
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return false;
}

// 대화록(chatlog) 보고는 별도 버킷 — 상담 접수 알림 한도와 경합해 대화록이 유실되지 않게 한다.
const logHits = new Map<string, number[]>();
function chatlogLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (logHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= 4) {
    logHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  logHits.set(ip, arr);
  return false;
}

// 접수 누락 방지(2026-08-22): 연락처가 담긴 접수는 일반 한도(5회/10분)와 분리된 넉넉한 버킷.
// 정상 사용자가 닿을 수 없는 상한(20회/10분)만 남겨 폭주 봇의 문자 비용만 막는다.
const contactHits = new Map<string, number[]>();
function contactLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (contactHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= 20) {
    contactHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  contactHits.set(ip, arr);
  return false;
}

// 접수 후 대화 보고 (2026-08-24 개정 — "문자로는 간단한 것만").
// 전문은 중앙 접수함(lead-inbox)에 빠짐없이 저장하고, 문자는 간단 알림 한 통만 보낸다.
// 손님이 "대화 전달" 동의 칸을 체크한 접수에서만 호출된다(클라이언트가 게이트).
// 보고는 항상 누적 전문이므로, 접수함의 최신 행이 그 대화의 완본이다.
async function handleChatLog(env: Env, body: RequestBody): Promise<Response> {
  if (body.consent !== true) {
    return json({ ok: false, reason: "consent_required" }, 400);
  }
  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim().slice(0, 18000) : "";
  if (!transcript) return json({ ok: false, reason: "empty_transcript" }, 200);
  const sid = typeof body.sessionId === "string" ? body.sessionId.slice(0, 8) : "";
  const name = String(body.name ?? "").trim().slice(0, 30) || "미입력";
  const phone = String(body.contact ?? "").replace(/[^0-9]/g, "");
  const source = summarizeAttr(body.attr);

  // ① 전문 — 중앙 접수함에 저장(완본 보관처). 실패해도 문자는 나간다.
  let inboxOk = false;
  if (env.LEAD_INBOX_TOKEN && /^01[016789][0-9]{7,8}$/.test(phone)) {
    try {
      const resp = await fetch("https://lead-inbox.jeonwoochul0515.workers.dev/api/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ingest-token": env.LEAD_INBOX_TOKEN,
        },
        body: JSON.stringify({
          site: "퇴사히어로",
          name,
          phone,
          detail: `[히로 대화 전문 · 전달 동의함]${sid ? ` #${sid}` : ""}\n${transcript}`,
          source,
          link: "https://toesahero.com/admin/consultations",
        }),
      });
      inboxOk = resp.ok;
    } catch {
      /* 접수함 실패 — 아래 문자로 알린다 */
    }
  }

  // ② 알림톡 — 간단 알림 한 통. 전문은 접수함에서 본다. (전문 문구는 문자 대체용 fallback)
  const lines = [
    `[퇴사히어로] 히로 대화 접수${sid ? ` #${sid}` : ""}`,
    `${name} · ${body.contact ?? ""}`.trim(),
    `유입경로: ${source}`,
    inboxOk
      ? "대화 전문은 중앙 접수함에서 확인해 주세요."
      : "[주의] 접수함 저장 실패 — 어드민 > 상담 요청에서 확인해 주세요.",
  ].filter(Boolean);
  const sms = await sendAlimtalk(
    env,
    KAKAO_TPL.chatlog,
    {
      "#{접수}": sid,
      "#{신청인}": `${name} · ${body.contact ?? ""}`.trim(),
      "#{경로}": source,
      "#{보관처}": inboxOk ? "중앙 접수함" : "어드민 > 상담 요청(접수함 저장 실패)",
    },
    lines.join("\n")
  );

  // 두 채널 중 하나라도 성공하면 보고 성공(정본 원칙: 전부 실패했을 때만 실패)
  return json({ ok: inboxOk || sms.ok, inboxOk, smsOk: sms.ok }, 200);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 외부 스크립트의 직접 호출 차단
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!ALLOWED_ORIGIN.test(origin)) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 200);
  }

  // 접수 후 대화 전문 보고 — 별도 레이트리밋 버킷으로만 세고 여기서 끝낸다
  // (기본 알림 한도 5회/10분을 소모하면 정작 상담 접수 문자가 유실될 수 있다)
  if (body.type === "chatlog") {
    if (chatlogLimited(ip)) {
      return json({ ok: false, reason: "too_many_requests" }, 429);
    }
    return handleChatLog(env, body);
  }

  // 연락처가 담긴 접수는 절대 유실 금지 — 일반 한도 대신 넉넉한 전용 버킷만 적용한다.
  const hasContact = String(body.contact ?? "").trim().length >= 4;
  if (hasContact ? contactLimited(ip) : rateLimited(ip)) {
    return json({ ok: false, reason: "too_many_requests" }, 429);
  }

  // 외부 입력이므로 타입을 실제로 검증한다 — "constructor" 같은 프로토타입 키가
  // LABEL[type]에서 함수로 풀려 문자에 실리거나, 문자열 아닌 caseId가 500을 내지 않게.
  const type =
    typeof body.type === "string" &&
    Object.prototype.hasOwnProperty.call(LABEL, body.type)
      ? (body.type as Exclude<RequestBody["type"], "chatlog">)
      : null;
  if (!type) {
    return json({ ok: false, reason: "unknown_type" }, 200);
  }
  const label = LABEL[type];

  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const ref = caseId ? `#${caseId.slice(0, 8)}` : "";
  // 대체 문자는 LMS(2,000바이트)로 나가므로 신청 내용을 최대한 담는다. 최종 길이는 발송부가 바이트 기준으로 자른다.
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 1200) : "";
  const source = summarizeAttr(body.attr);
  const text = `[퇴사히어로] ${label}${ref ? `\n사건 ${ref}` : ""}${
    summary ? `\n${summary}` : ""
  }\n유입경로: ${source}\n어드민에서 확인해 주세요.`;

  const r = await sendAlimtalk(
    env,
    KAKAO_TPL.intake,
    {
      "#{유형}": label,
      "#{사건}": ref,
      "#{경로}": source,
      "#{내용}": summary,
    },
    text
  );

  // 연락처가 있는 접수는 중앙 접수함(lead-inbox)에도 사본을 남긴다 — 전 사이트 통합 현황판.
  // 상세 처리는 자체 어드민 링크로 이동해 진행한다.
  const phone = String(body.contact ?? "").replace(/[^0-9]/g, "");
  let inboxOk = false;
  if (env.LEAD_INBOX_TOKEN && /^01[016789][0-9]{7,8}$/.test(phone)) {
    try {
      const resp = await fetch("https://lead-inbox.jeonwoochul0515.workers.dev/api/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ingest-token": env.LEAD_INBOX_TOKEN,
        },
        body: JSON.stringify({
          site: "퇴사히어로",
          name: String(body.name ?? "").trim() || "미입력",
          phone,
          // 상담 대화·초안이 실려 오므로 넉넉히 — 접수함 상한(2만 자) 안에서 자른다.
          detail: [`[${label}]`, summary].filter(Boolean).join("\n").slice(0, 12000),
          source,
          link: caseId
            ? `https://toesahero.com/admin/consultations/${encodeURIComponent(caseId)}`
            : "https://toesahero.com/admin/consultations",
        }),
      });
      inboxOk = resp.ok;
    } catch {
      /* 접수함 전송 실패 — 문자·Firestore가 남은 기록 */
    }
  }

  // 전달 채널이 전부 실패했을 때만 실패로 응답한다(가짜 성공 금지 원칙의 이면 —
  // 문자만 실패하고 접수함이 살아 있으면 접수는 유실되지 않았으므로 성공이다).
  return json({ ok: r.ok || inboxOk, reason: r.ok ? undefined : r.reason }, 200);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// 유입 경로(attribution.js가 저장한 첫 방문 정보)를 문자용 한 줄로 요약한다.
// 광고 클릭이면 실제 검색어(n_query)와 입찰 키워드(n_keyword)가 가장 중요한 정보다.
function summarizeAttr(raw: unknown): string {
  const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)
  let attr: Record<string, Record<string, string>> | null = null
  try {
    attr = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof attr)
  } catch {
    return '기록 없음'
  }
  if (!attr || typeof attr !== 'object') return '기록 없음'
  const a = attr.first || attr.current || {}
  const parts: string[] = []

  if (a.n_query) parts.push(`검색어 "${clip(a.n_query, 40)}"`)
  if (a.n_keyword) parts.push(`광고키워드 "${clip(a.n_keyword, 40)}"`)
  if (a.utm_campaign) parts.push(`캠페인 ${clip(a.utm_campaign, 30)}`)

  if (!parts.length) {
    const ref = clip(a.ref, 120)
    if (!ref) parts.push('직접 방문 또는 즐겨찾기')
    else if (/naver/i.test(ref)) parts.push('네이버 (검색·블로그 등)')
    else if (/google/i.test(ref)) parts.push('구글 검색')
    else if (/daum|kakao/i.test(ref)) parts.push('다음·카카오')
    else if (/chatgpt|perplexity|claude|gemini|copilot/i.test(ref)) parts.push('AI 검색')
    else parts.push(ref)
  } else if (a.utm_source || a.n_media) {
    parts.unshift(clip(a.utm_source || a.n_media, 20) + ' 광고')
  }

  if (a.landing) parts.push(`처음 본 페이지 ${clip(a.landing, 60)}`)
  if (a.at) parts.push(`최초 방문 ${clip(a.at, 20)}`)

  const cur = attr.current || {}
  if (a.at && cur.at && a.at.slice(0, 10) !== cur.at.slice(0, 10)) {
    parts.push('※ 다른 날 다시 방문해 신청')
  }
  return parts.join(' · ')
}

