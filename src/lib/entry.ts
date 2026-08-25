// 방문자 유입 경로 판별 — 히로 첫인사를 경로에 맞추기 위한 클라이언트 전용 모듈(서버 전송 없음).
// attribution.js(defer)가 광고 파라미터를 localStorage(cs_attr_last)에 보존하므로,
// 여기서는 그 저장값의 신선도를 확인해 이번 방문의 경로로 쓴다.
export interface Entry {
  kind: "ad" | "search" | "sns" | "blog" | "kakao" | "direct";
  query?: string; // 광고 클릭 시 방문자가 실제 검색한 말(n_query) 또는 입찰 키워드
  via?: string; // 네이버·구글·다음·인스타그램·페이스북 등
}

const KEY = "hiro:entry";
const FRESH_MS = 30 * 60 * 1000;

// attribution.js가 저장한 마지막 유입 기록 — 30분 이내일 때만 "이번 방문"으로 인정
function freshAttr(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem("cs_attr_last");
    if (!raw) return null;
    const a = JSON.parse(raw) as Record<string, string>;
    const t = Date.parse((a.at || "").replace(" ", "T") + ":00Z"); // at은 UTC 분 단위
    if (!Number.isFinite(t) || Date.now() - t > FRESH_MS) return null;
    return a;
  } catch {
    return null;
  }
}

// 인사에 되읽어 줘도 안전한 검색어만 통과 — 너무 길거나 번호 같은 건 버린다
function safeQuery(q: string | undefined): string | undefined {
  const s = (q || "").replace(/\+/g, " ").trim();
  if (s.length < 2 || s.length > 20) return undefined;
  if (/\d{7,}/.test(s)) return undefined;
  return s;
}

function detect(): Entry {
  const a = freshAttr() || {};
  const ref = a.ref || document.referrer || "";

  if (a.n_query || a.n_keyword)
    return { kind: "ad", via: "네이버", query: safeQuery(a.n_query) || safeQuery(a.n_keyword) };
  const utm = (a.utm_source || "").toLowerCase();
  if (a.fbclid || /insta|facebook|meta|^ig$|^fb$/.test(utm))
    return { kind: "sns", via: /insta|^ig$/.test(utm) ? "인스타그램" : "SNS" };
  if (a.gclid) return { kind: "search", via: "구글" };

  const host = (() => {
    try {
      return new URL(ref).hostname;
    } catch {
      return "";
    }
  })();
  if (/blog\.naver\.com|tistory\.com|brunch\.co\.kr/.test(host)) return { kind: "blog" };
  if (/search\.naver|(^|\.)naver\.com/.test(host)) return { kind: "search", via: "네이버" };
  if (/google\./.test(host)) return { kind: "search", via: "구글" };
  if (/daum\.net/.test(host)) return { kind: "search", via: "다음" };
  if (/instagram\.com/.test(host)) return { kind: "sns", via: "인스타그램" };
  if (/facebook\.com|fb\.com/.test(host)) return { kind: "sns", via: "페이스북" };
  if (/kakao/.test(host)) return { kind: "kakao" };
  if (host && host !== location.hostname) return { kind: "search", via: undefined }; // 기타 외부 유입
  return { kind: "direct" };
}

// 탭 세션당 한 번만 판별해 고정 — 내부 이동으로 경로 정보가 사라져도 첫인사가 흔들리지 않게
export function getEntry(): Entry {
  try {
    const cached = sessionStorage.getItem(KEY);
    if (cached) return JSON.parse(cached) as Entry;
  } catch {
    /* 못 읽으면 새로 판별 */
  }
  const e = detect();
  try {
    sessionStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* 저장 실패 무시 */
  }
  return e;
}
