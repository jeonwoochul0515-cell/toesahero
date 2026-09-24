// 중앙 접수함용 첨부 목록·원본 중계 — 손님이 마이페이지에서 올린 사건 자료(case_files)를 접수 건 단위로 보여 준다.
// 원본은 Firebase Storage 다운로드 주소에서 받아 흘려보낸다. 다른 호스트 주소는 따라가지 않는다.

import type { FsClient, FsRow } from "./_firestore";
import { json, utc } from "./_adminApi";

export async function caseFiles(fs: FsClient, consultations: FsRow[]): Promise<FsRow[]> {
  const lists = await Promise.all(
    consultations.slice(0, 20).map((c) => fs.query("case_files", { eq: ["caseId", c.id], limit: 100 }))
  );
  return lists.flat();
}

export function fileList(rows: FsRow[]) {
  return rows.map((f) => ({
    id: f.id,
    name: typeof f.data.name === "string" ? f.data.name.slice(0, 200) : "파일",
    size: typeof f.data.size === "number" ? f.data.size : 0,
    type: typeof f.data.contentType === "string" ? f.data.contentType : "",
    created_at: utc(f.data.createdAt),
  }));
}

export function storageUrlAllowed(u: unknown): u is string {
  if (typeof u !== "string") return false;
  try {
    const p = new URL(u);
    return p.protocol === "https:" && p.hostname === "firebasestorage.googleapis.com";
  } catch {
    return false;
  }
}

/** 이 접수에 속한 파일 id 만 연다. 남의 접수 파일 id 를 넣으면 404. */
export async function streamFile(fs: FsClient, consultations: FsRow[], fileId: string): Promise<Response> {
  if (!/^[A-Za-z0-9]{8,40}$/.test(fileId)) return json({ ok: false, error: "not_found" }, 404);
  const f = await fs.get(`case_files/${fileId}`);
  if (!f || !consultations.some((c) => c.id === f.data.caseId) || !storageUrlAllowed(f.data.url)) {
    return json({ ok: false, error: "not_found" }, 404);
  }
  const r = await fetch(f.data.url, { redirect: "error" });
  if (!r.ok || !r.body) return json({ ok: false, error: "not_found" }, 404);
  const name = typeof f.data.name === "string" ? f.data.name : "file";
  const h = new Headers();
  h.set("content-type", r.headers.get("content-type") || "application/octet-stream");
  const len = r.headers.get("content-length");
  if (len) h.set("content-length", len);
  h.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  h.set("cache-control", "private, no-store");
  h.set("x-content-type-options", "nosniff");
  return new Response(r.body, { status: 200, headers: h });
}
