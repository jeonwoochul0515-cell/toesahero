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
  source: "chat" | "form" | "floating";
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

export async function updateConsultation(
  id: string,
  patch: Partial<Pick<ConsultationDoc, "status" | "notes">>
): Promise<void> {
  const database = getDb();
  if (!database) throw new Error("Firestore 미초기화");
  await updateDoc(doc(database, "consultations", id), patch);
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
