import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublishedPosts, type PostDoc } from "../firebase";
import { PRERENDERED_POSTS } from "../generated/posts";
import { usePageMeta, breadcrumbJsonLd } from "../hooks/usePageMeta";

function fmtDate(ts: PostDoc["publishedAt"]): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogList() {
  // 빌드타임 정적 글로 초기화 → 프리렌더에 카드·내부링크가 포함된다(클라에서 최신값으로 갱신).
  const [posts, setPosts] = useState<PostDoc[]>(PRERENDERED_POSTS);
  const [loaded, setLoaded] = useState(PRERENDERED_POSTS.length > 0);

  const seo = usePageMeta({
    title: "퇴사대행 법률 칼럼 — 노동법·퇴직금 정보",
    description:
      "법률사무소 청송 김창희 변호사가 직접 쓰는 노동법·퇴사 절차·퇴직금 칼럼. 변협 광고규정을 따르는 일반 정보 제공 콘텐츠입니다.",
    canonical: "/blog",
    keywords: [
      "법률 칼럼",
      "노동법",
      "변호사 칼럼",
      "퇴사 절차",
      "퇴사대행",
      "퇴직금",
      "퇴직금 계산",
      "직장 내 괴롭힘",
      "변호사법 109조",
      "권고사직",
      "부당해고",
      "김창희 변호사",
      "법률사무소 청송",
    ],
    jsonLd: breadcrumbJsonLd([
      { name: "홈", url: "/" },
      { name: "법률 칼럼", url: "/blog" },
    ]),
  });

  useEffect(() => {
    let cancel = false;
    void fetchPublishedPosts().then((list) => {
      if (cancel) return;
      // 빈 결과(Firebase 미설정·권한오류·빈 컬렉션)면 프리렌더 정적 글을 유지 — 라이브 글이 있을 때만 갱신
      if (list.length > 0) setPosts(list);
      setLoaded(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="page-static">
      {seo}
      <header className="page-static-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="page-static-title">법률 칼럼</h1>
        <p className="page-static-sub">
          김창희 변호사가 직접 작성하는 노동법·퇴사 관련 법률 정보
        </p>
      </header>

      <main className="page-static-main">
        {!loaded ? (
          <p className="my-loading">로딩 중...</p>
        ) : posts.length === 0 ? (
          <div className="my-empty">
            <p>아직 게시된 칼럼이 없습니다.</p>
            <Link to="/" className="btn">홈으로</Link>
          </div>
        ) : (
          <div className="blog-grid">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="blog-card"
              >
                <div className="blog-card-emoji">{p.coverEmoji ?? "⚖️"}</div>
                <div className="blog-card-tags">
                  {p.tags.slice(0, 3).map((t) => (
                    <span key={t} className="blog-tag">#{t}</span>
                  ))}
                </div>
                <h2 className="blog-card-title">{p.title}</h2>
                <p className="blog-card-excerpt">{p.excerpt}</p>
                <div className="blog-card-meta">
                  <span>{p.author}</span>
                  <time>{fmtDate(p.publishedAt)}</time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="page-static-foot">
        본 사이트는 「변호사법」 제23조에 따른 광고물입니다. 본 칼럼의 내용은
        일반적 정보 제공이며 구체적 사안에 대한 법률 자문이 아닙니다.
      </footer>
    </div>
  );
}
