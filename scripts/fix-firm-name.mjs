// 발행된 칼럼 본문의 잘못된 사무소명을 표준 표기(법률사무소 청송law)로 일괄 교정한다.
// 자동 생성 글에 "법무법인 청송"이 섞여 나간 사고(2026-09-11, /blog/auto-mttm11bg) 대응.
// 생성기 프롬프트는 이미 고쳤으므로 이 스크립트는 과거 글 정리용이다.
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
if (existsSync(join(ROOT, ".env")))
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
for (const [k, v] of Object.entries(process.env)) if (v) env[k] = v;

// 금지 표기 → 표준 표기. 긴 것부터 치환해야 부분 치환이 생기지 않는다.
const RULES = [
  [/법무법인\s*청송\s*law/gi, "법률사무소 청송law"],
  [/법무법인\s*청송/g, "법률사무소 청송law"],
  [/청송\s*법률사무소/g, "법률사무소 청송law"],
  [/법률사무소\s*청송(?!law|Law|LAW)/g, "법률사무소 청송law"],
];
const fix = (t) => RULES.reduce((s, [re, to]) => s.replace(re, to), t);
const FIELDS = ["title", "excerpt", "body"];

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
await signInWithEmailAndPassword(getAuth(app), env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
const db = getFirestore(app);

const snap = await getDocs(collection(db, "posts"));
let changed = 0;
for (const d of snap.docs) {
  const p = d.data();
  const patch = {};
  for (const f of FIELDS) {
    if (typeof p[f] !== "string") continue;
    const after = fix(p[f]);
    if (after !== p[f]) patch[f] = after;
  }
  if (!Object.keys(patch).length) continue;
  console.log(`수정 ${d.id} (${p.slug}) — ${Object.keys(patch).join(", ")}`);
  await updateDoc(doc(db, "posts", d.id), patch);
  changed++;
}
console.log(`\n글 ${snap.size}편 중 ${changed}편 수정`);
process.exit(0);
