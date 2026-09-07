// SOLAPI 카카오 알림톡(실패 시 문자 자동 대체) 발송 공통 헬퍼.
// 결제 완료/실패, 신규 상담 신청 등 이벤트 발생 시 변호사에게 알린다.
// 시크릿(SOLAPI_API_SECRET)은 CF Pages 서버 env에만 둔다. 발송 실패가 본 흐름을 막지 않도록 격리한다.

export interface NotifyEnv {
  SOLAPI_API_KEY?: string;
  SOLAPI_API_SECRET?: string;
  SOLAPI_SENDER?: string; // 사전 등록된 발신번호
  ALERT_TO_PHONE?: string; // 기본 수신번호 (변호사)
}

// 카카오 채널·템플릿 (2026-08-31 등록, Solapi API로 관리 — 화면 작업 불필요)
const KAKAO_PF_ID = "KA01PF260830171533973ab0zLKJrwex"; // 법률사무소 청송Law 채널
export const KAKAO_TPL = {
  intake: "KA01TP260830180047888AVdw6TvoMUx", // 「퇴사히어로 신규 접수」 #{유형} #{사건} #{경로} #{내용}
  chatlog: "KA01TP260830180050996qQnsQ9gIieU", // 「퇴사히어로 대화 접수」 #{접수} #{신청인} #{경로} #{보관처}
  paid: "KA01TP260830180051984xqHkOVCgcU9", // 「퇴사히어로 결제 완료」 #{상품} #{금액} #{사건}
  payFailed: "KA01TP260830180053305eXmasimdIiN", // 「퇴사히어로 결제 미완료」 #{결과} #{주문}
} as const;

async function hmacSha256Hex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// LMS 본문 한도는 EUC-KR 기준 2,000바이트(한글 2바이트). 초과분은 잘라서 발송 실패를 막는다.
// 코드포인트 단위로 순회한다 — UTF-16 인덱스로 자르면 이모지(서로게이트 쌍) 한가운데가
// 잘려 비정상 문자열이 되고, 그대로 직렬화하면 발송 자체가 깨질 수 있다.
function truncateToLmsBytes(text: string, maxBytes = 1900): string {
  let bytes = 0;
  let out = "";
  for (const ch of text) {
    bytes += (ch.codePointAt(0) ?? 0) > 0x7f ? 2 : 1;
    if (bytes > maxBytes) return out + "…";
    out += ch;
  }
  return text;
}

// Solapi 발송 API 공통 호출. 예외는 삼켜서 호출부 흐름을 보호한다.
async function postMessage(
  apiKey: string,
  apiSecret: string,
  message: Record<string, unknown>
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const date = new Date().toISOString();
    const salt = randomSalt();
    const signature = await hmacSha256Hex(apiSecret, date + salt);
    const resp = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    if (!resp.ok) {
      return { ok: false, reason: `solapi_${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// 알림톡 1건 발송. 설정 누락 시 조용히 skip.
// 알림톡 요청이 거절되면(템플릿 심사 중/반려 등 — Solapi는 미승인 템플릿을 400으로 거절한다.
// 2026-08-31 실측) 같은 내용을 문자(LMS)로 직접 대체 발송해 알림이 끊기지 않게 한다.
// 템플릿이 승인된 뒤에는 알림톡으로 나가고, 수신자가 카톡을 못 받는 경우의 문자 대체는
// disableSms:false + text 로 Solapi가 처리한다.
export async function sendAlimtalk(
  env: NotifyEnv,
  templateId: string,
  variables: Record<string, string>,
  fallbackText: string,
  to?: string
): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = env.SOLAPI_API_KEY;
  const apiSecret = env.SOLAPI_API_SECRET;
  const from = env.SOLAPI_SENDER;
  const recipient = to || env.ALERT_TO_PHONE;

  if (!apiKey || !apiSecret || !from || !recipient) {
    return { ok: false, reason: "solapi_not_configured" };
  }

  // 알림톡 본문은 변수 치환 후 1,000자 한도 — 빈 변수는 치환 실패를 막기 위해 "-"로,
  // 긴 변수는 잘라서 한도 초과로 인한 발송 실패를 줄인다.
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    vars[k] = (v.trim() || "-").slice(0, 600);
  }

  const base = {
    to: recipient.replace(/[^0-9]/g, ""),
    from: from.replace(/[^0-9]/g, ""),
    text: truncateToLmsBytes(fallbackText),
  };

  const ata = await postMessage(apiKey, apiSecret, {
    ...base,
    type: "ATA",
    kakaoOptions: {
      pfId: KAKAO_PF_ID,
      templateId,
      variables: vars,
      disableSms: false,
    },
  });
  if (ata.ok) return ata;

  const sms = await postMessage(apiKey, apiSecret, base);
  return sms.ok ? { ok: true } : { ok: false, reason: `ata_${ata.reason}/sms_${sms.reason}` };
}
