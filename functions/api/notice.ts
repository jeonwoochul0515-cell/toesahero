// Cloudflare Pages Function: POST /api/notice
// 표준 패키지(390K) 자동화 — 임금·연차·퇴직금 청구 내용증명 1차 초안

interface Env {
  ANTHROPIC_API_KEY?: string;
}

type Item = { label: string; amount: number };
type RequestBody = {
  factSummary: string;
  items: Item[];
  userName?: string | null;
};

const NOTICE_SYSTEM_PROMPT = `당신은 법률사무소 청송(대표 변호사 김창희)의 변호사 명의 내용증명 1차 초안 작성 도우미입니다.

[역할]
의뢰인이 자동 계산기에 입력한 정보를 바탕으로, 사용자(고용주) 측에 보낼 임금/연차수당/퇴직금/야근수당 등 미지급액 청구 내용증명의 1차 초안을 작성합니다.
이 초안은 반드시 변호사 김창희가 검토·수정한 후에만 실제로 발송됩니다.

[내용증명 표준 양식]

────────────────────
[수신] [회사명] 대표이사 귀하
       [회사 주소]

[발신] 의뢰인 [○○○]
       법률대리인: 법률사무소 청송 대표 변호사 김창희
       부산광역시 연제구 법원남로15번길 10, 202호 (☎ 1660-4452)

[제목] 미지급 임금 등 청구 내용증명

[청구 취지]
당 사무소는 의뢰인 [○○○]님으로부터 귀사에 대한 미지급 임금·수당·퇴직금 등의 청구 일체를 위임받아, 다음과 같이 통보합니다.

[청구 내역]
다음 각 호의 금원을 본 통보 도달일로부터 14일 이내에 의뢰인의 지정 계좌로 지급하여 주시기 바랍니다.

(여기에 항목별 청구액 표시 — items 입력 기반)

[근거 법령]
- 근로기준법 제36조 (금품 청산 의무)
- 근로기준법 제43조 (임금 지급)
- 근로기준법 제56조 (연장·야간 및 휴일근로)
- 근로자퇴직급여 보장법 제9조 (퇴직금 지급)
- 민법 제387조 이하 (이행지체 책임)

[조건부 후속 조치 안내]
본 통보 후 14일 이내 미지급 또는 부당한 지연이 발생할 경우, 다음 절차를 검토할 수 있음을 알립니다:
1. 고용노동부 진정 (근로기준법 위반)
2. 민사 소송 (체불임금 + 지연이자 + 손해배상)
3. 기타 「근로기준법」 등 관련 법령에 따른 조치

[작성일] [YYYY년 MM월 DD일]
[법률대리인] 법률사무소 청송 대표 변호사 김창희 (인)
────────────────────

※ 본 내용증명은 AI가 생성한 1차 초안이며, 변호사 김창희가 사실관계 검증 및 법적 검토 후 최종 발송합니다.

[작성 원칙]
1. 의뢰인이 명시하지 않은 사실(회사명, 주소, 의뢰인 본명, 입사일, 퇴사일 등)은 [대괄호] placeholder 처리.
2. 청구 항목은 입력된 items 그대로 사용, 추측·증감 금지.
3. 정중하고 객관적인 법률 문서 톤. 감정·비난 금지.
4. 마지막 줄 "※ 본 내용증명은 AI가 생성한 1차 초안..." 반드시 포함.
5. 청구액 합계 자동 계산 + 명시.

[변협 광고규정 / 변호사법 준수]
- 결과 보장·승소 보장 표현 금지
- 다른 변호사 비교 금지
- "최저가", "환불", "할인" 금지
- "반드시 받을 수 있다" 같은 단정적 표현 금지`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      {
        error: "ai_not_configured",
        message:
          "AI 내용증명 생성이 아직 설정되지 않았습니다. 변호사와 직접 상담을 진행해 주세요.",
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

  const items = Array.isArray(body.items) ? body.items : [];
  const factSummary =
    typeof body.factSummary === "string" ? body.factSummary : "";

  if (items.length === 0) {
    return jsonResponse({ error: "no_items" }, 400);
  }

  const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

  const itemsText = items
    .map((i, idx) => `${idx + 1}. ${i.label}: 금 ${fmt(i.amount)}원`)
    .join("\n");
  const total = items.reduce((a, b) => a + (b.amount || 0), 0);

  const userIntro = body.userName
    ? `의뢰인 이름: ${body.userName}님 (카카오 본인 확인 완료)`
    : "의뢰인 이름: [본인 확인 미완료]";

  const userPrompt = `${userIntro}

[자동 계산기 입력 정보]
${factSummary}

[청구 항목 합계]
${itemsText}

청구액 합계: 금 ${fmt(total)}원

위 사실관계 + 청구 항목을 바탕으로 "변호사 명의 미지급 임금 등 청구 내용증명 1차 초안"을 작성해 주세요.
의뢰인이 명시하지 않은 정보(회사명, 입사일, 의뢰인 본명 등)는 반드시 [대괄호] placeholder 형태로 작성해 주세요.`;

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
        max_tokens: 1800,
        system: NOTICE_SYSTEM_PROMPT,
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
    "내용증명 초안 생성에 실패했습니다. 변호사와 직접 상담해 주세요.";

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
