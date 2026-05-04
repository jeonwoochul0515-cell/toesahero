// Cloudflare Pages Function: POST /api/send-letter
// 변호사 명의 통보문/내용증명 이메일 자동 발송 (Resend)
//
// 어드민이 ConsultationDetail에서 [📧 이메일 발송] 버튼을 클릭하면 호출됩니다.
// 발송 후 Firestore의 draftStatus/noticeStatus 를 'sent'로 업데이트합니다.

interface Env {
  RESEND_API_KEY?: string;
  // FROM 주소: 도메인 검증 후 noreply@toesahero.kr 같은 형태로 사용
  // 미설정 시 Resend 의 onboarding 임시 도메인 활용
  RESEND_FROM_EMAIL?: string;
  // BCC: 변호사가 발송 기록을 본인 메일에서도 받기 위함
  RESEND_BCC_EMAIL?: string;
}

type LetterKind = "draft" | "notice";

type RequestBody = {
  to: string; // 회사 인사담당자 이메일
  toName?: string; // 회사명 또는 담당자명
  subject?: string; // 메일 제목 (생략 시 기본값)
  kind: LetterKind;
  letterText: string; // 통보문/내용증명 텍스트
  caseId: string; // Firestore consultation id (참조용)
  clientName?: string;
};

const DEFAULT_FROM = "법률사무소 청송 <onboarding@resend.dev>";
const DEFAULT_REPLY_TO = "lawchungsong@daum.net";

const SUBJECT_BY_KIND: Record<LetterKind, string> = {
  draft: "[법률사무소 청송] 의뢰인 퇴직 의사 통보 및 후속 절차 안내",
  notice: "[법률사무소 청송] 미지급 임금 등 청구 내용증명",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(letterText: string, kind: LetterKind, clientName?: string): string {
  const heading = kind === "draft" ? "퇴직 의사 통보" : "미지급 임금 등 청구";
  const safeBody = escapeHtml(letterText).replace(/\n/g, "<br />");
  const clientLine = clientName
    ? `<p style="font-size:13px;color:#666;margin:4px 0;">의뢰인: ${escapeHtml(clientName)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${heading} — 법률사무소 청송</title>
</head>
<body style="margin:0;padding:0;background:#f4f1e8;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:3px double #111;border-radius:8px;padding:40px 36px;">
          <tr>
            <td>
              <h1 style="margin:0 0 4px;font-size:22px;color:#0a0a0a;letter-spacing:-0.02em;font-weight:900;">법률사무소 청송</h1>
              <p style="margin:0;font-size:12px;color:#444;line-height:1.5;">
                대표 변호사 김창희 · 부산광역시 연제구 법원남로15번길 10, 202호<br />
                ☎ 1660-4452 · lawchungsong@daum.net
              </p>
              ${clientLine}
              <hr style="border:none;border-top:1.5px solid #111;margin:18px 0;" />
              <h2 style="margin:0 0 14px;font-size:16px;color:#0a0a0a;font-weight:800;">${heading}</h2>
              <pre style="white-space:pre-wrap;word-break:keep-all;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14px;line-height:1.85;color:#111;margin:0;">${safeBody}</pre>
              <hr style="border:none;border-top:1.5px solid #111;margin:24px 0 16px;" />
              <p style="font-size:11px;color:#666;margin:0;line-height:1.6;">
                본 메일은 「변호사법」 제3조에 따른 변호사 직무 행위입니다.<br />
                본 사이트 및 서비스는 「변호사법」 제23조에 따른 광고물입니다.<br />
                회신은 본 사무소(☎ 1660-4452 · lawchungsong@daum.net)로 부탁드립니다.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin-top:14px;font-size:11px;color:#888;">© 법률사무소 청송 · 변호사 김창희 · 대한변호사협회 등록</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.RESEND_API_KEY) {
    return jsonResponse(
      {
        error: "email_not_configured",
        message:
          "이메일 발송 인프라(Resend)가 아직 설정되지 않았습니다. 어드민에서 .txt 다운로드 후 직접 발송해 주세요.",
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

  if (!body.to || !body.letterText || !body.kind || !body.caseId) {
    return jsonResponse(
      { error: "missing_required_fields" },
      400
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }

  const subject = body.subject || SUBJECT_BY_KIND[body.kind];
  const html = buildHtml(body.letterText, body.kind, body.clientName);
  const from = env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [body.to],
        bcc: env.RESEND_BCC_EMAIL ? [env.RESEND_BCC_EMAIL] : undefined,
        reply_to: DEFAULT_REPLY_TO,
        subject,
        html,
        text: body.letterText, // 텍스트 폴백
        headers: {
          "X-Toesahero-Case-Id": body.caseId,
          "X-Toesahero-Letter-Kind": body.kind,
        },
        tags: [
          { name: "case_id", value: body.caseId.slice(0, 50) },
          { name: "kind", value: body.kind },
        ],
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

  const data = (await upstream.json()) as { id?: string };
  return jsonResponse({ ok: true, emailId: data.id ?? null });
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
