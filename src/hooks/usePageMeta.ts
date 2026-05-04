import { useEffect } from "react";

const SITE_NAME = "퇴사히어로";
const SITE_HOST = "https://toesahero.com";
const DEFAULT_OG_IMAGE = `${SITE_HOST}/og-image.svg`;

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

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

const PAGE_LD_ID = "page-jsonld";

function setPageJsonLd(jsonLd: object | object[] | undefined) {
  // 이전 페이지 JSON-LD 제거
  document
    .querySelectorAll(`script[data-page-ld="${PAGE_LD_ID}"]`)
    .forEach((s) => s.remove());
  if (!jsonLd) return;
  const list = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  for (const data of list) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-page-ld", PAGE_LD_ID);
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

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

  useEffect(() => {
    document.title = fullTitle;
    setMeta("description", meta.description);
    if (keywords) setMeta("keywords", keywords);
    setMeta(
      "robots",
      meta.noIndex ? "noindex, nofollow" : "index, follow"
    );

    // OpenGraph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", meta.description, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", "ko_KR", "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", ogImage);

    // Canonical
    setLink("canonical", canonicalUrl);

    // JSON-LD
    setPageJsonLd(meta.jsonLd);

    // 페이지 떠날 때 noIndex 해제 + JSON-LD 정리
    return () => {
      setPageJsonLd(undefined);
    };
  }, [
    fullTitle,
    meta.description,
    canonicalUrl,
    ogImage,
    ogType,
    keywords,
    meta.noIndex,
    meta.jsonLd,
  ]);
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
    worksFor: {
      "@type": "LegalService",
      name: "법률사무소 청송",
    },
  },
  publisher: {
    "@type": "Organization",
    name: "법률사무소 청송",
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
