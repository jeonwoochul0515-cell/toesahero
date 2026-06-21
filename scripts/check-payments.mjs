// 관리자로 로그인해 최근 결제 반영 상태(orders·consultations)를 조회하는 점검 스크립트
// 실행: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/check-payments.mjs

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = {};
  const p = join(ROOT, ".env");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  for (const [k, v] of Object.entries(process.env)) if (v) out[k] = v;
  return out;
}

const env = loadEnv();
for (const k of ["ADMIN_EMAIL", "ADMIN_PASSWORD"]) {
  if (!env[k]) {
    console.error(`환경변수 ${k} 필요`);
    process.exit(1);
  }
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const fmt = (ts) =>
  ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString("ko-KR") : "—";
const won = (n) => (typeof n === "number" ? n.toLocaleString("ko-KR") + "원" : "—");

async function main() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  await signInWithEmailAndPassword(auth, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);

  console.log(`로그인 uid=${auth.currentUser?.uid}`);

  // 최근 주문
  let orders = [];
  try {
    orders = (await getDocs(collection(db, "orders"))).docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  } catch (e) {
    console.error(`orders 조회 실패: ${e.code || e.message}`);
  }

  console.log(`\n=== orders (총 ${orders.length}건, 최근 8건) ===`);
  for (const o of orders.slice(0, 8)) {
    console.log(
      `· ${o.status === "paid" ? "✅" : "·"} [${o.status ?? "?"}] ${won(o.amount)}  ${fmt(o.createdAt)}  key=${o.paymentKey ? o.paymentKey.slice(0, 14) + "…" : "—"}  id=${o.id}`
    );
  }

  // 결제 반영된 상담
  let cons = [];
  try {
    cons = (await getDocs(collection(db, "consultations"))).docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.paymentStatus)
      .sort((a, b) => (b.paymentApprovedAt?.seconds ?? 0) - (a.paymentApprovedAt?.seconds ?? 0));
  } catch (e) {
    console.error(`consultations 조회 실패: ${e.code || e.message}`);
  }

  console.log(`\n=== 결제 반영된 consultations (${cons.length}건, 최근 8건) ===`);
  for (const c of cons.slice(0, 8)) {
    console.log(
      `· ${c.paymentStatus === "paid" ? "✅" : "·"} [${c.paymentStatus}] ${won(c.paymentAmount)}  pkg=${c.packageId ?? "—"}  승인=${fmt(c.paymentApprovedAt)}  id=${c.id.slice(0, 8)}`
    );
  }
  console.log("");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e.message || e);
  process.exit(1);
});
