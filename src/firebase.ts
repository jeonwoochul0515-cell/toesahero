import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  if (!app) app = initializeApp(firebaseConfig);
  if (!db) db = getFirestore(app);
  return db;
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
  try {
    const ref = await addDoc(collection(database, "consultations"), {
      ...payload,
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
  try {
    await addDoc(collection(database, "chat_messages"), {
      text,
      role,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[firebase] logChatMessage failed", e);
  }
}
