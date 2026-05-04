import { useEffect, useState, type FormEvent } from "react";
import {
  watchPostsAdmin,
  createPost,
  updatePost,
  deletePost,
  type PostDoc,
} from "../firebase";

const STATUS_LABEL: Record<PostDoc["status"], string> = {
  draft: "초안",
  published: "게시됨",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function emptyDraft(): Omit<PostDoc, "id" | "createdAt" | "updatedAt" | "publishedAt"> {
  return {
    slug: "",
    title: "",
    excerpt: "",
    body: "",
    tags: [],
    coverEmoji: "⚖️",
    author: "김창희 변호사",
    status: "draft",
  };
}

export function BlogAdmin() {
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [editing, setEditing] = useState<PostDoc | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => watchPostsAdmin(setPosts, 200), []);

  const startNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setTagsInput("");
  };

  const startEdit = (p: PostDoc) => {
    setEditing(p);
    setDraft({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      tags: p.tags,
      coverEmoji: p.coverEmoji ?? "⚖️",
      author: p.author,
      status: p.status,
    });
    setTagsInput(p.tags.join(", "));
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) {
      alert("제목과 본문은 필수입니다.");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const slug = draft.slug || slugify(draft.title);
    if (!slug) {
      alert("slug 생성 실패. 제목을 영문/한글로 변경해주세요.");
      return;
    }
    const payload = { ...draft, slug, tags };
    setBusy(true);
    try {
      if (editing) {
        await updatePost(editing.id, payload);
        setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      } else {
        const id = await createPost(payload);
        if (id) {
          setSavedAt(new Date().toLocaleTimeString("ko-KR"));
          startNew();
        }
      }
    } catch (e) {
      alert(`저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onPublish = async () => {
    if (!editing) return;
    if (!confirm("이 글을 공개 게시합니다. 진행하시겠습니까?")) return;
    setBusy(true);
    try {
      await updatePost(editing.id, { status: "published" });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setBusy(false);
    }
  };

  const onUnpublish = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await updatePost(editing.id, { status: "draft" });
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!confirm(`"${editing.title}" 글을 영구 삭제합니다. 진행하시겠습니까?`)) return;
    setBusy(true);
    try {
      await deletePost(editing.id);
      startNew();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-dash">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className="admin-h1">블로그 / 법률 칼럼 관리</h1>
        <button className="btn primary" onClick={startNew}>
          + 새 글
        </button>
      </div>
      <p className="admin-sub">
        변호사 본인 명의 정보성 칼럼만 게시. 결과 보장·승소율·구체적 사례 자랑 표현 금지 (변협 광고규정).
      </p>

      <div className="blog-admin-layout">
        <aside className="blog-admin-list">
          <h3>전체 글 ({posts.length})</h3>
          <ul>
            {posts.length === 0 ? (
              <li className="blog-admin-empty">아직 작성된 글이 없습니다.</li>
            ) : (
              posts.map((p) => (
                <li
                  key={p.id}
                  className={
                    editing?.id === p.id ? "active" : ""
                  }
                  onClick={() => startEdit(p)}
                >
                  <div className="blog-admin-list-emoji">
                    {p.coverEmoji ?? "⚖️"}
                  </div>
                  <div className="blog-admin-list-info">
                    <strong>{p.title}</strong>
                    <span
                      className={`admin-status st-${
                        p.status === "published" ? "contracted" : "new"
                      }`}
                      style={{ fontSize: 10 }}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </aside>

        <form className="blog-admin-editor" onSubmit={onSave}>
          <div className="blog-admin-editor-head">
            <h3>{editing ? "글 수정" : "새 글 작성"}</h3>
            {savedAt && <span className="admin-saved">✓ {savedAt}</span>}
          </div>

          <label>
            제목 *
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="예: 사장님이 사직서를 받아주지 않을 때 — 변호사가 알려드리는 절차"
              required
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
            <label>
              Slug (URL — 자동 생성, 직접 편집 가능)
              <input
                type="text"
                value={draft.slug}
                onChange={(e) =>
                  setDraft({ ...draft, slug: slugify(e.target.value) })
                }
                placeholder="auto-from-title"
              />
            </label>
            <label>
              표지 이모지
              <input
                type="text"
                value={draft.coverEmoji ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, coverEmoji: e.target.value })
                }
                placeholder="⚖️"
                maxLength={4}
              />
            </label>
          </div>

          <label>
            태그 (쉼표 구분)
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="퇴직금, 사직서, 변호사법"
            />
          </label>

          <label>
            요약 (목록 페이지용 1~2문장)
            <textarea
              value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
              rows={2}
              placeholder="1년 미만 근속자도 퇴직금을 받을 수 있는 경우가 있습니다. 변호사가 절차를 설명합니다."
            />
          </label>

          <label>
            본문 (Markdown 지원)
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={20}
              placeholder={`## 들어가며\n\n근로자가 퇴직 의사를 표시했음에도 사용자가...\n\n### 1. 법적 절차\n\n근로기준법 제7조에 따라...`}
              style={{ fontFamily: "monospace", fontSize: 13 }}
              required
            />
          </label>

          <div className="blog-admin-editor-actions">
            <button
              type="submit"
              className="btn primary"
              disabled={busy}
            >
              {busy ? "저장 중..." : editing ? "수정 저장" : "초안 저장"}
            </button>
            {editing && editing.status === "draft" && (
              <button
                type="button"
                className="btn"
                onClick={() => void onPublish()}
                disabled={busy}
                style={{ background: "var(--green)" }}
              >
                ✓ 게시
              </button>
            )}
            {editing && editing.status === "published" && (
              <button
                type="button"
                className="btn"
                onClick={() => void onUnpublish()}
                disabled={busy}
                style={{ background: "var(--gray-1)" }}
              >
                초안으로
              </button>
            )}
            {editing && (
              <a
                className="btn"
                href={`/blog/${editing.slug}`}
                target="_blank"
                rel="noopener"
                style={{ background: "var(--yellow)" }}
              >
                미리보기 ↗
              </a>
            )}
            {editing && (
              <button
                type="button"
                className="btn"
                onClick={() => void onDelete()}
                disabled={busy}
                style={{ background: "var(--orange)", color: "var(--cream)" }}
              >
                삭제
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
