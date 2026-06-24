// 하루 1편 블로그 글을 Claude로 자동 생성해 Firestore에 발행하는 스크립트 (GitHub Actions cron / 수동 실행 공용)
// 흐름: 주제 큐에서 미발행 주제 선택 → Claude 생성 → 변협 금지표현 자동 검사 → 통과 시 published, 위반 시 draft 저장
// 실행: ADMIN_EMAIL=... ADMIN_PASSWORD=... ANTHROPIC_API_KEY=... node scripts/auto-publish-daily.mjs

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// .env(로컬)를 읽고 process.env(CI)로 덮어쓴다 — CI에서는 .env가 없어도 동작.
function loadEnv() {
  const out = {};
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v != null && v !== "") out[k] = v;
  }
  return out;
}

const env = loadEnv();
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
const BLOG_MODEL = env.BLOG_MODEL || "claude-sonnet-4-6";
const AUTHOR = "변호사 김창희";

for (const [k, v] of Object.entries({
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ANTHROPIC_API_KEY,
})) {
  if (!v) {
    console.error(`환경변수 ${k} 가 필요합니다.`);
    process.exit(1);
  }
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const DISCLAIMER =
  "\n\n---\n\n*본 글은 「변호사법」 제23조에 따른 광고이며 일반적 법률 정보 제공을 목적으로 합니다. 개별 사안은 상담을 통해 확인이 필요합니다.*";

// 변협 광고규정 금지표현 — 법령명 오탐을 피하려고 단어 '보장' 단독이 아닌 구체적 구절로 검사한다.
const BANNED_PATTERNS = [
  "무료 상담",
  "무료상담",
  "무료 진행",
  "할인",
  "환불 보장",
  "환불보장",
  "전액 환불",
  "승소 보장",
  "승소보장",
  "성공 보장",
  "성공보장",
  "100% 성공",
  "100% 승소",
  "100%",
  "수임료 면제",
  "최고의 변호사",
  "국내 최고",
  "업계 최고",
  "유일한 곳",
  "업계 1위",
  "1위 로펌",
  "반드시 이깁니다",
  "반드시 승소",
];

function findBanned(text) {
  const hits = [];
  for (const p of BANNED_PATTERNS) {
    if (text.includes(p)) hits.push(p);
  }
  return hits;
}

const SYSTEM_PROMPT = `당신은 법률사무소 청송(대표 변호사 김창희)이 운영하는 "퇴사히어로" 블로그의 글을 쓰는 변호사입니다. 노동법·퇴사 절차에 관한 정보성 칼럼을 작성합니다.

# 톤·문체
- 사실과 법조문 근거 중심. 차분하고 정중한 변호사 사무소 톤.
- 독자는 퇴사를 고민하는 일반 근로자. 쉬운 말로 설명하되 가볍지 않게.
- 한국어 문장은 마침표로 끝낸다. 비속어·유행어·과장 금지.

# 변협 「변호사 광고에 관한 규정」 — 절대 금지 (위반 시 글 전체 폐기)
- "할인", "무료 상담", "환불 보장", "승소 보장", "성공 보장", "100% 성공" 등 결과·금전 보장 표현
- "최고", "유일", "업계 1위" 등 최상급·비교 표현
- 다른 변호사·노무사·업체와의 비교
- 특정 사건의 승소·금액 결과 단정 ("○○만원 받을 수 있습니다")
- 의뢰인 사연 검증 없는 가해자(회사) 단정 비난

# 반드시 지킬 것
- 일반적 법률 정보 제공임을 전제로 서술. 단정적 자문이 아님.
- 관련 법조문을 정확히 인용 (예: 민법 제660조, 근로자퇴직급여 보장법 제9조, 근로기준법 제76조의2 등). 모르면 지어내지 말 것.
- 결과는 보장 대상이 아니라 변호사가 성실히 직무를 수행할 의무를 진다는 점을 분명히.
- 본문 중간에 내부링크를 자연스럽게 1~2개 삽입: [FAQ](/faq), [임금·퇴직금 계산기](/calc).
- 분량: 한국어 700~1100자. 문단 4~6개.

# 출력 형식 (매우 중요)
아래 키를 가진 JSON 객체 '하나만' 출력하세요. 코드펜스(\`\`\`)나 다른 설명 텍스트를 절대 붙이지 마세요.
{
  "title": "글 제목 (28자 내외, 검색 키워드 포함)",
  "excerpt": "메타 설명 겸 요약 (공백 포함 120자 이내, 마침표로 끝)",
  "tags": ["태그1", "태그2", "태그3"],
  "body": "마크다운 본문. 제목(h1)은 넣지 말 것. 면책 문구는 넣지 말 것(시스템이 자동 추가)."
}`;

// IndexNow 키 — public/<key>.txt 와 동일해야 한다(루트에 공개 배치됨).
const INDEXNOW_KEY = "938f576e2a5781026560da253ad84446";

// 신규/변경 URL 을 IndexNow(빙·네이버 등 공유)에 통지. 색인 가속용, 보장 아님. 실패는 무시.
async function pingIndexNow(url) {
  try {
    const endpoint = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(
      url
    )}&key=${INDEXNOW_KEY}`;
    const r = await fetch(endpoint);
    console.log(`   IndexNow 통지: ${r.status}`);
  } catch (e) {
    console.warn(`   IndexNow 통지 실패(무시): ${e.message}`);
  }
}

async function callClaude(userPrompt, maxTokens = 2600) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: BLOG_MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Anthropic 오류 ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return text;
}

function parseJsonLoose(text) {
  let t = text.trim();
  // 코드펜스 제거
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(t.slice(first, last + 1));
    }
    throw new Error("AI 응답을 JSON으로 파싱하지 못했습니다.");
  }
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`관리자 로그인: ${ADMIN_EMAIL}`);
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);

  // 이미 존재하는 slug(발행/초안 모두) 수집 — 중복 방지
  const snap = await getDocs(collection(db, "posts"));
  const existingSlugs = new Set(snap.docs.map((d) => d.data().slug));
  console.log(`기존 글 ${existingSlugs.size}개`);

  // 주제 큐에서 미사용 주제 선택
  const queue = JSON.parse(
    readFileSync(join(ROOT, "content/blog/topics.json"), "utf8")
  ).topics;
  let topic = queue.find((t) => !existingSlugs.has(t.slug));

  let userPrompt;
  if (topic) {
    console.log(`주제 선택: ${topic.slug} — ${topic.titleHint}`);
    userPrompt = `다음 주제로 칼럼을 작성하세요.
- 제목 힌트: ${topic.titleHint}
- 핵심 검색 키워드(본문·태그에 자연스럽게 반영): ${topic.keywords.join(", ")}`;
  } else {
    // 큐 소진 → AI에게 기존과 겹치지 않는 새 주제를 정하게 한다.
    console.log("주제 큐 소진 — AI가 새 주제 생성");
    const usedTitles = snap.docs.map((d) => d.data().title).filter(Boolean);
    userPrompt = `'퇴사·노동법' 클러스터에서 아직 다루지 않은 새로운 칼럼 주제를 스스로 하나 정해 작성하세요.
이미 발행된 글 제목(중복 금지): ${usedTitles.slice(0, 40).join(" / ") || "(없음)"}
실무에서 자주 검색되는 구체적 사안으로 고르세요.`;
  }

  // 생성 (최대 2회 시도 — 1회차가 금지표현에 걸리면 재생성)
  let post = null;
  let banned = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callClaude(
      attempt === 1
        ? userPrompt
        : `${userPrompt}\n\n[경고] 직전 출력에 금지표현(${banned.join(", ")})이 포함되어 폐기되었습니다. 해당 표현을 절대 쓰지 말고 다시 작성하세요.`
    );
    const parsed = parseJsonLoose(raw);
    const scanText = `${parsed.title}\n${parsed.excerpt}\n${parsed.body}`;
    banned = findBanned(scanText);
    post = parsed;
    if (banned.length === 0) break;
    console.warn(`시도 ${attempt}: 금지표현 발견 → ${banned.join(", ")}`);
  }

  if (!post || !post.title || !post.body) {
    throw new Error("유효한 글을 생성하지 못했습니다.");
  }

  // slug 결정: 큐 주제면 그 slug, 아니면 제목 기반(중복 회피)
  let slug = topic?.slug;
  if (!slug) {
    const base = `auto-${Date.now().toString(36)}`;
    slug = base;
  }

  const status = banned.length === 0 ? "published" : "draft";
  const payload = {
    slug,
    title: String(post.title).trim().slice(0, 80),
    excerpt: String(post.excerpt ?? "").trim().slice(0, 160),
    body: String(post.body) + DISCLAIMER,
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 5).map(String) : [],
    coverEmoji: topic?.coverEmoji ?? "⚖️",
    author: AUTHOR,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: status === "published" ? serverTimestamp() : null,
  };

  const ref = await addDoc(collection(db, "posts"), payload);

  if (status === "published") {
    console.log(`✓ 발행 완료: ${slug} (id=${ref.id})`);
    console.log(`   /blog/${slug}`);
    // 빙·네이버 등에 신규 URL 즉시 통지(색인 가속 — 보장 아님). 실패해도 발행 흐름은 유지.
    await pingIndexNow(`https://toesahero.com/blog/${slug}`);
  } else {
    console.warn(
      `⚠ 금지표현(${banned.join(", ")})으로 자동 발행 보류 → draft 저장 (id=${ref.id}). /admin/blog 에서 검토 필요.`
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e.message || e);
  process.exit(1);
});
