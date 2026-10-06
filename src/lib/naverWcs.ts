// 네이버 광고 전환 추적(프리미엄 로그분석, 신 스크립트 wcs.trans) — 페이지 조회·상담 접수·전화·카톡 클릭을 네이버 광고 보고서로 보낸다.
// 규격: https://naver.github.io/conversion-tracking/pages/01_script_guide_wcstrans/ (구 방식 wcs.cnv와 섞지 않는다)
// 네이버로 가는 것은 방문한 페이지 주소와 "전환이 일어났다"는 사실뿐이다. 이름·연락처·금액은 넣지 않는다.

/** 네이버 공통키(광고주센터 → 도구 → 프리미엄 로그분석). 사이트에 공개되는 값이다. */
export const NAVER_WCS_KEY = "s_37a4386d8a06";
const COOKIE_DOMAIN = "toesahero.com";
const OFFICE_TEL = "16604452";

// 전환 유형 — call·inquiry는 공식 표에서 "광고보고서 제공 X"라 보고서에 나오는 사용자정의 유형을 쓴다.
export const NAVER_CONV = {
  lead: "lead", // 상담 접수(연락처 제출) 성공
  call: "custom001", // 전화(tel:) 버튼 클릭
  kakao: "custom002", // 카카오톡 채널 클릭
} as const;

type Wcs = { inflow: (domain: string) => void; trans: (conv: { type: string }) => void };
declare global {
  interface Window {
    wcs?: Wcs;
    wcs_add?: Record<string, string>;
    wcs_do?: () => void;
  }
}

let loading: Promise<boolean> | null = null;

/** wcslog.js를 한 번만 불러오고 공통 설정(wa·inflow)을 한다. 실패해도 화면은 그대로 돈다. */
function load(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (loading) return loading;
  loading = new Promise<boolean>((resolve) => {
    const setup = () => {
      if (!window.wcs) return resolve(false);
      try {
        window.wcs_add = window.wcs_add || {};
        window.wcs_add["wa"] = NAVER_WCS_KEY;
        window.wcs.inflow(COOKIE_DOMAIN);
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    const s = document.createElement("script");
    s.src = "https://wcs.naver.net/wcslog.js";
    s.async = true;
    s.onload = setup;
    s.onerror = () => resolve(false); // 광고 차단기 등 — 사이트 동작에는 영향 없음
    document.head.appendChild(s);
  });
  return loading;
}

/** 페이지 조회 1건. SPA라 경로가 바뀔 때마다 부른다. */
export async function naverPageView(): Promise<void> {
  if (!(await load())) return;
  try {
    window.wcs_do?.();
  } catch {
    /* 전송 실패가 화면을 막지 않게 한다 */
  }
}

/** 전환 1건. 상담 접수는 성공 응답을 받은 뒤에만 부른다. */
export async function naverConversion(type: string): Promise<void> {
  if (!(await load())) return;
  try {
    window.wcs?.trans({ type });
  } catch {
    /* 전환 전송 실패가 접수 완료 안내를 막아서는 안 된다 */
  }
}

let clicksBound = false;
/** 전화·카톡 링크 클릭을 문서 전체에서 한 번에 잡는다(링크마다 코드를 달지 않는다). */
export function bindNaverClickConversions(): void {
  if (typeof document === "undefined" || clicksBound) return;
  clicksBound = true;
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      // 사무소 번호만 센다 — 대화창의 고용노동부(1350)·경찰(109) 안내 번호는 전환이 아니다.
      if (href.startsWith("tel:") && href.replace(/\D/g, "") === OFFICE_TEL) void naverConversion(NAVER_CONV.call);
      else if (/^https?:\/\/(pf|open)\.kakao\.com\//.test(href)) void naverConversion(NAVER_CONV.kakao);
    },
    true
  );
}
