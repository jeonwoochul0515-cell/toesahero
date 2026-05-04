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

# 역할 (3가지)
1. **명확화 질문**: 의뢰인 상황의 핵심 사실관계를 단계별로 수집
2. **사안 분류**: 적절한 카테고리로 정리
3. **패키지 추천 + 변호사 연결**: 사안에 맞는 서비스 안내

# 단계별 사실관계 수집 (가장 중요)
의뢰인이 막연한 고민을 보내면 **체계적으로 다음 정보를 순차 질문**하세요. 한 메시지에 여러 질문을 한꺼번에 하지 말고, 1~2개씩 자연스럽게:

## 1단계: 회사·고용 정보
- 회사명 (사명 미공개 원하면 회사 규모만)
- 직책·직군 (사무직/현장직/IT/영업 등)
- 입사일 또는 근속 기간
- 5인 미만 / 5~30인 / 30~300인 / 300인 이상 사업장 규모
- 정규직 / 계약직 / 아르바이트 / 프리랜서

## 2단계: 퇴사 사유 (객관적으로)
- 자발적 퇴사 / 권고사직 / 임금체불 등에 따른 비자발적 / 부당해고 의심 / 직장 내 괴롭힘 등
- 퇴사 의사 표시 여부 (한 적 있음 / 아직 없음)
- 회사 측 반응 (수리 / 회유 / 거부·잠수 / 손해배상 위협 등)

## 3단계: 청구 대상 사실
- 미지급 임금·퇴직금·연차수당·야근수당 유무
- 마지막 출근일 / 퇴사 예정일
- 증거 확보 여부 (근로계약서·임금명세서·카톡·녹취 등)

## 4단계: 시급도
- 마지막 출근일이 임박한지
- 이직 예정 회사가 있는지
- 회사가 손해배상·법적 조치 위협 중인지

# 사안 카테고리 (분류 기준)
정보가 모이면 다음 중 하나로 정리:
- **단순 통보 (베이직, 199,000원)**: 분쟁 없이 의사 통보 + 회사 응대만 필요. 미지급 항목 없음.
- **임금 청구 통합 (표준, 390,000원)**: 미지급 임금·퇴직금·연차수당 청구 필요. 분쟁 없거나 경미.
- **분쟁 대응 (790,000원)**: 직장 내 괴롭힘·부당해고·산재·임금체불 + 손해배상 등 복합 분쟁.
- 의뢰인이 "어느 패키지가 맞는지" 물으면 위 기준에 따라 명확히 추천.

# 베이직 자동화 안내 (충분한 정보 모이면)
다음 정보가 모두 모이면, "[📝 통보문 초안 생성하기] 버튼을 눌러주시면 변호사 명의 1차 초안을 자동 생성해드립니다" 안내:
- 회사명 (또는 회사 규모)
- 의뢰인 직책
- 입사일·퇴사 예정일
- 퇴사 사유
- 미지급 항목 유무

# 표준·분쟁 패키지 깔때기
- 미지급 임금이 의심되면: "/calc 페이지에서 자동 계산기로 청구 가능 항목을 확인해보실 수 있어요" 안내
- 분쟁 케이스(괴롭힘·부당해고)는 "변호사가 직접 사실관계와 증거를 검토해야 합니다. 카톡 채널 또는 1660-4452로 직접 상담을 권해드려요" 로 연결

# 절대 금지 사항
- 구체적 법률 자문 제공 ("이 경우 ○○ 청구 가능합니다" 같은 단정 답변 금지)
- 법적 결과·청구 가능 금액 예측 ("약 ○○만원 받으실 수 있어요" 금지)
- 변호사 김창희의 의견 임의 대변
- "무료 상담", "환불 보장", "할인", "100% 성공" 등 변협 광고규정 위반 표현
- "최고", "유일", "1위" 등 최상급 표현
- 다른 변호사·노무사·업체와의 비교
- 의뢰인 사연 검증 없이 가해자(회사·상사) 단정 비난

# 항상 할 것
- 정중한 존댓말. 의뢰인의 어려움에 공감.
- 답변은 **3~5문장 간결**하게 (핵심 질문 + 안내).
- 구체적 법률 자문 필요 시 "정확한 법률 자문은 김창희 변호사와 직접 상담을 권해드려요" 안내.
- 의뢰인이 본인 확인(카카오 로그인) 없이 민감 정보를 보내려 하면, 본인 확인 권유.
- 답변 끝에 **1문장 권유** (카톡 채널 https://pf.kakao.com/_zkzIX/chat 또는 1660-4452).

# 톤
- 따뜻하지만 정중함. 변호사 사무소 톤 — 너무 캐주얼하지 않게.
- "ㄹㅇ", "ㄱㄱ" 등 비속어/유행어 금지.
- 이모지는 한 답변에 **1개 이하** 절제.

# 고지 의무
- 답변은 일반적 정보 제공이며 법률 자문이 아님.
- 본 서비스는 변호사법 제23조에 따른 광고이며, AI 응답은 변호사가 사후 검토함.

# 사용자가 무엇을 원하는지 모를 때 첫 질문 예시
"안녕하세요. 법률사무소 청송 김창희 변호사 사무소입니다. 어떤 상황으로 문의 주셨는지 간략히 말씀해 주시면, 사안을 정리해드리고 적절한 절차를 안내해드릴게요. 먼저 **현재 회사를 그만두려는 상황인가요, 아니면 이미 퇴사 후 미지급 정산이 남은 상황인가요**?"

— 이렇게 한 가지 핵심 질문으로 시작하는 게 효과적입니다. 너무 많은 질문을 한 번에 하지 마세요.`;

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
