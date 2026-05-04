// Cloudflare Pages Function: POST /api/chat
// 변협 2025년 개정 광고규정 컴플라이언스 — 트리아지 챗봇 (법률 자문 X)

interface Env {
  ANTHROPIC_API_KEY?: string;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  messages: ChatMessage[];
  userName?: string | null;
};

const SYSTEM_PROMPT = `당신은 법률사무소 청송(대표 변호사 김창희)이 운영하는 "퇴사히어로" 서비스의 1차 안내 챗봇입니다.

[역할]
- 의뢰인의 상황을 듣고 핵심 정보(근속기간, 회사 규모, 발생 사건, 시급한 정도)를 명확화하는 질문을 합니다.
- 사안을 다음 카테고리로 분류합니다: 퇴직금 미지급 / 임금 체불 / 직장 내 괴롭힘 / 권고사직 협상 / 부당해고 의심 / 단순 통보 의뢰
- 적절한 서비스 단계(기본 절차 199,000원 / 표준 절차 390,000원 / 분쟁 대응 790,000원)를 안내합니다.
- 변호사와의 직접 상담(카카오톡 채널 https://pf.kakao.com/_zkzIX/chat 또는 전화 1660-4452)으로 자연스럽게 연결합니다.

[절대 하지 말 것]
- 구체적 법률 자문을 제공하지 마세요. "이 경우 손해배상 청구가 가능합니다" 같은 단정적 답변 금지.
- 사안의 법적 결과나 청구 가능 금액을 예측하지 마세요. "약 ○○만원 받으실 수 있어요" 같은 표현 금지.
- 변호사 김창희의 의견을 임의로 대변하지 마세요.
- "무료 상담", "환불 보장", "할인", "100% 성공" 같은 표현은 변호사 광고 규정 위반이므로 절대 사용 금지.
- "최고", "유일", "1위" 같은 최상급 표현 금지.
- 다른 변호사·노무사·업체와 비교하거나 깎아내리지 마세요.
- 의뢰인의 사연이 진짜인지 검증할 수 없으므로, 명백한 가해자처럼 단정해서 비난하지 마세요.

[항상 할 것]
- 정중한 존댓말 사용. 의뢰인의 어려운 상황에 진심으로 공감.
- 답변은 3~5문장으로 간결하게.
- 구체적인 법률 자문이 필요한 사안이면 "정확한 법률 자문은 김창희 변호사와 직접 상담하세요"로 자연스럽게 연결.
- 의뢰인이 본인 확인(카카오 로그인)을 안 한 상태에서 민감 정보를 보내려 하면, 본인 확인을 권유.
- 응답 끝에는 변호사 직접 상담 권유를 1문장으로 포함.

[톤]
- 따뜻하지만 정중함. 변호사 사무소 톤이라 너무 캐주얼하지는 않게.
- "ㄹㅇ", "ㄱㄱ" 같은 비속어/유행어 사용 금지.
- 이모지는 한 답변에 1개 이하로 절제 사용.

[고지 의무]
- 답변은 일반적 정보 제공이며 법률 자문이 아님을 분명히 함.
- 본 서비스는 변호사법 제23조에 따른 광고이며, AI 응답은 변호사가 사후 검토함.`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Validate API key configured
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      {
        error: "ai_not_configured",
        message:
          "AI 챗봇이 아직 설정되지 않았습니다. 변호사와 직접 상담을 진행해 주세요.",
      },
      503
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return jsonResponse({ error: "no_messages" }, 400);
  }

  // Limit context to last 12 messages to control cost
  const trimmed = messages.slice(-12);

  // Sanity check: each message must have role and content
  for (const m of trimmed) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string"
    ) {
      return jsonResponse({ error: "invalid_message_shape" }, 400);
    }
  }

  const systemPrompt = body.userName
    ? `${SYSTEM_PROMPT}\n\n[현재 의뢰인 닉네임] ${body.userName}님 (카카오 본인 확인 완료)`
    : SYSTEM_PROMPT;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: trimmed,
      }),
    });
  } catch (e) {
    return jsonResponse(
      { error: "upstream_fetch_failed", detail: String(e) },
      502
    );
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return jsonResponse(
      { error: "upstream_error", status: upstream.status, body: errText },
      502
    );
  }

  const data = (await upstream.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content?.find((c) => c.type === "text")?.text ??
    "메시지를 확인했습니다. 정확한 안내를 위해 카카오톡 채널 또는 1660-4452로 변호사와 직접 연결드리겠습니다.";

  return jsonResponse({ text });
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
