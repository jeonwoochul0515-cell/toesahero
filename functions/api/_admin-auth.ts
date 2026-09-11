// 관리자 전용 API를 지키는 공용 검문소 — Firebase ID 토큰을 확인하고 admins 문서를 대조한다.
// 사무소 명의로 나가는 동작(통보문 메일 발송 등)은 반드시 이 검문을 거쳐야 한다.
// send-letter 가 아무 인증 없이 열려 있어 외부인이 사무소 이름으로 메일을 보낼 수 있었다
// (2026-09-12 예행연습 점검에서 발견).

import { getDoc, type FirestoreEnv } from "./_firestore";

export interface AdminAuthEnv extends FirestoreEnv {
  // 브라우저에 이미 공개되는 값이라 비밀이 아니다. 토큰 검증 호출에만 쓴다.
  VITE_FIREBASE_API_KEY?: string;
  FIREBASE_WEB_API_KEY?: string;
}

// 같은 사이트에서 온 요청만 받는다. notify.ts 와 같은 기준을 쓴다.
const ALLOWED_ORIGIN =
  /^https?:\/\/([a-z0-9-]+\.)?toesahero\.com(\/|$)|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)|^https:\/\/[a-z0-9-]+\.toesahero\.pages\.dev(\/|$)/i;

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  return ALLOWED_ORIGIN.test(origin);
}

export type AdminCheck =
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string; message: string };

/**
 * Authorization: Bearer <Firebase ID 토큰> 을 확인하고, 그 사용자가 admins 에 있는지 본다.
 * 토큰 검증은 Identity Toolkit 의 accounts:lookup 으로 한다 — 만료·위조 토큰은 여기서 걸린다.
 */
export async function requireAdmin(
  request: Request,
  env: AdminAuthEnv
): Promise<AdminCheck> {
  if (!originAllowed(request)) {
    return { ok: false, status: 403, error: "forbidden_origin", message: "허용되지 않은 요청 경로입니다." };
  }

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!idToken) {
    return { ok: false, status: 401, error: "no_token", message: "관리자 로그인이 필요합니다." };
  }

  const apiKey = env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    // 검증할 방법이 없으면 통과시키지 않는다. 열어 두는 것보다 막는 쪽이 안전하다.
    return { ok: false, status: 503, error: "auth_not_configured", message: "관리자 확인 설정이 되어 있지 않습니다." };
  }

  let uid: string;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) {
      return { ok: false, status: 401, error: "invalid_token", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    }
    const data = (await resp.json()) as { users?: { localId?: string }[] };
    const found = data.users?.[0]?.localId;
    if (!found) {
      return { ok: false, status: 401, error: "invalid_token", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    }
    uid = found;
  } catch {
    return { ok: false, status: 503, error: "auth_check_failed", message: "관리자 확인 중 연결이 끊겼습니다. 잠시 후 다시 시도해 주세요." };
  }

  try {
    const adminDoc = await getDoc(env, `admins/${uid}`);
    if (!adminDoc) {
      return { ok: false, status: 403, error: "not_admin", message: "관리자 권한이 없습니다." };
    }
  } catch {
    return { ok: false, status: 503, error: "admin_lookup_failed", message: "관리자 확인 중 오류가 발생했습니다." };
  }

  return { ok: true, uid };
}
