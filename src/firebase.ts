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
  getDocs,
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

// 실시간 구독(onSnapshot)의 에러 핸들러. 이걸 빼먹으면 권한 규칙·인덱스 문제로
// 조회가 실패해도 화면이 "0건"과 똑같이 보여, 데이터가 사라진 줄 알고 헤매게 된다
// (2026-09-06 후기함에서 실제로 진단에 시간을 썼다). 반드시 붙일 것.
function snapshotError(
  where: string,
  onError?: (message: string) => void
): (e: Error) => void {
  return (e: Error) => {
    console.error(`[firebase] ${where} 구독 실패`, e);
    onError?.(e.message || String(e));
  };
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

// 관리자 전용 서버 API 를 부를 때 실어 보낼 ID 토큰. 서버가 이 토큰으로 관리자인지 확인한다.
export async function getIdToken(): Promise<string | null> {
  const a = getAuthOrNull();
  const u = a?.currentUser ?? null;
  if (!u) return null;
  try {
    return await u.getIdToken();
  } catch (e) {
    console.warn("[firebase] getIdToken failed", e);
    return null;
  }
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
  userName?: string | null; // 주문 생성 시점의 결제자 이름 (2026-08-19부터 저장, 8-20부터 직접 입력)
  userEmail?: string | null;
  contact?: string | null; // 결제자 연락처 (2026-08-20부터 결제 페이지에서 직접 입력)
  status?: "ready" | "paid" | "canceled" | "failed";
  paymentKey?: string | null;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  approvedAt?: { seconds: number; nanoseconds: number } | null;
};

// 주문에 이름이 저장되기 전(2026-08-19 이전) 건을 위해, 같은 uid의 상담 기록에서
// 이름·이메일을 찾아 결제자를 식별한다 (어드민 전용 — consultations 읽기 권한 필요).
export async function lookupPayerNames(
  uids: string[]
): Promise<Record<string, { name: string | null; email: string | null }>> {
  const database = getDb();
  const out: Record<string, { name: string | null; email: string | null }> = {};
  if (!database) return out;
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const snap = await getDocs(
          query(
            collection(database, "consultations"),
            where("uid", "==", uid),
            limit(10)
          )
        );
        let name: string | null = null;
        let email: string | null = null;
        for (const d of snap.docs) {
          const data = d.data() as { userName?: string | null; userEmail?: string | null };
          if (!name && data.userName) name = data.userName;
          if (!email && data.userEmail) email = data.userEmail;
          if (name && email) break;
        }
        out[uid] = { name, email };
      } catch (e) {
        console.warn("[firebase] lookupPayerNames failed", uid, e);
      }
    })
  );
  return out;
}

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
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OrderDoc, "id">),
        }))
      ),
    snapshotError("orders")
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
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToConsultation)),
    snapshotError("consultations")
  );
}

// 사건 하나만 직접 구독 (어드민 상세·인쇄용).
// 예전에는 최근 500건을 통째로 받아 그 안에서 id를 찾았고, 500건 밖으로 밀려난 오래된 사건은
// 화면이 "로드 중"에서 끝나지 않았다. 문서가 없으면 null을 넘겨 "못 찾음"을 분명히 구분한다.
export function watchConsultation(
  id: string,
  cb: (row: ConsultationDoc | null) => void
): () => void {
  const database = getDb();
  if (!database) {
    cb(null);
    return () => {};
  }
  return onSnapshot(
    doc(database, "consultations", id),
    (snap) => cb(snap.exists() ? snapToConsultation(snap) : null),
    snapshotError("consultation")
  );
}

// 같은 채팅 대화(sessionId)로 만들어진 상담 문서 전부를 최신순으로 조회.
// where 단일 등가 조건이라 복합 인덱스가 필요 없도록 정렬은 클라이언트에서 수행한다.
// limit을 걸지 않는 이유 — 정렬 없이 자르면 어느 문서가 잘릴지 정해지지 않아
// 최신 상태·메모를 놓칠 수 있다. 한 대화에서 만들어지는 접수 문서는 몇 건 수준이다.
export async function fetchConsultationsBySession(
  sessionId: string
): Promise<ConsultationDoc[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const q = query(
      collection(database, "consultations"),
      where("sessionId", "==", sessionId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(snapToConsultation)
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  } catch (e) {
    console.warn("[firebase] fetchConsultationsBySession failed", e);
    return [];
  }
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
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToChatMessage)),
    snapshotError("chat_messages")
  );
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
  max = 50,
  onError?: (message: string) => void
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
  // 실패를 조용히 넘기면 "사건이 없습니다"와 구분이 안 된다. 색인 누락·권한 오류가
  // 손님에게 빈 화면으로만 보였다(2026-09-12 점검). 반드시 알린다.
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToConsultation)),
    snapshotError("consultations(uid)", onError)
  );
}

// 신규 상담 신청 시 변호사에게 문자 알림 (서버 /api/notify 경유).
// name·contact를 명시적으로 보내면 서버가 중앙 접수함(lead-inbox)에도 사본을 남긴다.
// 접수 누락 방지: 네트워크 실패 시 1회 재시도하고, 문자가 실제로 나갔는지(boolean)를 돌려준다.
async function notifyNewConsultation(
  type: "consultation" | "draft" | "notice",
  caseId: string,
  summary?: string,
  who?: { name?: string | null; contact?: string | null }
): Promise<boolean> {
  // 유입 경로(광고 검색어·키워드)를 함께 보내 알림 문자에서 어느 광고로 온 신청인지 판별한다
  const body = JSON.stringify({
    type,
    caseId,
    summary,
    name: who?.name ?? null,
    contact: who?.contact ?? null,
    attr: (window as unknown as { getAttribution?: () => unknown }).getAttribution?.() ?? null,
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch("/api/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });
      if (resp.ok) {
        const data = (await resp.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        // ok=false는 서버는 받았지만 문자 발송 실패(잔액 등) — 재시도해도 같으므로 그대로 보고
        return data?.ok === true;
      }
    } catch {
      /* 네트워크 오류 — 아래에서 1회 재시도 */
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

// 표준 패키지: 내용증명 초안 저장
export type NoticeSubmission = {
  noticeLetter: string;
  computedItems: Array<{ label: string; amount: number }>;
  computedTotal: number;
  factSummary: string; // 의뢰인 입력 (계산기) 요약
  userName?: string | null;
  contact?: string | null; // 변호사 회신용 휴대전화
};

// 계산기 접수도 채팅 접수와 같은 원칙을 따른다(2026-09-13):
// DB 저장과 문자 알림은 독립 경로다. DB가 죽어도 문자로 접수가 살아남고,
// 호출부는 두 경로의 성패를 모두 받아 손님에게 거짓 성공을 말하지 않는다.
export async function saveNoticeConsultation(
  payload: NoticeSubmission
): Promise<SaveConsultationResult> {
  const database = getDb();
  const a = getAuthOrNull();
  const user = a?.currentUser ?? null;

  let id: string | null = null;
  if (database) {
    try {
      const write = addDoc(collection(database, "consultations"), {
        source: "notice",
        message: "표준 패키지: 내용증명 1차 초안 — 변호사 검토 대기",
        uid: user?.uid ?? null,
        userName: payload.userName ?? user?.displayName ?? null,
        userEmail: user?.email ?? null,
        contact: payload.contact ?? null,
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
      // 오프라인이면 addDoc은 서버 확인이 올 때까지 끝나지 않는다.
      // 문자 알림이 그 뒤에 묶이면 유일한 기록마저 못 나가므로 8초에서 끊고 문자부터 보낸다.
      // (나중에 저장이 성사되면 문서는 정상적으로 남는다 — 문자는 어차피 한 번만 보낸다.)
      const ref = await Promise.race([
        write,
        new Promise<null>((r) => setTimeout(() => r(null), 8_000)),
      ]);
      id = ref?.id ?? null;
    } catch (e) {
      console.warn("[firebase] saveNoticeConsultation failed", e);
    }
  } else {
    console.info("[firebase] config missing — 계산기 접수를 문자 알림으로만 전달");
  }

  const notified = await notifyNewConsultation(
    "notice",
    id ?? "",
    [
      // 이모지는 EUC-KR에 없어 문자에서 깨진다 — 텍스트로 표기.
      id
        ? null
        : "[주의] 저장 확인 실패 — 어드민에 기록이 없을 수 있습니다. 이 문자를 기준으로 연락해 주세요.",
      payload.userName ? `이름 ${payload.userName}` : null,
      payload.contact ? `연락처 ${payload.contact}` : null,
      `합산액 ${payload.computedTotal.toLocaleString("ko-KR")}원`,
      payload.computedItems.length
        ? "청구 항목: " +
          payload.computedItems
            .map((i) => `${i.label} ${i.amount.toLocaleString("ko-KR")}원`)
            .join(" / ")
        : null,
      payload.factSummary ? `입력 내용: ${payload.factSummary.slice(0, 500)}` : null,
    ]
      .filter(Boolean)
      .join("\n") || undefined,
    { name: payload.userName, contact: payload.contact }
  );

  return { id, notified };
}

export async function updateConsultation(
  id: string,
  patch: Partial<
    Pick<
      ConsultationDoc,
      "status" | "notes" | "draftLetter" | "draftStatus" | "noticeLetter" | "noticeStatus"
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
  max = 200,
  // 조회 실패를 화면이 알 수 있게 넘겨준다. 이게 없으면 "실패"와 "0건"이 똑같이 보인다.
  onError?: (message: string) => void
): () => void {
  const database = getDb();
  if (!database) {
    cb([]);
    onError?.("Firebase가 초기화되지 않았습니다. 환경변수를 확인해 주세요.");
    return () => {};
  }
  const q = query(
    collection(database, "reviews"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToReview)),
    snapshotError("reviews", onError)
  );
}

// 사이트(공개) 후기 — approved + display=true 만 일회성 조회
export async function fetchPublicReviews(): Promise<ReviewDoc[]> {
  const database = getDb();
  if (!database) return [];
  try {
    // 보안규칙(approved+display=true만 공개 읽기 허용)과 일치하는 등호 필터 쿼리여야
    // 비로그인 방문자도 조회할 수 있다. orderBy만 있는 쿼리는 규칙 위반으로 전체 거부됨.
    const q = query(
      collection(database, "reviews"),
      where("status", "==", "approved"),
      where("display", "==", true),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(snapToReview)
      .sort((a, b) => (b.approvedAt?.seconds ?? 0) - (a.approvedAt?.seconds ?? 0));
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
  const data = s.data() as Omit<PostDoc, "id">;
  // title/excerpt 는 SERP·OG·AI 인용에 그대로 노출되므로 앞뒤 공백을 정리한다.
  return {
    id: s.id,
    ...data,
    title: data.title?.trim() ?? data.title,
    excerpt: data.excerpt?.trim() ?? data.excerpt,
  };
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
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(snapToPost)),
    snapshotError("posts")
  );
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
  // 업로드 때 저장한 Storage 경로. 삭제할 때 쓴다(예전 문서에는 없을 수 있어 선택값).
  storagePath?: string;
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

// 의뢰인 본인이 올린 자료 삭제. 저장소 파일과 목록 문서를 함께 지운다.
// 저장소 쪽이 이미 없어도(이전 실패 등) 목록은 지워 유령 항목이 남지 않게 한다.
export async function deleteCaseFile(row: CaseFileDoc): Promise<void> {
  const database = getDb();
  const user = getAuthOrNull()?.currentUser ?? null;
  if (!database || !user) throw new Error("로그인 후 이용해 주세요.");
  if (row.uid !== user.uid) throw new Error("본인이 올린 자료만 지울 수 있습니다.");
  const st = getStorageOrNull();
  if (st && row.storagePath) {
    try {
      const { deleteObject } = await import("firebase/storage");
      await deleteObject(storageRef(st, row.storagePath));
    } catch (e) {
      // 저장소에 이미 없으면 목록만 정리하면 된다. 그 밖의 오류는 아래에서 드러난다.
      console.warn("[case-file] storage delete skipped", e);
    }
  }
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(database, "case_files", row.id));
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
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToCaseFile)), (e) => {
    snapshotError("case_files(uid)")(e);
    cb([]);
  });
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
  return onSnapshot(q, (snap) => cb(snap.docs.map(snapToCaseFile)), (e) => {
    snapshotError("case_files(caseId)")(e);
    cb([]);
  });
}

export type DraftSubmission = {
  conversationLog: string;
  draftLetter: string;
  userName?: string | null;
  contact?: string | null; // 같은 대화에서 이미 제출한 연락처가 있으면 함께 전달
  sessionId?: string | null;
};

export async function saveDraftConsultation(
  payload: DraftSubmission
): Promise<string | null> {
  const a = getAuthOrNull();
  const user = a?.currentUser ?? null;
  // 접수 누락 방지(2026-08-22): 문자 알림은 DB 저장 성공 여부와 독립적으로 나간다.
  let id: string | null = null;
  const database = getDb();
  if (database) {
    try {
      const ref = await addDoc(collection(database, "consultations"), {
        source: "draft",
        message: "자동 생성 통보문 초안 — 변호사 검토 대기",
        uid: user?.uid ?? null,
        userName: payload.userName ?? user?.displayName ?? null,
        userEmail: user?.email ?? null,
        contact: payload.contact ?? null,
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
      id = ref.id;
    } catch (e) {
      console.warn("[firebase] saveDraftConsultation failed", e);
    }
  } else {
    console.info("[firebase] config missing — draft: 문자 알림만 발송");
  }
  void notifyNewConsultation(
    "draft",
    id ?? "",
    [
      id
        ? null
        : "[주의] DB 저장 실패 — 어드민에 기록이 없습니다. 이 문자가 유일한 기록입니다.",
      payload.userName ? `이름 ${payload.userName}` : null,
      payload.contact ? `연락처 ${payload.contact}` : null,
      payload.conversationLog
        ? `대화 내용:\n${payload.conversationLog.slice(0, 500)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n") || undefined,
    {
      name: payload.userName ?? user?.displayName ?? null,
      contact: payload.contact ?? null,
    }
  );
  return id;
}

export type ConsultationPayload = {
  source: "chat" | "form" | "floating";
  userName?: string | null; // 폼에서 직접 입력받은 이름 (로그인 displayName보다 우선)
  message?: string;
  pickedItems?: string[];
  estimatedAmount?: number;
  contact?: string;
  meta?: Record<string, unknown>;
  sessionId?: string | null;
  damageThreat?: boolean;
  browseEvent?: boolean; // 가격 카드 클릭 같은 탐색 이벤트 — 저장만 하고 문자 알림 없음
};

// 상담 저장 시 문자 알림 여부 판단.
// - 탐색 이벤트(browseEvent)는 알림 제외 — 문구 매칭이 아니라 명시 플래그로 판정한다.
//   (예전엔 message의 "카드 클릭" 포함 여부로 걸렀는데, 카피를 바꾸면 조용히 풀리고
//    실제 상담 문장에 그 단어가 들어가면 억제되는 취약한 방식이었다.)
// - 채팅은 종류별로 대화(sessionId)당 1회: 일반 메시지 1회 + 손배협박 감지 1회.
//   연락처 제출은 사용자가 버튼을 눌러야만 발생하므로 항상 알린다.
function shouldNotifyConsultation(payload: ConsultationPayload): boolean {
  if (payload.browseEvent) return false;
  if (payload.source === "chat" && payload.sessionId) {
    try {
      const firstKey = `toesahero_notified_${payload.sessionId}`;
      const threatKey = `toesahero_threat_${payload.sessionId}`;
      if (payload.contact) {
        sessionStorage.setItem(firstKey, "1");
        return true;
      }
      if (payload.damageThreat) {
        // 손배 키워드는 대화 내내 반복 등장할 수 있다 — 세션당 한 번만 긴급 알림.
        if (sessionStorage.getItem(threatKey)) return false;
        sessionStorage.setItem(threatKey, "1");
        sessionStorage.setItem(firstKey, "1");
        return true;
      }
      if (sessionStorage.getItem(firstKey)) return false;
      sessionStorage.setItem(firstKey, "1");
    } catch {
      // sessionStorage 사용 불가 환경이면 그냥 알림 (누락보다 중복이 낫다)
    }
  }
  return true;
}

export type SaveConsultationResult = { id: string | null; notified: boolean };

// 접수 누락 방지 원칙(2026-08-22): DB 저장과 문자 알림은 서로 독립적인 경로다.
// DB가 죽어도(광고차단·일시 장애) 문자·중앙 접수함으로 접수가 살아남고,
// 호출부는 두 경로의 성패를 모두 받아 손님에게 거짓 성공을 말하지 않을 수 있다.
export async function saveConsultationDetailed(
  payload: ConsultationPayload
): Promise<SaveConsultationResult> {
  const a = getAuthOrNull();
  const user = a?.currentUser ?? null;
  // 어떤 형태의 상담이든 변호사에게 문자 알림 (놓치는 상담 방지).
  // 예외 ① 가격·상품 카드 클릭은 상담이 아닌 탐색 이벤트라 제외 (클릭 후 채팅하면 그때 알림).
  // 예외 ② 채팅은 대화(sessionId)당 첫 메시지만 — 메시지마다 울리면 문자 폭주.
  //        단 연락처 제출·손배협박 감지 메시지는 같은 대화여도 다시 알린다.
  const wantNotify = shouldNotifyConsultation(payload);

  let id: string | null = null;
  const database = getDb();
  if (database) {
    try {
      const ref = await addDoc(collection(database, "consultations"), {
        ...payload,
        uid: user?.uid ?? null,
        userName: payload.userName ?? user?.displayName ?? null,
        userEmail: user?.email ?? null,
        createdAt: serverTimestamp(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        path: typeof window !== "undefined" ? window.location.pathname : "/",
      });
      id = ref.id;
    } catch (e) {
      console.warn("[firebase] saveConsultation failed", e);
    }
  } else {
    console.info("[firebase] config missing — 상담을 문자 알림으로만 전달");
  }

  let notified = false;
  if (wantNotify) {
    notified = await notifyNewConsultation(
      "consultation",
      id ?? "",
      [
        // 이모지(⚠ 등)는 EUC-KR에 없어 문자 발송에서 깨질 수 있다 — 텍스트로 표기.
        id
          ? null
          : "[주의] DB 저장 실패 — 어드민에 기록이 없습니다. 이 문자가 유일한 기록입니다.",
        payload.damageThreat ? "[긴급] 손배·위약금 협박 감지" : null,
        payload.userName ? `이름 ${payload.userName}` : null,
        payload.contact ? `연락처 ${payload.contact}` : null,
        payload.message?.slice(0, 600) ?? null,
        payload.pickedItems?.length
          ? `선택 항목: ${payload.pickedItems.join(", ")}`
          : null,
        typeof payload.estimatedAmount === "number"
          ? `예상 청구액 ${payload.estimatedAmount.toLocaleString("ko-KR")}원`
          : null,
      ]
        .filter(Boolean)
        .join("\n") || undefined,
      { name: payload.userName ?? user?.displayName ?? null, contact: payload.contact ?? null }
    );
  }
  return { id, notified };
}

export async function saveConsultation(payload: ConsultationPayload) {
  const { id } = await saveConsultationDetailed(payload);
  return id;
}

export async function logChatMessage(
  text: string,
  role: "me" | "them",
  sessionId: string | null = null
) {
  const database = getDb();
  if (database) {
    const a = getAuthOrNull();
    const uid = a?.currentUser?.uid ?? null;
    try {
      await addDoc(collection(database, "chat_messages"), {
        text,
        role,
        uid,
        sessionId,
        consent: true,
        createdAt: serverTimestamp(),
      });
      return;
    } catch (e) {
      console.warn("[firebase] logChatMessage failed", e);
    }
  }
  // 실시간 채팅 유실 방지(2026-08-22): 클라이언트 Firestore 경로가 막히면(광고차단·장애)
  // 같은 도메인 서버 경로로 기록한다. 이것마저 실패하면 대화록 문자·sessionStorage가 방어선.
  try {
    await fetch("/api/chat-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, role, sessionId, consent: true }),
      keepalive: true,
    });
  } catch {
    /* 최후 방어선은 대화록 문자 보고 */
  }
}
