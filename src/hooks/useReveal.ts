// 스크롤 시 .reveal 요소에 .in 클래스를 붙여 페이드인시키는 공용 훅
import { useEffect } from "react";

export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    // 이미 화면에 들어와 있는 것은 먼저 표시해 둔다.
    // 아래에서 숨김 규칙을 켤 때 보이던 글이 깜빡이며 사라지지 않게 하기 위함이다.
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
    });

    // 숨김 규칙(.reveal-ready .reveal)은 이 훅이 실제로 돈 뒤에만 켠다.
    // 스크립트가 깨져 여기까지 오지 못하면 글이 그대로 보인다
    // (2026-09-07 홈 화면 공백 사고의 재발 방지).
    document.documentElement.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
