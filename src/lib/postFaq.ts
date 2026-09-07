// 칼럼 본문의 「자주 묻는 질문」을 읽어 FAQPage 구조화 데이터로 만든다.
// 글마다 손으로 JSON-LD를 붙이지 않아도 되고, 화면에 보이는 문답과 항상 일치한다.
// (화면에 없는 내용을 스키마에만 넣으면 스팸으로 취급된다 — 전역 SEO 가이드 6절)

export type Faq = { q: string; a: string };

/**
 * 본문에서 문답을 뽑는다. 아래 형식을 인식한다.
 *   **Q. 질문?**
 *   A. 답변
 */
export function extractFaqs(markdown: string): Faq[] {
  if (!markdown) return [];
  const out: Faq[] = [];
  const re = /\*\*Q[.:]\s*([^*]+?)\*\*\s*\n+A[.:]\s*([\s\S]*?)(?=\n\s*\*\*Q[.:]|\n\s*##\s|\n\s*---|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const q = m[1].trim();
    const a = m[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 링크는 글자만 남긴다
      .replace(/[*_`>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

export function faqPageJsonLd(faqs: Faq[]): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
