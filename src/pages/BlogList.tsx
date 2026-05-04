import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublishedPosts, type PostDoc } from "../firebase";

function fmtDate(ts: PostDoc["publishedAt"]): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogList() {
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    void fetchPublishedPosts().then((list) => {
      if (cancel) return;
      setPosts(list);
      setLoaded(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="page-static">
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
