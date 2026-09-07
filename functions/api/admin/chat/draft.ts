// 사무실용 답변 초안 API — 손님 상담 대화를 받아 로캐디 판례·법령을 근거로 답장 초안을 만든다.
//
// 방문자에게 직접 나가는 챗봇(/api/chat)과 목적이 다르다.
//   - 챗봇: 빠른 응대, 판례 인용 안 함(무료 자문 소진 방지)
//   - 이 API: 사무실이 검토·발송할 답장. 최상급 모델 + 판례 근거. 20~40초 걸려도 품질을 택한다.
//
// 인증: 서버 간 공유 비밀(x-admin-id / x-admin-key). 중앙 접수함(lead-inbox)이 호출한다.
// 경로는 중앙상담함 계약(/api/admin/chat/draft)을 따르되, 실시간 세션(sid)을 아직 안 쓰므로
// 대화 텍스트를 직접 받는다. 나중에 sid 조회를 붙일 때 같은 경로를 그대로 쓴다.

import {
  searchCases,
  fetchStatutes,
  formatEvidence,
  extractTerms,
  type LawcaddyEnv,
} from "../../_lawcaddy";
import { searchPrecedents, formatPrecedents } from "../../_precedent";

interface Env extends LawcaddyEnv {
  ANTHROPIC_API_KEY?: string;
  TOESAHERO_ADMIN_ID?: string;
  TOESAHERO_ADMIN_KEY?: string;
}

type Msg = { role: string; content: string };

type RequestBody = {
  /** 대화 전문(줄바꿈 구분) — 접수함 detail을 그대로 넣어도 된다 */
  conversation?: string;
  /** 또는 구조화된 메시지 배열 */
  messages?: Msg[];
  name?: string | null;
};

const SYSTEM = `당신은 법률사무소 청송law의 노동사건 담당 변호사입니다. 지금 사무실이 손님과 상담 대화를 하고 있고, 당신은 **변호사가 다음에 보낼 답장의 초안**을 씁니다.

[당신이 쓰는 것이 무엇인지]
- 당신의 출력은 그대로 손님에게 보내질 수 있는 "답장 문안"이다. 해설·분석 보고서가 아니다.
- 사무실이 읽고 고친 뒤 직접 발송한다. 그러니 바로 보낼 수 있는 완성된 문장으로 쓴다.
- 발송 명의는 "법률사무소 청송law 상담실"이다. 변호사 개인 이름을 쓰지 않는다.

[변호사로서의 사고 — 초안을 쓰기 전에 반드시 거칠 것]
1. 지금 이 사안이 어느 절차 단계에 있는지 확정한다(재직 중 / 퇴직 통보 후 / 퇴직 완료 / 징계 진행 중 / 노동청 진정 후 / 노동위원회 구제신청 기간).
2. 그 단계에서 이 손님이 놓치면 되돌릴 수 없는 것이 무엇인지 짚는다. 특히 기한을 우선한다 — 부당해고·부당징계 구제신청 3개월, 사내 재심 기간, 임금채권 소멸시효 3년, 퇴직금 지급기한 14일.
3. 상대(회사·사업주)가 다음에 무엇을 할지 예상하고, 지금 무엇을 해두면 유리한 위치가 되는지 판단한다. 증거 보존, 서면 요구, 서명 보류가 흔한 답이다.
4. 아직 모르는데 결론에 결정적인 사실이 무엇인지 고른다 — 그중 **가장 중요한 것 하나**만 묻는다.
5. 아래 [근거 자료]에 있는 법령·판례에서 이 사안에 실제로 걸리는 것만 골라 쓴다. 없는 조문·사건번호를 지어내지 않는다.

[답장 형식]
- 3~6문장. 존댓말. 문단 구분 없이 자연스럽게 이어지는 문장으로 쓴다.
- 목록·번호·불릿·마크다운을 쓰지 않는다.
- 구성: (1) 손님의 마지막 말에 대한 직접적인 반응 (2) 지금 상황에 대한 법적 정리 — 근거 조문을 문장 안에 자연스럽게 (3) 지금 해야 할 것 하나 (4) 확인 질문 하나.
- 이미 앞에서 안내한 내용을 같은 말로 반복하지 않는다. 대화는 앞으로 나아가야 한다.

[절대 금지]
- 승패·결과·기한을 단정하지 않는다. "부당해고입니다", "이길 수 있습니다", "받아드립니다" 금지. "~에 해당할 수 있습니다", "~로 판단될 여지가 있습니다"까지만.
- 수임료 금액 약속, "무료", "전문", "1위", "최고", 승소율 언급 금지(변호사 광고규정).
- 사업주·상급자의 신상을 특정하거나 캐는 방법, 보복·직접 접촉·인터넷 폭로를 조언하지 않는다.
- 근거 자료에 없는 조문 번호·판례 사건번호를 만들어내지 않는다. 근거가 없으면 조문을 인용하지 말고 "서류를 봐야 정확합니다"로 넘긴다.
- 주민등록번호·주소·계좌 같은 개인정보를 묻지 않는다.

[출력]
- 답장 문안만 출력한다. 머리말("초안:", "답장:"), 따옴표, 설명, 괄호 주석을 붙이지 않는다.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** 대화를 하나의 텍스트로 — 손님 발화가 사안의 사실관계를 담고 있다 */
function toText(body: RequestBody): string {
  if (typeof body.conversation === "string" && body.conversation.trim()) {
    return body.conversation.slice(0, 20000);
  }
  const msgs = Array.isArray(body.messages) ? body.messages : [];
  return msgs
    .filter((m) => typeof m?.content === "string" && m.content.trim())
    .map((m) => {
      const who =
        m.role === "user" || m.role === "visitor" || m.role === "me"
          ? "손님"
          : m.role === "admin" || m.role === "attorney"
            ? "사무실"
            : "상담봇";
      return `${who}: ${m.content.trim()}`;
    })
    .join("\n")
    .slice(0, 20000);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 서버 간 호출만 허용 — 브라우저에서 직접 부를 수 있으면 안 된다
  const id = (env.TOESAHERO_ADMIN_ID ?? "").trim();
  const key = (env.TOESAHERO_ADMIN_KEY ?? "").trim();
  if (!id || !key) return json({ ok: false, reason: "not_configured" }, 503);
  if (
    request.headers.get("x-admin-id") !== id ||
    request.headers.get("x-admin-key") !== key
  ) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const apiKey = (env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return json({ ok: false, reason: "not_configured" }, 503);

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 400);
  }

  const conversation = toText(body);
  if (conversation.length < 10) {
    return json({ ok: false, reason: "no_conversation" }, 400);
  }

  // 근거 수집 — 세 갈래를 동시에 던진다(순차로 하면 초안까지 1분을 넘긴다).
  // 어느 하나가 죽어도 초안은 나와야 하므로 실패는 빈 배열로 흡수한다.
  const terms = extractTerms(conversation, 3);
  const [cases, statutes, precedents] = await Promise.all([
    searchCases(env, conversation, 5).catch(() => []),
    fetchStatutes(env, conversation, 6).catch(() => []),
    searchPrecedents(terms.length ? terms : ["부당해고"], 3).catch(() => []),
  ]);

  const evidence =
    `[근거 자료 — 법제처 공식 판례(사건번호 인용 안전)]\n${formatPrecedents(precedents)}\n\n` +
    formatEvidence(cases, statutes);

  const userBlock =
    `${evidence}\n\n` +
    `[손님과의 대화 전문]\n${conversation}\n\n` +
    `[지시]\n위 대화에서 손님이 마지막으로 한 말에 답하는 답장 문안을 쓰시오. ` +
    `${body.name ? `손님 성함은 ${String(body.name).slice(0, 20)}님이다. ` : ""}` +
    `근거 자료에 실제로 걸리는 조문·판례만 쓰고, 없으면 인용하지 마시오.`;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 2000,
        // 사무실이 검토·발송하는 흐름이라 속도보다 품질. 방문자용 챗봇(effort:low)과 반대다.
        output_config: { effort: "high" },
        system: SYSTEM,
        messages: [{ role: "user", content: userBlock }],
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("[draft] anthropic", upstream.status, detail.slice(0, 300));
      return json({ ok: false, reason: `upstream_${upstream.status}` }, 502);
    }
    const data = (await upstream.json()) as {
      content?: Array<{ type: string; text?: string }>;
      stop_reason?: string;
    };
    if (data.stop_reason === "refusal") {
      return json({ ok: false, reason: "refusal" }, 502);
    }
    const draft = (data.content?.find((c) => c.type === "text")?.text ?? "").trim();
    if (!draft) return json({ ok: false, reason: "empty" }, 502);

    // 사무실이 검토할 때 참고할 근거 목록도 같이 돌려준다
    const lawRefs = [
      ...precedents.map((p) => `${p.court} ${p.date} ${p.caseNumber}`.trim()),
      ...cases.filter((c) => c.citable).map((c) => `${c.court} ${c.date} ${c.caseNumber}`.trim()),
      ...statutes.map((s) => `${s.name} ${s.article}`.trim()),
    ].filter(Boolean);

    return json({ ok: true, draft, lawRefs });
  } catch (err) {
    console.error("[draft] fail", err instanceof Error ? err.message : String(err));
    return json({ ok: false, reason: "draft_failed" }, 502);
  }
};
