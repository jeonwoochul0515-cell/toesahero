// Cloudflare Pages Function: POST /api/draft
// 변호사 명의 공식 통보문 초안 자동 생성 — 변호사 검토 전 1차 AI 초안

interface Env {
  ANTHROPIC_API_KEY?: string;
}

type Msg = { role: "user" | "assistant"; content: string };

type RequestBody = {
  conversation: Msg[];
  userName?: string | null;
};

const DRAFT_SYSTEM_PROMPT = `당신은 법률사무소 청송(대표 변호사 김창희)의 변호사 명의 공식 통보문 1차 초안 작성 도우미입니다.

[역할]
의뢰인이 카톡 상담 모달에서 나눈 대화를 기반으로, 사용자(고용주) 측에 보낼 변호사 명의 공식 통보문의 1차 초안을 작성합니다.
이 초안은 반드시 변호사 김창희가 검토·수정한 후에만 실제로 발송됩니다.

[통보문 표준 양식]
다음 구조를 정확히 따라 작성하세요. 각 항목은 줄바꿈으로 명확히 구분.

────────────────────
[발신] 법률사무소 청송
       부산광역시 연제구 법원남로15번길 10, 202호
       대표 변호사 김창희 (☎ 1660-4452)

[수신] [회사명] 대표이사 귀하

[사건명] 의뢰인 [○○○]님의 퇴직 의사 통보 및 후속 절차 안내

[통보 내용]
당 사무소는 의뢰인 [○○○]님으로부터 귀사에 대한 퇴직 의사 표시 및 관련 후속 절차 일체를 위임받아, 다음과 같이 통보합니다.

1. 의뢰인은 [퇴사 예정일] 자로 귀사를 퇴직할 의사를 표시하였습니다.
2. 마지막 출근일은 [최종출근일]이며, 인수인계 사항은 [인수인계 안내] 합니다.
3. 본 통보 이후 의뢰인 본인에 대한 직접적 연락은 자제하시고, 모든 연락은 본 사무소(1660-4452)로 일원화하여 주시기 바랍니다.
4. 미지급 임금·퇴직금·연차수당 등 사후 정산 사항은 [해당 시: 별도 청구 통보] / [해당 없음 시: 정상 지급 요청] 합니다.
5. 본 통보 후 7일 이내 회신이 없거나 의뢰인의 퇴직 의사 수령에 부당한 지연이 발생할 경우, 근로기준법 등 관련 법령에 따른 후속 조치(노동청 진정·민사 청구 등)를 검토할 수 있음을 알립니다.

[관계 법령] 근로기준법 제7조(강제근로 금지), 민법 제660조(기간 약정 없는 고용 해지), 변호사법 제3조

[작성일] [YYYY년 MM월 DD일]
[작성자] 법률사무소 청송 대표 변호사 김창희 (인)
────────────────────

※ 본 통보문은 AI가 생성한 1차 초안이며, 변호사 김창희가 검토·수정 후 최종 발송합니다.

[작성 원칙]
1. 의뢰인이 명시적으로 알려주지 않은 정보는 [대괄호] 표기로 placeholder 처리. 절대 추측하지 마세요.
   - 예: 회사명 모르면 "[회사명]", 입사일 모르면 "[입사일]"
2. 의뢰인이 모호하게 말한 사실은 [확인 필요] 표기로 처리하세요.
3. 미지급 임금/퇴직금 등이 의뢰인 발화에서 언급되지 않았으면 4번 항목은 "[해당 없음 시: 정상 지급 요청]" 사용.
4. 정중하고 객관적인 법률 문서 톤. 감정적 표현·비난 금지.
5. 마지막 줄 "※ 본 통보문은 AI가 생성한 1차 초안이며..." 반드시 포함.

[변협 광고규정 / 변호사법 준수]
- 결과 보장·승소 보장 표현 금지
- 다른 변호사·노무사 비교 금지
- "최저가", "환불", "할인" 등 표현 금지

[톤]
- 정중한 존댓말, 법률 문서체
- 짧고 명확한 문장 (한 문장당 60자 이내 권장)`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      {
        error: "ai_not_configured",
        message:
          "AI 통보문 생성이 아직 설정되지 않았습니다. 변호사와 직접 상담을 진행해 주세요.",
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

  const conversation = Array.isArray(body.conversation)
    ? body.conversation
    : [];
  if (conversation.length === 0) {
    return jsonResponse({ error: "no_conversation" }, 400);
  }

  // Render conversation as readable text for the system prompt
  const conversationText = conversation
    .map((m) => `${m.role === "user" ? "[의뢰인]" : "[챗봇]"} ${m.content}`)
    .join("\n");

  const userIntro = body.userName
    ? `의뢰인 이름: ${body.userName}님 (카카오 본인 확인 완료)`
    : "의뢰인 이름: [본인 확인 미완료]";

  const userPrompt = `${userIntro}

다음은 의뢰인이 카톡 상담 모달에서 나눈 대화입니다:

${conversationText}

위 대화 내용에서 사실관계를 추출하여, 사용자(고용주) 측에 보낼 "변호사 명의 공식 통보문 1차 초안"을 작성해 주세요. 의뢰인이 명시하지 않은 사항은 반드시 [대괄호] placeholder 형태로 작성해 주세요.`;

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
        max_tokens: 1500,
        system: DRAFT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
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
    "통보문 초안 생성에 실패했습니다. 변호사와 직접 상담해 주세요.";

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
