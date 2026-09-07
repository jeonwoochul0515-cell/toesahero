// 칼럼 본문에 적힌 웹툰 대사를 읽어 컷으로 만든다.
//
// 본문 표기(마크다운 안에 그대로 둔다)
//   :::웹툰 통보만으로 효력이 생깁니다
//   손님: 사직서를 냈는데 안 받아준대요
//   히로|calm: 받아주고 말고가 아니에요
//   :::
//
// 대사를 본문에 두는 이유 — 글마다 상황이 다르니 그림도 달라야 하고,
// 글을 고치는 사람이 코드를 건드리지 않고 대사를 바꿀 수 있어야 한다.
import type { MascotPose } from "../components/Mascot";
import type { WebtoonPanel } from "../components/WebtoonStrip";

export type WebtoonBlock = {
  caption?: string;
  /** public/webtoon/<image>.jpg — 캡션 줄 끝에 "@이름"으로 지정한다 */
  image?: string;
  panels: WebtoonPanel[];
};

export type PostChunk =
  | { kind: "md"; text: string }
  | { kind: "webtoon"; block: WebtoonBlock };

const POSES: MascotPose[] = ["stand", "wave", "fly", "wink", "shock", "empathy"];

function parseBlock(raw: string): WebtoonBlock {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let caption =
    lines[0]?.startsWith("손님") || lines[0]?.startsWith("히로") ? undefined : lines.shift();
  // 캡션 끝의 "@파일이름"은 삽화 지정이다. 캡션 문구에서 떼어 낸다.
  let image: string | undefined;
  if (caption) {
    const m = caption.match(/\s*@([a-z0-9-]+)\s*$/i);
    if (m) {
      image = m[1];
      caption = caption.slice(0, m.index).trim() || undefined;
    }
  }
  const panels: WebtoonPanel[] = [];
  for (const l of lines) {
    const m = l.match(/^(손님|히로)(?:\|([a-z]+))?\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const pose = POSES.includes(m[2] as MascotPose) ? (m[2] as MascotPose) : undefined;
    panels.push({ who: m[1] as "손님" | "히로", line: m[3].trim(), pose });
  }
  return { caption, image, panels };
}

/** 본문을 마크다운 조각과 웹툰 컷으로 나눈다. 순서는 본문에 적힌 그대로 유지한다. */
export function splitPostBody(markdown: string): PostChunk[] {
  if (!markdown) return [];
  const out: PostChunk[] = [];
  const re = /:::웹툰\s*\n([\s\S]*?)\n:::/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const before = markdown.slice(last, m.index);
    if (before.trim()) out.push({ kind: "md", text: before });
    const block = parseBlock(m[1]);
    if (block.panels.length) out.push({ kind: "webtoon", block });
    last = m.index + m[0].length;
  }
  const rest = markdown.slice(last);
  if (rest.trim()) out.push({ kind: "md", text: rest });
  return out;
}

/** 구조화 데이터·요약에는 그림 표기가 섞이면 안 되므로 떼어 낸 본문을 준다. */
export function stripWebtoon(markdown: string): string {
  return (markdown || "").replace(/:::웹툰\s*\n[\s\S]*?\n:::/g, "").replace(/\n{3,}/g, "\n\n");
}
