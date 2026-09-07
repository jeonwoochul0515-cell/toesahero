// 칼럼 중간에 넣는 웹툰 컷 — 긴 글을 읽다 지치지 않게 숨을 돌리는 자리.
// 그림은 Google Flow(구글 AI Pro)로 만든 한국 웹툰풍 일러스트를 쓰고,
// 대사는 그림 위가 아니라 아래 말풍선에 둔다. 인물 위치가 컷마다 달라
// 대사를 그림에 얹으면 얼굴을 가리기 때문이다(2026-09-06).
import { Mascot, type MascotPose } from "./Mascot";

export type WebtoonPanel = {
  /** 말하는 사람. "손님"이면 왼쪽 회색, "히로"면 오른쪽 노랑 */
  who: "손님" | "히로";
  line: string;
  pose?: MascotPose;
};

type Props = {
  panels: WebtoonPanel[];
  caption?: string;
  /** public/webtoon/<image>.jpg — 없으면 대사만 보여준다 */
  image?: string;
};

/** 손님 얼굴 — 히로와 구별되는 단순한 얼굴 */
function VisitorFace({ size = 44, worried = true }: { size?: number; worried?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="52" r="34" fill="#E9E4DA" stroke="#141414" strokeWidth="5" />
      <circle cx="38" cy="46" r="4.5" fill="#141414" />
      <circle cx="62" cy="46" r="4.5" fill="#141414" />
      {worried ? (
        <>
          <path d="M30 36 L44 41" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 36 L56 41" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
          <path d="M38 70 Q50 62 62 70" stroke="#141414" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <path d="M38 64 Q50 74 62 64" stroke="#141414" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function WebtoonStrip({ panels, caption, image }: Props) {
  if (!panels.length && !image) return null;
  return (
    <figure className="webtoon">
      {image && (
        <img
          className="webtoon-art"
          src={`/webtoon/${image}.jpg`}
          alt={caption ? `삽화 — ${caption}` : "상담 장면 삽화"}
          loading="lazy"
          decoding="async"
          width={1376}
          height={768}
        />
      )}
      {caption && <div className="webtoon-cap">{caption}</div>}
      {panels.map((p, i) => {
        const mine = p.who === "히로";
        return (
          <div key={i} className={`webtoon-cut ${mine ? "hiro" : "visitor"}`}>
            <div className="webtoon-face">
              {mine ? (
                <Mascot size={44} pose={p.pose ?? "stand"} />
              ) : (
                <VisitorFace worried={p.pose !== "wave"} />
              )}
            </div>
            <div className="webtoon-bubble">
              <span className="webtoon-who">{p.who}</span>
              <p>{p.line}</p>
            </div>
          </div>
        );
      })}
    </figure>
  );
}
