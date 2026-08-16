// Cloudflare Pages Function: POST /api/notify
// 신규 상담 신청 등 클라이언트 이벤트 발생 시 변호사에게 문자로 알린다.
// 클라이언트가 Firestore 저장 성공 후 fire-and-forget 으로 호출한다.
// 시크릿은 서버 env(_notify)에 있으므로 본 엔드포인트가 SOLAPI 키를 노출하지 않는다.

import { sendSms, type NotifyEnv } from "./_notify";

interface Env extends NotifyEnv {
  LEAD_INBOX_TOKEN?: string; // 중앙 접수함(lead-inbox) 전송 토큰
}

type RequestBody = {
  type: "consultation" | "draft" | "notice";
  caseId?: string;
  summary?: string;
  name?: string | null;
  contact?: string | null;
  attr?: unknown;
};

const LABEL: Record<RequestBody["type"], string> = {
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 외부 스크립트의 직접 호출 차단
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!ALLOWED_ORIGIN.test(origin)) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (rateLimited(ip)) {
    return json({ ok: false, reason: "too_many_requests" }, 429);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 200);
  }

  // 외부 입력이므로 타입을 실제로 검증한다 — "constructor" 같은 프로토타입 키가
  // LABEL[type]에서 함수로 풀려 문자에 실리거나, 문자열 아닌 caseId가 500을 내지 않게.
  const type =
    typeof body.type === "string" &&
    Object.prototype.hasOwnProperty.call(LABEL, body.type)
      ? (body.type as RequestBody["type"])
      : null;
  if (!type) {
    return json({ ok: false, reason: "unknown_type" }, 200);
  }
  const label = LABEL[type];

  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const ref = caseId ? `#${caseId.slice(0, 8)}` : "";
  // LMS(2,000바이트)로 나가므로 신청 내용을 최대한 담는다. 최종 길이는 sendSms가 바이트 기준으로 자른다.
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 1200) : "";
  const text = `[퇴사히어로] ${label}${ref ? `\n사건 ${ref}` : ""}${
    summary ? `\n${summary}` : ""
  }\n유입경로: ${summarizeAttr(body.attr)}\n어드민에서 확인해 주세요.`;

  const r = await sendSms(env, text);

  // 연락처가 있는 접수는 중앙 접수함(lead-inbox)에도 사본을 남긴다 — 전 사이트 통합 현황판.
  // 상세 처리는 자체 어드민 링크로 이동해 진행한다.
  const phone = String(body.contact ?? "").replace(/[^0-9]/g, "");
  if (env.LEAD_INBOX_TOKEN && /^01[016789][0-9]{7,8}$/.test(phone)) {
    try {
      await fetch("https://lead-inbox.jeonwoochul0515.workers.dev/api/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ingest-token": env.LEAD_INBOX_TOKEN,
        },
        body: JSON.stringify({
          site: "퇴사히어로",
          name: String(body.name ?? "").trim() || "미입력",
          phone,
          detail: [`[${label}]`, summary].filter(Boolean).join("\n").slice(0, 1500),
          link: caseId
            ? `https://toesahero.com/admin/consultations/${encodeURIComponent(caseId)}`
            : "https://toesahero.com/admin/consultations",
        }),
      });
    } catch {
      /* 접수함 전송 실패는 무시 — Firestore·문자가 1차 기록 */
    }
  }

  return json({ ok: r.ok, reason: r.reason }, 200);
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

