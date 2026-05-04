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
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

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
  // AI 통보문 초안 (베이직)
  draftLetter?: string | null;
  draftStatus?: "pending_review" | "edited" | "approved" | "sent" | null;
  draftApprovedAt?: { seconds: number; nanoseconds: number } | null;
  conversationLog?: string | null;
  // 내용증명 (표준)
  noticeLetter?: string | null;
  noticeStatus?: "pending_review" | "edited" | "approved" | "sent" | null;
};

export type ChatMessageDoc = {
  id: string;
  text: string;
  role: "me" | "them";
  uid?: string | null;
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

export type DraftSubmission = {
  conversationLog: string;
  draftLetter: string;
  userName?: string | null;
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
      draftLetter: payload.draftLetter,
      draftStatus: "pending_review",
      status: "new",
      createdAt: serverTimestamp(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      path: typeof window !== "undefined" ? window.location.pathname : "/",
    });
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
    return ref.id;
  } catch (e) {
    console.warn("[firebase] saveConsultation failed", e);
    return null;
  }
}

export async function logChatMessage(text: string, role: "me" | "them") {
  const database = getDb();
  if (!database) return;
  const a = getAuthOrNull();
  const uid = a?.currentUser?.uid ?? null;
  try {
    await addDoc(collection(database, "chat_messages"), {
      text,
      role,
      uid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[firebase] logChatMessage failed", e);
  }
}
