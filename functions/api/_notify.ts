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
          text,
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
