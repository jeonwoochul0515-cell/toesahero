import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchPostBySlug, type PostDoc } from "../firebase";
import { PRERENDERED_POSTS } from "../generated/posts";
import {
  usePageMeta,
  articleJsonLd,
  breadcrumbJsonLd,
} from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";
import { linkLawArticles } from "../lib/lawLinks";

function fmtDate(ts: PostDoc["publishedAt"]): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 칼럼 → 관련 노동분쟁 랜딩 매핑(태그·slug 기반, Firestore 본문 수정 없이 역링크·OSMU)
function relatedLanding(post: PostDoc): { to: string; label: string } | null {
  const hay = `${post.slug} ${post.title} ${post.tags.join(" ")}`;
  const rules: { test: RegExp; to: string; label: string }[] = [
    { test: /부당해고|해고|전보|전직/, to: "/unfair-dismissal", label: "부당해고 대응 알아보기" },
    { test: /괴롭힘/, to: "/harassment", label: "직장 내 괴롭힘 대응 알아보기" },
    { test: /퇴직금|severance/, to: "/severance-pay", label: "퇴직금 회수 알아보기" },
    { test: /임금체불|체불|임금/, to: "/unpaid-wages", label: "임금·퇴직금 회수 알아보기" },
    { test: /5인 미만|small-business/, to: "/small-business", label: "5인 미만 사업장 알아보기" },
  ];
  return rules.find((r) => r.test.test(hay)) ?? null;
}

export function BlogPost() {
  const { slug } = useParams();
  // 빌드타임 정적 글로 초기화 → 프리렌더 시 본문·메타·JSON-LD 가 HTML 에 직렬화된다.
  const prerendered = PRERENDERED_POSTS.find((p) => p.slug === slug) ?? null;
  const [post, setPost] = useState<PostDoc | null>(prerendered);
  const [loaded, setLoaded] = useState(prerendered != null);

  const isoDate = post?.publishedAt
    ? new Date(post.publishedAt.seconds * 1000).toISOString()
    : undefined;
  const updatedIso = post?.updatedAt
    ? new Date(post.updatedAt.seconds * 1000).toISOString()
    : isoDate;

  const seo = usePageMeta({
    title: post?.title ?? "법률 칼럼",
    description: post?.excerpt ?? "법률사무소 청송law 김창희 변호사 법률 칼럼",
    canonical: `/blog/${slug ?? ""}`,
    keywords: post?.tags ?? ["법률 칼럼", "노동법", "변호사", "김창희"],
    ogType: post ? "article" : "website",
    jsonLd: post
      ? [
          articleJsonLd({
            title: post.title,
            description: post.excerpt,
            url: `/blog/${post.slug}`,
            datePublished: isoDate,
            dateModified: updatedIso,
            author: post.author,
          }),
          breadcrumbJsonLd([
            { name: "홈", url: "/" },
            { name: "법률 칼럼", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ]),
        ]
      : undefined,
  });

  useEffect(() => {
    let cancel = false;
    if (!slug) {
      setLoaded(true);
      return;
    }
    void fetchPostBySlug(slug).then((p) => {
      if (cancel) return;
      // 라이브 글을 못 가져오면(미설정·오류) 프리렌더 정적 글을 유지
      if (p) setPost(p);
      setLoaded(true);
    });
    return () => {
      cancel = true;
    };
  }, [slug]);

  if (!loaded) {
    return (
      <div className="page-static">
        <p className="my-loading">로딩 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-static">
        <header className="page-static-header">
          <Link to="/blog" className="my-back">← 칼럼 목록</Link>
        </header>
        <main className="page-static-main">
          <p style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            존재하지 않는 글이거나 비공개 처리되었습니다.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="page-static">
      {seo}
      <header className="page-static-header">
        <Link to="/blog" className="my-back">← 칼럼 목록</Link>
      </header>

      <main className="blog-post-main">
      <article className="blog-post">
        <div className="blog-post-emoji">{post.coverEmoji ?? "⚖️"}</div>
        <div className="blog-post-tags">
          {post.tags.map((t) => (
            <span key={t} className="blog-tag">#{t}</span>
          ))}
        </div>
        <h1 className="blog-post-title">{post.title}</h1>
        <div className="blog-post-meta">
          <strong>{post.author}</strong>
          <time>{fmtDate(post.publishedAt)}</time>
          {post.updatedAt &&
            post.publishedAt &&
            post.updatedAt.seconds - post.publishedAt.seconds > 86400 && (
              <span className="blog-post-updated">
                (수정: {fmtDate(post.updatedAt)})
              </span>
            )}
        </div>

        {/* 두괄식 요약 — 글 전체를 읽기 전에 답부터 준다.
            사람은 답을 빨리 찾고, 답변엔진은 이 문단을 인용한다. */}
        {post.excerpt && <div className="lead-box">{post.excerpt}</div>}

        <div className="blog-post-body">
          {/* 본문의 법령 조문을 법제처 원문 링크로 바꿔 근거를 확인할 수 있게 한다 */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {linkLawArticles(post.body)}
          </ReactMarkdown>
        </div>

        <footer className="blog-post-foot">
          <p>
            <strong><Icon name="pin" size={18} /> 법률 자문 안내</strong>
            <br />
            본 칼럼은 일반적 정보 제공을 목적으로 합니다. 구체적 사안에
            대한 정확한 법률 자문이 필요하신 경우 카카오톡 채널 또는 <Icon name="phone" size={14} />
            1660-4452 로 변호사와 직접 상담하세요.
          </p>
          <div className="blog-post-cta">
            {(() => {
              const rel = relatedLanding(post);
              return rel ? (
                <Link to={rel.to} className="btn primary">
                  <Icon name="scale" size={16} /> {rel.label}
                </Link>
              ) : (
                <Link to="/" className="btn primary">홈으로</Link>
              );
            })()}
            <a
              href="https://pf.kakao.com/_zkzIX"
              target="_blank"
              rel="noopener noreferrer"
              className="btn yellow"
            >
              <Icon name="chat" size={16} /> 카카오톡 채널 상담
            </a>
            <Link to="/calc" className="btn">
              <Icon name="calc" size={16} /> 임금 계산기
            </Link>
          </div>
        </footer>
      </article>
      </main>

      <div className="page-static-foot">
        이 글은 일반적인 법률 정보이며 구체적 사건의 자문이 아닙니다. 개별 사안은
        사실관계에 따라 결론이 달라질 수 있으니 변호사 상담을 통해 확인하시기 바랍니다.
        <br />
        본 사이트는 「변호사법」 제23조에 따른 광고물입니다. 법률사무소 청송law ·
        변호사 김창희 · 대한변호사협회 등록.
      </div>
    </div>
  );
}
