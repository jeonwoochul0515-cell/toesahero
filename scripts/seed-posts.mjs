// 블로그 초안 2편을 관리자 계정으로 로그인해 Firestore posts 컬렉션에 등록하는 1회용 시드 스크립트
// 실행: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-posts.mjs
// 보안 규칙상 posts 쓰기는 admins/{uid} 가 존재하는 관리자만 가능하므로 관리자 계정으로 로그인한다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 를 직접 파싱 (dotenv 미설치)
function loadEnv() {
  const text = readFileSync(join(__dirname, "..", ".env"), "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL / ADMIN_PASSWORD 환경변수가 필요합니다.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const AUTHOR = "변호사 김창희";
const DISCLAIMER_LICENSE =
  "\n\n---\n\n*본 글은 「변호사법」 제23조에 따른 광고이며 일반적 법률 정보 제공을 목적으로 합니다.*";

const posts = [
  {
    slug: "resignation-agency-cost-structure",
    title: "퇴사대행 비용은 어떻게 정해지나요? 변호사 퇴사대행 요금 구조",
    excerpt:
      "퇴사대행 비용은 통보만 하는 단순 절차와 임금 회수·분쟁 대응 단계에 따라 달라집니다. 변호사 퇴사대행 요금이 어떻게 책정되는지 단계별로 정리합니다.",
    tags: ["퇴사대행 비용", "퇴사대행 가격", "변호사 퇴사대행 비용"],
    coverEmoji: "💰",
    author: AUTHOR,
    status: "published",
    body: `퇴사대행 비용을 검색하는 분들이 가장 궁금해하는 건 "도대체 무엇에 대한 값인가"입니다. 퇴사대행은 단일 상품이 아니라, 사안이 어느 단계까지 가느냐에 따라 필요한 법률 업무의 범위가 달라지는 서비스입니다. 그래서 비용도 업무 범위에 연동됩니다.

가장 단순한 경우는 분쟁이 없는 단계입니다. 근로자가 퇴직 의사를 분명히 했고 사용자도 다투지 않을 때는, 변호사 명의의 공식 통보와 연락 응대 정도로 마무리됩니다. 이 단계는 업무량이 한정적이므로 비용 구조도 가장 가볍습니다.

다음은 미지급 금원이 있는 경우입니다. 임금·퇴직금·연차수당이 정산되지 않았다면 서류 검토와 금액 산정, 내용증명, 필요 시 노동청 진정까지 업무가 늘어납니다. 근로자퇴직급여 보장법 제9조는 사용자에게 퇴직금 지급 의무를 부과하므로, 이 청구는 법적 근거가 분명한 절차입니다. 미지급 금원의 규모가 궁금하다면 먼저 [임금·퇴직금 계산기](/calc)로 대략적인 금액을 확인해 볼 수 있습니다. 업무 범위가 넓어지는 만큼 비용도 단순 통보보다 올라갑니다.

마지막은 분쟁이 격화되는 단계입니다. 직장 내 괴롭힘 신고, 산재, 민사·형사 절차 검토가 들어가면 대리·교섭·소송 영역으로 들어갑니다. 이 영역은 변호사법 제109조에 따라 변호사의 전속 사무이며, 가장 많은 업무가 투입되므로 비용도 그에 맞춰 산정됩니다.

정리하면 퇴사대행 비용은 "얼마짜리 상품"이 아니라 "내 사안이 어느 단계까지 가는가"에 따라 결정됩니다. 변호사가 운영하는 경우의 장점은, 단순 통보로 끝날지 분쟁까지 갈지 처음부터 같은 사무소에서 판단하고 일관되게 처리한다는 점입니다. 정확한 비용은 사안을 확인한 뒤 안내드리며, 결과(금원 회수 등)는 보장 대상이 아니라 변호사가 성실히 직무를 수행할 의무를 부담하는 구조임을 분명히 말씀드립니다.

자주 묻는 질문은 [FAQ](/faq)에서, 변호사와 노무사의 업무 범위 차이가 궁금하다면 관련 칼럼을 함께 참고하세요.${DISCLAIMER_LICENSE}

*개별 사안은 상담을 통해 확인이 필요합니다.*`,
  },
  {
    slug: "employer-refuses-resignation",
    title: "사장님이 사직서를 안 받아줍니다 — 그래도 퇴사할 수 있나요?",
    excerpt:
      "사용자가 사직서를 수리하지 않아도 퇴직은 가능합니다. 민법 제660조에 따른 퇴직 효력과, 통보가 막힐 때 변호사 명의 통보를 활용하는 방법을 정리합니다.",
    tags: ["사직서 안 받아줄 때", "퇴사 통보 대행", "퇴사 거부"],
    coverEmoji: "📨",
    author: AUTHOR,
    status: "published",
    body: `"사직서를 냈는데 사장님이 안 받아줍니다." 퇴사 상담에서 가장 자주 나오는 말입니다. 결론부터 말하면, 사용자의 수리 거부가 퇴직 자체를 막지는 못합니다.

근로자의 퇴직 의사 표시는 민법 제660조의 적용을 받습니다. 기간의 정함이 없는 근로계약에서 근로자가 퇴직을 통고하면, 사용자가 이를 수리하지 않더라도 통고가 사용자에게 도달한 뒤 일정 기간이 지나면 계약 해지의 효력이 발생합니다. 즉 "받아주지 않아서 못 나간다"는 상황은 법적으로 성립하지 않습니다.

문제는 통보가 제대로 도달했는지, 그리고 그 도달 사실을 나중에 증명할 수 있는지입니다. 구두로만 말하고 끝내면 분쟁이 생겼을 때 "들은 적 없다"는 반박에 막힐 수 있습니다. 그래서 의사 표시가 도달했다는 점을 객관적으로 남기는 것이 중요합니다. 변호사 명의의 공식 통보는 도달 사실과 일자를 명확히 기록으로 남기는 방법 중 하나입니다.

수리를 거부하는 과정에서 임금이나 퇴직금 정산이 함께 지연되는 경우도 많습니다. 이때는 통보와 별개로 미지급 금원에 대한 청구 절차를 검토하게 됩니다. 통보 단계에서 분쟁이 예상된다면, 처음부터 분쟁 단계까지 일관되게 다룰 수 있는 곳에서 시작하는 편이 절차상 매끄럽습니다.

사직서를 받아주지 않는 상황 자체에 위축될 필요는 없습니다. 법이 정한 절차에 따라 퇴직 의사를 분명히 전달하고 그 사실을 남기는 것이 핵심입니다.

비슷한 사례와 절차는 [FAQ](/faq)에서 더 확인하실 수 있습니다.${DISCLAIMER_LICENSE}

*개별 사안의 통보 기간·방식은 계약 형태에 따라 달라질 수 있어 상담이 필요합니다.*`,
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`관리자 로그인 중: ${ADMIN_EMAIL}`);
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("로그인 성공\n");

  for (const p of posts) {
    // 같은 slug 가 이미 있으면 건너뛴다 (중복 발행 방지)
    const dup = await getDocs(
      query(collection(db, "posts"), where("slug", "==", p.slug))
    );
    if (!dup.empty) {
      console.log(`이미 존재(건너뜀): ${p.slug}`);
      continue;
    }
    const ref = await addDoc(collection(db, "posts"), {
      ...p,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: p.status === "published" ? serverTimestamp() : null,
    });
    console.log(`등록 완료: ${p.slug}  (id=${ref.id})`);
  }

  console.log("\n끝. 발행된 글은 /blog 에서 확인하세요.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e.message || e);
  process.exit(1);
});
