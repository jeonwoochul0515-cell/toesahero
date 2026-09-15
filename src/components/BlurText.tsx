// 제목 글자를 단어 단위로 흐릿하게 띄웠다가 또렷하게 보여 주는 등장 효과(React Bits BlurText를 CSS만으로 옮김).
import { Fragment } from "react";

type Props = {
  text: string;
  delay?: number; // 첫 단어가 시작하는 시각(ms)
  step?: number; // 단어 사이 간격(ms)
};

// 글자는 그대로 HTML에 남는다 — 검색·스크린리더는 평소처럼 읽고, 움직임은 CSS(.blur-word)가 맡는다.
export function BlurText({ text, delay = 0, step = 110 }: Props) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="blur-word" style={{ animationDelay: `${delay + i * step}ms` }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
