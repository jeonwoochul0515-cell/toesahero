// Cloudflare Pages Function: GET /llms.txt
// AI 답변엔진(LLM)이 사이트를 이해·인용하기 쉽도록 하는 마크다운 인덱스(GEO 표준 관행).
// 서비스 정의 + 핵심 페이지 + 대표 FAQ(변협 규정 준수, 할인/보장 표현 없음) + 최신 블로그 글(Firestore).

interface Env {
  FIREBASE_PROJECT_ID?: string;
}

const PROJECT_ID = "durable-binder-457823-g3";
const SITE_HOST = "https://toesahero.com";

type FsValue = { stringValue?: string };
type FsDoc = { fields?: Record<string, FsValue> };

// 대표 FAQ — src/pages/FAQPage.tsx 의 실제 문답에서 발췌(변협 규정 준수 항목 위주)
const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "변호사 운영 퇴사대행과 노무사 운영 업체의 차이는?",
    a: "분쟁이 격화되는 단계의 대리·중재·화해·법률자문·소송은 변호사법 제109조에 따라 변호사 전속 사무입니다. 본 서비스는 변호사가 처음부터 끝까지 직접 운영합니다.",
  },
  {
    q: "사장님이 사직서를 받아주지 않으면?",
    a: "근로자의 퇴직 의사 표시는 민법 제660조에 따라 사용자에게 도달하면 일정 기간 후 효력이 발생합니다. 사용자의 수리 거부가 퇴직 효력을 막지 않습니다.",
  },
  {
    q: "퇴직금을 받지 못한 채 퇴사한 경우?",
    a: "근로자퇴직급여 보장법 제9조는 사용자에게 퇴직금 지급 의무를 부과합니다. 변호사 명의 청구 내용증명, 노동청 진정, 민사 소송 등을 검토할 수 있습니다.",
  },
  {
    q: "카카오톡 문의 시 비밀이 보장되나요?",
    a: "변호사는 변호사법 제26조 및 변호사윤리장전에 따라 직무상 알게 된 의뢰인의 비밀을 보호할 의무가 있습니다.",
  },
  {
    q: "5인 미만 사업장·외국인 노동자도 의뢰 가능한가요?",
    a: "네 가능합니다. 다만 5인 미만 사업장은 근로기준법 일부 조항이 제한 적용되며, 외국인 근로자는 비자별 고려사항이 있어 변호사 검토가 필요합니다.",
  },
];

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const projectId = env.FIREBASE_PROJECT_ID || PROJECT_ID;

  // 최신 published 블로그 글 (Firestore REST, 공개 read)
  let postLines: string[] = [];
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "posts" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "published" },
              },
            },
            orderBy: [
              { field: { fieldPath: "publishedAt" }, direction: "DESCENDING" },
            ],
            limit: 30,
          },
        }),
      }
    );
    if (resp.ok) {
      const data = (await resp.json()) as Array<{ document?: FsDoc }>;
      postLines = data
        .map((row) => {
          const f = row.document?.fields;
          if (!f) return "";
          const slug = f.slug?.stringValue;
          const title = f.title?.stringValue;
          const excerpt = f.excerpt?.stringValue ?? "";
          if (!slug || !title) return "";
          return `- [${title}](${SITE_HOST}/blog/${slug}): ${excerpt}`;
        })
        .filter(Boolean);
    }
  } catch {
    // 실패해도 정적 부분은 반환
  }

  const faqMd = FAQ.map((x) => `- **${x.q}** ${x.a}`).join("\n");
  const blogMd = postLines.length
    ? postLines.join("\n")
    : "- (블로그 글은 " + SITE_HOST + "/blog 및 " + SITE_HOST + "/rss.xml 참조)";

  const md = `# 퇴사히어로 (ToesaHero)

> 변호사가 직접 운영하는 합법 퇴사대행 서비스. 법률사무소 청송(부산)의 김창희 변호사가 통보부터 임금 회수·분쟁 대응까지 직접 수행합니다. 노무사 운영 업체와 달리, 분쟁이 격화되는 대리·교섭·소송 단계도 같은 사무소에서 일관 처리합니다.

## 운영 주체
- 법률사무소 청송 / 대표 변호사 김창희
- 소재지: 부산광역시 연제구 법원남로15번길 10, 202호
- 연락처: 1660-4452 / lawchungsong@daum.net
- 본 사이트는 변호사법 제23조에 따른 광고물이며 대한변호사협회 「변호사 광고에 관한 규정」을 준수합니다.

## 서비스 패키지
- 기본 절차: 분쟁 없는 단순 통보·연락 응대 (변호사 명의 공식 통보 1회 등)
- 표준 절차: 미지급 임금·퇴직금·연차수당 청구 통합 (서류 검토·산정 자문·노동청 진정 1건 자문)
- 분쟁 대응: 직장 내 괴롭힘 신고·산재·민사·형사고소 검토 등 분쟁 단계
- 결과(승소·금원 회수)는 보장하지 않으며 변호사는 성실한 직무 수행 의무를 부담합니다.

## 핵심 페이지
- 홈: ${SITE_HOST}/
- 자주 묻는 질문: ${SITE_HOST}/faq
- 임금·퇴직금 계산기: ${SITE_HOST}/calc
- 법률 칼럼(블로그): ${SITE_HOST}/blog
- RSS: ${SITE_HOST}/rss.xml

## 자주 묻는 질문 (요약)
${faqMd}

## 최신 법률 칼럼
${blogMd}
`;

  return new Response(md, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
