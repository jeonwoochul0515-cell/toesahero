// 라우트별 메타/OG/JSON-LD를 react-helmet-async(Head)로 렌더 — SSG 프리렌더 시 head에 직렬화됨
import { Head } from "vite-react-ssg";

const SITE_NAME = "퇴사히어로";
const SITE_HOST = "https://toesahero.com";
const DEFAULT_OG_IMAGE = `${SITE_HOST}/og-image.png`;

type PageMeta = {
  title: string; // 페이지 고유 (사이트명은 자동 추가)
  description: string;
  canonical: string; // 절대 또는 상대 path
  ogImage?: string;
  ogType?: "website" | "article";
  keywords?: string[];
  noIndex?: boolean;
  // JSON-LD 구조화 데이터 (이 페이지 전용)
  jsonLd?: object | object[];
};

// 페이지 메타를 head에 렌더하는 요소를 반환. 각 페이지는 반환값을 JSX에 그대로 넣는다.
export function usePageMeta(meta: PageMeta) {
  const fullTitle = meta.title.includes(SITE_NAME)
    ? meta.title
    : `${meta.title} — ${SITE_NAME}`;
  const canonicalUrl = meta.canonical.startsWith("http")
    ? meta.canonical
    : `${SITE_HOST}${meta.canonical}`;
  const ogImage = meta.ogImage ?? DEFAULT_OG_IMAGE;
  const ogType = meta.ogType ?? "website";
  const keywords = meta.keywords?.join(", ");
  const jsonLdList = meta.jsonLd
    ? Array.isArray(meta.jsonLd)
      ? meta.jsonLd
      : [meta.jsonLd]
    : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={meta.description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta
        name="robots"
        content={meta.noIndex ? "noindex, nofollow" : "index, follow"}
      />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ko_KR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="canonical" href={canonicalUrl} />

      {jsonLdList.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Head>
  );
}

// JSON-LD 헬퍼들
export const breadcrumbJsonLd = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: item.name,
    item: item.url.startsWith("http") ? item.url : `${SITE_HOST}${item.url}`,
  })),
});

export const articleJsonLd = (params: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author: string;
  image?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: params.title,
  description: params.description,
  url: params.url.startsWith("http") ? params.url : `${SITE_HOST}${params.url}`,
  datePublished: params.datePublished,
  dateModified: params.dateModified ?? params.datePublished,
  image: params.image ?? DEFAULT_OG_IMAGE,
  author: {
    "@type": "Person",
    name: params.author,
    jobTitle: "변호사",
    url: "https://chang-hee.kim",
    sameAs: ["https://chang-hee.kim"],
    worksFor: {
      "@type": "LegalService",
      name: "법률사무소 청송",
      url: "https://chang-hee.kim",
    },
  },
  publisher: {
    "@type": "Organization",
    name: "법률사무소 청송",
    url: SITE_HOST,
    sameAs: ["https://chang-hee.kim"],
    logo: {
      "@type": "ImageObject",
      url: `${SITE_HOST}/apple-touch-icon.svg`,
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": params.url.startsWith("http")
      ? params.url
      : `${SITE_HOST}${params.url}`,
  },
});

export const faqJsonLd = (qa: Array<{ q: string; a: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: qa.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
});
