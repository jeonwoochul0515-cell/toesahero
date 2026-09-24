// 중앙 접수함용 서면 초안 — 사이트 어드민 인쇄 화면(PrintLetter·PrintDelegation)과 같은 문안을 글자로 만든다.
// 손님에게 자동으로 보내지 않는다. 접수함 화면에 "검토 전 초안" 워터마크와 함께 뜨기만 한다.

import type { FsRow } from "./_firestore";
import { str } from "./_adminApi";

export const WATERMARK = "검토 전 초안 — 변호사 김창희 검토 후 사용";

export const DOC_TYPES = [
  { key: "letter", label: "변호사 명의 통보문 (AI 1차 초안)" },
  { key: "notice", label: "내용증명 (표준) 초안" },
  { key: "delegation", label: "전자서명 위임장" },
] as const;

export type DocKey = (typeof DOC_TYPES)[number]["key"];

const FIRM_HEAD = [
  "법률사무소 청송law",
  "담당변호사 김창희 · 부산광역시 연제구 법원남로15번길 10, 202호",
  "☎ 1660-4452 · lawchungsong@daum.net",
  "────────────────────────",
].join("\n");

type Meta = {
  docType?: string;
  birth?: string;
  address?: string;
  signedAt?: string;
  scope?: unknown;
};

const metaOf = (r: FsRow): Meta => (r.data.meta && typeof r.data.meta === "object" ? (r.data.meta as Meta) : {});

function has(r: FsRow, key: DocKey): boolean {
  if (key === "letter") return !!str(r.data.draftLetter).trim();
  if (key === "notice") return !!str(r.data.noticeLetter).trim();
  return metaOf(r).docType === "delegation";
}

/** 이 접수(최신순 상담 문서들)에서 만들 수 있는 서면 종류 */
export function availableTypes(rows: FsRow[]): Array<{ key: string; label: string }> {
  return DOC_TYPES.filter((t) => rows.some((r) => has(r, t.key))).map((t) => ({ key: t.key, label: t.label }));
}

function kstDateLabel(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
}

/** 서면 본문. 해당 서면이 없으면 null. 가장 최근 문서의 것을 쓴다. */
export function buildDocument(
  rows: FsRow[],
  key: string,
  now = new Date()
): { label: string; body: string; watermark: string } | null {
  const type = DOC_TYPES.find((t) => t.key === key);
  if (!type) return null;
  const row = rows.find((r) => has(r, type.key));
  if (!row) return null;

  if (type.key === "letter" || type.key === "notice") {
    const raw = str(type.key === "letter" ? row.data.draftLetter : row.data.noticeLetter, 20000);
    // PrintLetter 와 같이 작성일 칸을 오늘(한국시간)로 채운다.
    const filled = raw.replace(/\[작성일\]\s*\[YYYY년 MM월 DD일\]/g, `[작성일] ${kstDateLabel(now)}`);
    const foot =
      type.key === "letter"
        ? "\n\n────────────────────────\n본 통보문은 「변호사법」 제3조에 따른 변호사 직무 행위입니다."
        : "";
    return { label: type.label, body: `${FIRM_HEAD}\n\n${filled}${foot}`, watermark: WATERMARK };
  }

  // 위임장 — PrintDelegation 과 같은 항목. 서명 이미지는 글자로 옮길 수 없어 사이트 인쇄 화면을 안내한다.
  const m = metaOf(row);
  const scope = Array.isArray(m.scope) ? m.scope.filter((s): s is string => typeof s === "string") : [];
  const signed = m.signedAt ? new Date(m.signedAt) : null;
  const signedLabel = signed && !Number.isNaN(signed.getTime()) ? kstDateLabel(signed) : "";
  const body = [
    "위 임 장",
    "",
    `위임인: ${str(row.data.userName, 40) || "—"}`,
    `생년월일: ${str(m.birth, 20) || "—"}`,
    `연락처: ${str(row.data.contact, 30) || "—"}`,
    `주소: ${str(m.address, 200) || "—"}`,
    "수임인: 법률사무소 청송law 변호사 김창희 — 부산광역시 연제구 법원남로15번길 10, 202호 (☎ 1660-4452)",
    "",
    "위임인은 위임인의 노동 사안과 관련한 다음 각 사무 일체의 처리를 수임인에게 위임하였음을 확인하며, 이 건에 관한 연락은 수임인을 통하여 주실 것을 요청합니다.",
    ...scope.map((s, i) => `${i + 1}. ${s.slice(0, 200)}`),
    "",
    signedLabel,
    `위임인 ${str(row.data.userName, 40)} (전자서명)`,
    "",
    "※ 전자서명 이미지는 사이트 어드민의 위임장 인쇄 화면에서만 볼 수 있습니다.",
  ].join("\n");
  return { label: type.label, body, watermark: WATERMARK };
}
