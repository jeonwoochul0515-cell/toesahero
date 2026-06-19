import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import {
  getAuth,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const KAKAO_PROVIDER_ID = "oidc.kakao";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

function getApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

function getDb(): Firestore | null {
  const a = getApp();
  if (!a) return null;
  if (!db) db = getFirestore(a);
  return db;
}

export function getAuthOrNull(): Auth | null {
  const a = getApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}

function getStorageOrNull(): FirebaseStorage | null {
  const a = getApp();
  if (!a) return null;
  if (!storage) storage = getStorage(a);
  return storage;
}

export type AppUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

function toAppUser(u: User | null): AppUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
  };
}

export function watchAuth(cb: (user: AppUser | null) => void): () => void {
  const a = getAuthOrNull();
  if (!a) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(a, (u) => cb(toAppUser(u)));
}

export async function signInWithKakao(): Promise<AppUser | null> {
  const a = getAuthOrNull();
  if (!a) {
    console.warn("[firebase] auth not available");
    return null;
  }
  const provider = new OAuthProvider(KAKAO_PROVIDER_ID);
  provider.addScope("openid");
  try {
    const result = await signInWithPopup(a, provider);
    return toAppUser(result.user);
  } catch (e) {
    console.warn("[firebase] kakao sign-in failed", e);
    throw e;
  }
}

export async function signOut(): Promise<void> {
  const a = getAuthOrNull();
  if (!a) return;
  await fbSignOut(a);
}

export async function signInAdminWithEmail(
  email: string,
  password: string
): Promise<AppUser> {
  const a = getAuthOrNull();
  if (!a) throw new Error("Firebase Auth 가 초기화되지 않았습니다.");
  const result = await signInWithEmailAndPassword(a, email, password);
  return toAppUser(result.user)!;
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const database = getDb();
  if (!database) return false;
  try {
    const snap = await getDoc(doc(database, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export type ConsultationDoc = {
  id: string;
  source: "chat" | "form" | "floating" | "draft" | "notice";
  message?: string;
  pickedItems?: string[];
  estimatedAmount?: number;
  contact?: string;
  meta?: Record<string, unknown>;
  uid?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  status?: "new" | "contacted" | "consulted" | "contracted" | "closed";
  notes?: string;
  userAgent?: string;
  path?: string;
  sessionId?: string | null; // 같은 채팅 대화를 묶는 키
  damageThreat?: boolean; // 회사의 손해배상·위약금 협박 감지 (변호사 우선 대응 플래그)
  // AI 통보문 초안 (베이직)
  draftLetter?: string | null;
  draftStatus?: "pending_review" | "edited" | "approved" | "sent" | null;
  draftApprovedAt?: { seconds: number; nanoseconds: number } | null;
  conversationLog?: string | null;
  // 내용증명 (표준)
  noticeLetter?: string | null;
  noticeStatus?: "pending_review" | "edited" | "approved" | "sent" | null;
  // 결제
  packageId?: "basic" | "pro" | "max" | null;
  paymentAmount?: number | null;
  paymentStatus?: "pending" | "paid" | "canceled" | "failed" | null;
  paymentKey?: string | null;
  paymentApprovedAt?: { seconds: number; nanoseconds: number } | null;
  paymentOrderId?: string | null;
};

export type ChatMessageDoc = {
  id: string;
  text: string;
  role: "me" | "them";
  uid?: string | null;
  sessionId?: string | null; // 같은 채팅 대화를 묶는 키
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

function snapToConsultation(
  s: QueryDocumentSnapshot<DocumentData>
): ConsultationDoc {
  return { id: s.id, ...(s.data() as Omit<ConsultationDoc, "id">) };
}

function snapToChatMessage(
  s: QueryDocumentSnapshot<DocumentData>
): ChatMessageDoc {
  return { id: s.id, ...(s.data() as Omit<ChatMessageDoc, "id">) };
}

export type OrderDoc = {
  id: string;
  orderId?: string;
  packageId?: "basic" | "pro" | "max" | string;
  amount?: number;
  caseId?: string | null;
  uid?: string | null;
  status?: "ready" | "paid" | "canceled" | "failed";
  paymentKey?: string | null;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  approvedAt?: { seconds: number; nanoseconds: number } | null;
};

// 결제 주문 실시간 구독 (어드민 전용 — orders 읽기는 보안 규칙상 어드민만 허용).
export function watchOrders(
  cb: (rows: OrderDoc[]) => void,
  max = 200
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(database, "orders"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderDoc, "id">) })))
  );
}

export function watchConsultations(
  cb: (rows: ConsultationDoc[]) => void,
  max = 100
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(database, "consultations"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToConsultation)));
}

export function watchChatMessages(
  cb: (rows: ChatMessageDoc[]) => void,
  max = 200
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(database, "chat_messages"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToChatMessage)));
}

// 의뢰인 본인 사건 조회 (마이페이지용)
// 특정 대화(sessionId)에 속한 채팅 메시지를 시간순으로 조회 (어드민 상담 상세용).
// where 단일 등가 조건이라 복합 인덱스가 필요 없도록 정렬은 클라이언트에서 수행한다.
export async function fetchChatMessagesBySession(
  sessionId: string
): Promise<ChatMessageDoc[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const { getDocs } = await import("firebase/firestore");
    const q = query(
      collection(database, "chat_messages"),
      where("sessionId", "==", sessionId),
      limit(300)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(snapToChatMessage)
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  } catch (e) {
    console.warn("[firebase] fetchChatMessagesBySession failed", e);
    return [];
  }
}

export function watchMyCases(
  uid: string,
  cb: (rows: ConsultationDoc[]) => void,
  max = 50
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(database, "consultations"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToConsultation)));
}

// 신규 상담 신청 시 변호사에게 문자 알림 (서버 /api/notify 경유). fire-and-forget — 저장 흐름을 막지 않는다.
function notifyNewConsultation(
  type: "consultation" | "draft" | "notice",
  caseId: string,
  summary?: string
): void {
  void fetch("/api/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, caseId, summary }),
  }).catch(() => {});
}

// 표준 패키지: 내용증명 초안 저장
export type NoticeSubmission = {
  noticeLetter: string;
  computedItems: Array<{ label: string; amount: number }>;
  computedTotal: number;
  factSummary: string; // 의뢰인 입력 (계산기) 요약
  userName?: string | null;
};

export async function saveNoticeConsultation(
  payload: NoticeSubmission
): Promise<string | null> {
  const database = getDb();
  if (!database) {
    console.info("[firebase] config missing — skipping notice save");
    return null;
  }
  const a = getAuthOrNull();
  const user = a?.currentUser ?? null;
  try {
    const ref = await addDoc(collection(database, "consultations"), {
      source: "notice",
      message: "표준 패키지: 내용증명 1차 초안 — 변호사 검토 대기",
      uid: user?.uid ?? null,
      userName: user?.displayName ?? payload.userName ?? null,
      userEmail: user?.email ?? null,
      pickedItems: payload.computedItems.map((i) => i.label),
      estimatedAmount: payload.computedTotal,
      meta: { factSummary: payload.factSummary, items: payload.computedItems },
      noticeLetter: payload.noticeLetter,
      noticeStatus: "pending_review",
      status: "new",
      createdAt: serverTimestamp(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      path: typeof window !== "undefined" ? window.location.pathname : "/",
    });
    notifyNewConsultation("notice", ref.id, payload.userName ?? undefined);
    return ref.id;
  } catch (e) {
    console.warn("[firebase] saveNoticeConsultation failed", e);
    return null;
  }
}

export async function updateConsultation(
  id: string,
  patch: Partial<
    Pick<
      ConsultationDoc,
      "status" | "notes" | "draftLetter" | "draftStatus"
    >
  >
): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const data: Record<string, unknown> = { ...patch };
  if (patch.draftStatus === "approved") {
    data.draftApprovedAt = serverTimestamp();
  }
  await updateDoc(doc(database, "consultations", id), data);
}

// ─── Reviews (후기 시스템) ───
export type ReviewDoc = {
  id: string;
  title: string;
  body: string;
  tag: string; // 예: "30대 · 직장인", "사무직 5년차"
  status: "pending" | "approved" | "rejected";
  consentNote?: string; // 의뢰인 동의 받은 내용 메타정보 (서면 동의서 보관 위치 등)
  createdAt?: { seconds: number; nanoseconds: number } | null;
  approvedAt?: { seconds: number; nanoseconds: number } | null;
  approvedBy?: string | null;
  bg?: "yellow" | "orange" | "paper";
  display?: boolean; // 사이트 게재 여부 (어드민 토글)
};

function snapToReview(s: QueryDocumentSnapshot<DocumentData>): ReviewDoc {
  return { id: s.id, ...(s.data() as Omit<ReviewDoc, "id">) };
}

export function watchReviewsAdmin(
  cb: (rows: ReviewDoc[]) => void,
  max = 200
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(database, "reviews"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToReview)));
}

// 사이트(공개) 후기 — approved + display=true 만 일회성 조회
export async function fetchPublicReviews(): Promise<ReviewDoc[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const q = query(
      collection(database, "reviews"),
      orderBy("approvedAt", "desc"),
      limit(30)
    );
    const { getDocs } = await import("firebase/firestore");
    const snap = await getDocs(q);
    return snap.docs
      .map(snapToReview)
      .filter((r) => r.status === "approved" && r.display !== false);
  } catch (e) {
    console.warn("[firebase] fetchPublicReviews failed", e);
    return [];
  }
}

export async function createReview(
  payload: Omit<ReviewDoc, "id" | "createdAt" | "status" | "approvedAt" | "approvedBy">
): Promise<string | null> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const ref = await addDoc(collection(database, "reviews"), {
    ...payload,
    status: "pending",
    display: payload.display ?? false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReview(
  id: string,
  patch: Partial<Pick<ReviewDoc, "status" | "display" | "title" | "body" | "tag" | "bg" | "consentNote">>
): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const a = getAuthOrNull();
  const data: Record<string, unknown> = { ...patch };
  if (patch.status === "approved") {
    data.approvedAt = serverTimestamp();
    data.approvedBy = a?.currentUser?.email ?? a?.currentUser?.uid ?? null;
  }
  await updateDoc(doc(database, "reviews", id), data);
}

export async function deleteReview(id: string): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(database, "reviews", id));
}

// ─── 블로그 / 칼럼 ───
export type PostDoc = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string; // markdown
  tags: string[];
  coverEmoji?: string;
  author: string;
  status: "draft" | "published";
  publishedAt?: { seconds: number; nanoseconds: number } | null;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
};

function snapToPost(s: QueryDocumentSnapshot<DocumentData>): PostDoc {
  return { id: s.id, ...(s.data() as Omit<PostDoc, "id">) };
}

export function watchPostsAdmin(
  cb: (rows: PostDoc[]) => void,
  max = 200
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(database, "posts"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToPost)));
}

export async function fetchPublishedPosts(): Promise<PostDoc[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const { getDocs } = await import("firebase/firestore");
    const q = query(
      collection(database, "posts"),
      orderBy("publishedAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(snapToPost)
      .filter((p) => p.status === "published");
  } catch (e) {
    console.warn("[firebase] fetchPublishedPosts failed", e);
    return [];
  }
}

export async function fetchPostBySlug(slug: string): Promise<PostDoc | null> {
  const database = getDb();
  if (!database) return null;
  try {
    const { getDocs } = await import("firebase/firestore");
    const q = query(
      collection(database, "posts"),
      where("slug", "==", slug),
      limit(1)
    );
    const snap = await getDocs(q);
    const doc1 = snap.docs[0];
    if (!doc1) return null;
    const post = snapToPost(doc1);
    if (post.status !== "published") return null;
    return post;
  } catch (e) {
    console.warn("[firebase] fetchPostBySlug failed", e);
    return null;
  }
}

export async function createPost(
  payload: Omit<PostDoc, "id" | "createdAt" | "updatedAt" | "publishedAt">
): Promise<string | null> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const ref = await addDoc(collection(database, "posts"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt:
      payload.status === "published" ? serverTimestamp() : null,
  });
  return ref.id;
}

export async function updatePost(
  id: string,
  patch: Partial<Omit<PostDoc, "id" | "createdAt">>
): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const data: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  };
  if (patch.status === "published" && !patch.publishedAt) {
    data.publishedAt = serverTimestamp();
  }
  await updateDoc(doc(database, "posts", id), data);
}

export async function deletePost(id: string): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(database, "posts", id));
}

// ===== 사이트 실적/신뢰 지표 (어드민 입력, 공개 노출) =====
export type SiteStat = { label: string; value: string };

export async function fetchSiteStats(): Promise<SiteStat[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const snap = await getDoc(doc(database, "site_stats", "main"));
    if (!snap.exists()) return [];
    const items = (snap.data() as { items?: SiteStat[] }).items;
    return Array.isArray(items)
      ? items.filter((s) => s && s.label && s.value)
      : [];
  } catch (e) {
    console.warn("[firebase] fetchSiteStats failed", e);
    return [];
  }
}

export async function saveSiteStats(items: SiteStat[]): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  await setDoc(
    doc(database, "site_stats", "main"),
    { items, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ===== 사건 증거 파일 (Storage + case_files 메타) =====
export type CaseFileDoc = {
  id: string;
  caseId: string;
  uid: string;
  name: string;
  url: string;
  size?: number;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

function snapToCaseFile(s: QueryDocumentSnapshot<DocumentData>): CaseFileDoc {
  return { id: s.id, ...(s.data() as Omit<CaseFileDoc, "id">) };
}

// 의뢰인이 사건 증거 파일을 Storage에 올리고 메타를 case_files에 기록한다.
export async function uploadCaseFile(caseId: string, file: File): Promise<void> {
  const st = getStorageOrNull();
  const database = getDb();
  const user = getAuthOrNull()?.currentUser ?? null;
  if (!st || !database || !user) throw new Error("로그인 후 이용해 주세요.");
  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
  const path = `case-files/${user.uid}/${caseId}/${Date.now()}_${safeName}`;
  await uploadBytes(storageRef(st, path), file);
  const url = await getDownloadURL(storageRef(st, path));
  await addDoc(collection(database, "case_files"), {
    caseId,
    uid: user.uid,
    name: file.name,
    url,
    size: file.size,
    storagePath: path,
    createdAt: serverTimestamp(),
  });
}

// 의뢰인 본인 파일 전체 구독 (마이페이지 — uid 단일 조건, 컴포넌트에서 caseId로 그룹).
export function watchMyCaseFiles(
  uid: string,
  cb: (rows: CaseFileDoc[]) => void
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(collection(database, "case_files"), where("uid", "==", uid), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToCaseFile)),
    () => cb([])
  );
}

// 특정 사건 파일 구독 (어드민 — caseId 단일 조건).
export function watchCaseFiles(
  caseId: string,
  cb: (rows: CaseFileDoc[]) => void
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    return () => {};
  }
  const q = query(collection(database, "case_files"), where("caseId", "==", caseId), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToCaseFile)),
    () => cb([])
  );
}

export type DraftSubmission = {
  conversationLog: string;
  draftLetter: string;
  userName?: string | null;
  sessionId?: string | null;
};

export async function saveDraftConsultation(
  payload: DraftSubmission
): Promise<string | null> {
  const database = getDb();
  if (!database) {
    console.info("[firebase] config missing — skipping draft save");
    return null;
  }
  const a = getAuthOrNull();
  const user = a?.currentUser ?? null;
  try {
    const ref = await addDoc(collection(database, "consultations"), {
      source: "draft",
      message: "AI 자동 생성 통보문 초안 — 변호사 검토 대기",
      uid: user?.uid ?? null,
      userName: user?.displayName ?? payload.userName ?? null,
      userEmail: user?.email ?? null,
      conversationLog: payload.conversationLog,
      sessionId: payload.sessionId ?? null,
      draftLetter: payload.draftLetter,
      draftStatus: "pending_review",
      status: "new",
      createdAt: serverTimestamp(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      path: typeof window !== "undefined" ? window.location.pathname : "/",
    });
    notifyNewConsultation("draft", ref.id, payload.userName ?? undefined);
    return ref.id;
  } catch (e) {
    console.warn("[firebase] saveDraftConsultation failed", e);
    return null;
  }
}

export type ConsultationPayload = {
  source: "chat" | "form" | "floating";
  message?: string;
  pickedItems?: string[];
  estimatedAmount?: number;
  contact?: string;
  meta?: Record<string, unknown>;
  sessionId?: string | null;
  damageThreat?: boolean;
};

export async function saveConsultation(payload: ConsultationPayload) {
  const database = getDb();
  if (!database) {
    console.info("[firebase] config missing — skipping save", payload);
    return null;
  }
  const a = getAuthOrNull();
  const user = a?.currentUser ?? null;
  try {
    const ref = await addDoc(collection(database, "consultations"), {
      ...payload,
      uid: user?.uid ?? null,
      userName: user?.displayName ?? null,
      userEmail: user?.email ?? null,
      createdAt: serverTimestamp(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      path: typeof window !== "undefined" ? window.location.pathname : "/",
    });
    // 연락처를 남겼을 때만 변호사에게 문자 알림. 단순 채팅·탐색 이벤트로는 알림하지 않는다.
    if (payload.contact) {
      notifyNewConsultation(
        "consultation",
        ref.id,
        `연락처 ${payload.contact}${
          payload.message ? `\n${payload.message.slice(0, 60)}` : ""
        }`
      );
    }
    return ref.id;
  } catch (e) {
    console.warn("[firebase] saveConsultation failed", e);
    return null;
  }
}

export async function logChatMessage(
  text: string,
  role: "me" | "them",
  sessionId: string | null = null
) {
  const database = getDb();
  if (!database) return;
  const a = getAuthOrNull();
  const uid = a?.currentUser?.uid ?? null;
  try {
    await addDoc(collection(database, "chat_messages"), {
      text,
      role,
      uid,
      sessionId,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[firebase] logChatMessage failed", e);
  }
}
