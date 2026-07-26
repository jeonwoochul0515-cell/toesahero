// Cloudflare Pages Function: POST /api/notify
// 신규 상담 신청 등 클라이언트 이벤트 발생 시 변호사에게 문자로 알린다.
// 클라이언트가 Firestore 저장 성공 후 fire-and-forget 으로 호출한다.
// 시크릿은 서버 env(_notify)에 있으므로 본 엔드포인트가 SOLAPI 키를 노출하지 않는다.

import { sendSms, type NotifyEnv } from "./_notify";

interface Env extends NotifyEnv {}

type RequestBody = {
  type: "consultation" | "draft" | "notice";
  caseId?: string;
  summary?: string;
  attr?: unknown;
};

const LABEL: Record<RequestBody["type"], string> = {
  consultation: "신규 상담 신청",
  draft: "AI 통보문 초안 신청",
  notice: "내용증명(표준) 신청",
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 200);
  }

  const label = LABEL[body.type];
  if (!label) {
    return json({ ok: false, reason: "unknown_type" }, 200);
  }

  const ref = body.caseId ? `#${body.caseId.slice(0, 8)}` : "";
  const summary = (body.summary ?? "").slice(0, 120);
  const text = `[퇴사히어로] ${label}${ref ? `\n사건 ${ref}` : ""}${
    summary ? `\n${summary}` : ""
  }\n유입경로: ${summarizeAttr(body.attr)}\n어드민에서 확인해 주세요.`;

  const r = await sendSms(env, text);
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

