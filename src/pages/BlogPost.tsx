import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchPostBySlug, type PostDoc } from "../firebase";
import {
  usePageMeta,
  articleJsonLd,
  breadcrumbJsonLd,
} from "../hooks/usePageMeta";

function fmtDate(ts: PostDoc["publishedAt"]): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<PostDoc | null>(null);
  const [loaded, setLoaded] = useState(false);

  const isoDate = post?.publishedAt
    ? new Date(post.publishedAt.seconds * 1000).toISOString()
    : undefined;
  const updatedIso = post?.updatedAt
    ? new Date(post.updatedAt.seconds * 1000).toISOString()
    : isoDate;

  usePageMeta({
    title: post?.title ?? "법률 칼럼",
    description: post?.excerpt ?? "법률사무소 청송 김창희 변호사 법률 칼럼",
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
      setPost(p);
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
      <header className="page-static-header">
        <Link to="/blog" className="my-back">← 칼럼 목록</Link>
      </header>

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
        </div>

        <div className="blog-post-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body}
          </ReactMarkdown>
        </div>

        <footer className="blog-post-foot">
          <p>
            <strong>📌 법률 자문 안내</strong>
            <br />
            본 칼럼은 일반적 정보 제공을 목적으로 합니다. 구체적 사안에
            대한 정확한 법률 자문이 필요하신 경우 카카오톡 채널 또는 ☎
            1660-4452 로 변호사와 직접 상담하세요.
          </p>
          <div className="blog-post-cta">
            <Link to="/" className="btn primary">홈으로</Link>
            <a
              href="https://pf.kakao.com/_zkzIX/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="btn yellow"
            >
              🟡 카카오톡 채널 상담
            </a>
            <Link to="/calc" className="btn">
              📊 임금 계산기
            </Link>
          </div>
        </footer>
      </article>

      <div className="page-static-foot">
        본 사이트는 「변호사법」 제23조에 따른 광고물입니다. 법률사무소 청송 ·
        변호사 김창희 · 대한변호사협회 등록.
      </div>
    </div>
  );
}
