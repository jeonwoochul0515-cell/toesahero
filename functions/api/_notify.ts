// SOLAPI 문자(SMS/LMS) 발송 공통 헬퍼.
// 결제 완료/실패, 신규 상담 신청 등 이벤트 발생 시 변호사에게 문자로 알린다.
// 시크릿(SOLAPI_API_SECRET)은 CF Pages 서버 env에만 둔다. 발송 실패가 본 흐름을 막지 않도록 격리한다.

export interface NotifyEnv {
  SOLAPI_API_KEY?: string;
  SOLAPI_API_SECRET?: string;
  SOLAPI_SENDER?: string; // 사전 등록된 발신번호
  ALERT_TO_PHONE?: string; // 기본 수신번호 (변호사)
}

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

// 문자 1건 발송. 설정 누락 시 조용히 skip, 예외는 삼켜서 호출부 흐름을 보호한다.
export async function sendSms(
  env: NotifyEnv,
  text: string,
  to?: string
): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = env.SOLAPI_API_KEY;
  const apiSecret = env.SOLAPI_API_SECRET;
  const from = env.SOLAPI_SENDER;
  const recipient = to || env.ALERT_TO_PHONE;

  if (!apiKey || !apiSecret || !from || !recipient) {
    return { ok: false, reason: "solapi_not_configured" };
  }

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
      body: JSON.stringify({
        message: {
          to: recipient.replace(/[^0-9]/g, ""),
          from: from.replace(/[^0-9]/g, ""),
          text: truncateToLmsBytes(text),
        },
      }),
    });
    if (!resp.ok) {
      return { ok: false, reason: `solapi_${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
