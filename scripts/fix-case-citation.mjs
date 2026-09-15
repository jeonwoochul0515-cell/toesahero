// 칼럼 "퇴사대행, 변호사와 노무사는 무엇이 다른가요"의 잘못된 판결 인용을 Firestore posts에서 바로잡는다.
// 2026-09-15 확인: 2021도14471은 주택법·공인중개사법 사건이고 노무사 고소장 판결은 2015도6329다.
// 2011도14198에는 "명목이 비용이어도 실질이 대가면 위반"이라는 판시가 없어 그 문단과 참고 줄을 뺀다.
// 쓰는 법: node scripts/fix-case-citation.mjs        (바꿀 내용만 보여 준다)
//          node scripts/fix-case-citation.mjs --apply (실제로 고친다)
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

const APPLY = process.argv.includes("--apply");
const FIELDS = ["title", "excerpt", "body"];

// 2011도14198 문단: "## 수수료가 아니라 비용이라고 하면 괜찮은가요?" 제목부터 다음 "## " 제목 직전까지
const drop2011Section = (t) =>
  t.replace(/##\s*수수료가 아니라 비용이라고 하면 괜찮은가요\?[\s\S]*?(?=\n##\s)/, "").replace(/\n{3,}/g, "\n\n");
const fix = (t) =>
  drop2011Section(t)
    .replace(/[^\n]*2011도14198[^\n]*\n?/g, "")
    .replace(/2021도14471/g, "2015도6329");

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
    if (!/2021도14471|2011도14198/.test(p[f])) continue;
    const after = fix(p[f]);
    if (after !== p[f]) patch[f] = after;
  }
  if (!Object.keys(patch).length) continue;
  changed++;
  console.log(`\n=== ${d.id} (${p.slug}) — ${Object.keys(patch).join(", ")}`);
  for (const [f, v] of Object.entries(patch)) {
    const before = p[f];
    console.log(`[${f}] 길이 ${before.length} → ${v.length}`);
    console.log(`  남은 2021도14471: ${(v.match(/2021도14471/g) || []).length}, 남은 2011도14198: ${(v.match(/2011도14198/g) || []).length}, 2015도6329: ${(v.match(/2015도6329/g) || []).length}`);
  }
  if (APPLY) await updateDoc(doc(db, "posts", d.id), patch);
}
console.log(`\n글 ${snap.size}편 중 ${changed}편 ${APPLY ? "수정함" : "수정 대상(미적용)"}`);
process.exit(0);
