// 중앙 접수함 lead/detail 칸 구성 — 사이트 어드민 상담 상세에서만 보이던 정보를 [라벨, 값] 표로 옮긴다.
// 값은 전부 글자(HTML 금지). 민감값(주민번호·계좌·생년월일·주소·이메일)은 가린다. 결제는 조회만.

import type { FsRow } from "./_firestore";
import { kst, maskAddress, maskBirth, maskEmail, masked, STATUS_LABEL, str, type Resolved } from "./_adminApi";

type Section = { title: string; rows: Array<[string, string]> };

const SOURCE_LABEL: Record<string, string> = {
  chat: "히로 상담 대화",
  form: "상담 신청 폼",
  floating: "빠른 문의",
  draft: "AI 통보문 신청",
  notice: "내용증명(표준) 신청",
};

const LETTER_STATUS: Record<string, string> = {
  pending_review: "검토 대기",
  edited: "수정됨",
  approved: "승인됨(발송 대기)",
  sent: "발송 완료",
};

const PAY_STATUS: Record<string, string> = {
  pending: "결제 대기",
  ready: "결제 대기",
  paid: "결제 완료",
  canceled: "취소",
  failed: "실패",
};

const won = (v: unknown) => (typeof v === "number" ? `${v.toLocaleString("ko-KR")}원` : "");

function push(rows: Array<[string, string]>, label: string, value: string) {
  if (value) rows.push([label, value]);
}

function caseSection(r: FsRow): Section {
  const d = r.data;
  const rows: Array<[string, string]> = [];
  push(rows, "접수 일시(한국시간)", kst(d.createdAt));
  push(rows, "경로", SOURCE_LABEL[str(d.source)] ?? str(d.source, 20));
  push(rows, "사이트 상태", STATUS_LABEL[str(d.status)] ?? (d.status === undefined ? "" : str(d.status, 20)));
  push(rows, "이름", str(d.userName, 40));
  push(rows, "연락처", str(d.contact, 30));
  push(rows, "이메일", maskEmail(d.userEmail));
  push(rows, "접수 페이지", str(d.path, 200));
  push(rows, "메시지", masked(d.message, 3000));
  if (Array.isArray(d.pickedItems) && d.pickedItems.length) {
    push(rows, "선택 항목", d.pickedItems.filter((x) => typeof x === "string").join(", ").slice(0, 500));
  }
  push(rows, "참고 합산액", won(d.estimatedAmount));
  const meta = (d.meta && typeof d.meta === "object" ? d.meta : {}) as Record<string, unknown>;
  push(rows, "사실관계 요약", masked(meta.factSummary, 3000));
  push(rows, "사무실 메모", masked(d.notes, 2000));
  return { title: `접수 #${r.id.slice(0, 8)} · ${SOURCE_LABEL[str(d.source)] ?? "접수"}`, rows };
}

/** 상세 칸. orders 는 이 접수 상담 문서들의 caseId 로 찾은 주문(조회 전용). */
export function buildDetail(res: Resolved, orders: FsRow[]): Section[] {
  const cs = res.consultations;
  const sections: Section[] = cs.slice(0, 5).map(caseSection);
  if (cs.length > 5) sections.push({ title: "이전 접수", rows: [["생략", `${cs.length - 5}건 더 있음`]] });

  // 안전 신호 — 손배 위협은 상담 문서에 저장된다. 긴급(자해) 신호는 저장하지 않고 문자로만 알린다.
  const threat = cs.some((r) => r.data.damageThreat === true);
  sections.push({
    title: "안전 신호",
    rows: [
      ["손해배상·위약금 협박", threat ? "감지됨 — 변호사 우선 대응" : "감지 안 됨"],
      ["긴급(자해) 신호", "사이트에 기록하지 않고 문자로만 알립니다"],
    ],
  });

  // 서면 진행
  const docs: Array<[string, string]> = [];
  const letter = cs.find((r) => str(r.data.draftLetter));
  if (letter) push(docs, "통보문 초안", LETTER_STATUS[str(letter.data.draftStatus)] ?? "작성됨");
  const notice = cs.find((r) => str(r.data.noticeLetter));
  if (notice) push(docs, "내용증명 초안", LETTER_STATUS[str(notice.data.noticeStatus)] ?? "작성됨");
  const del = cs.find((r) => (r.data.meta as Record<string, unknown> | undefined)?.docType === "delegation");
  if (del) {
    const m = del.data.meta as Record<string, unknown>;
    push(docs, "위임장", "제출됨(전자서명)");
    push(docs, "위임장 제출(한국시간)", kst(m.signedAt));
    push(docs, "생년월일", maskBirth(m.birth));
    push(docs, "주소", maskAddress(m.address));
  }
  if (docs.length) sections.push({ title: "서면 진행", rows: docs });

  // 결제·주문 — 조회만. 결제키 같은 식별값은 싣지 않는다.
  const pay: Array<[string, string]> = [];
  for (const r of cs) {
    if (!r.data.paymentStatus && !r.data.packageId) continue;
    push(
      pay,
      `접수 #${r.id.slice(0, 8)}`,
      [str(r.data.packageId, 20), PAY_STATUS[str(r.data.paymentStatus)] ?? str(r.data.paymentStatus, 20), won(r.data.paymentAmount)]
        .filter(Boolean)
        .join(" · ")
    );
  }
  for (const o of orders.slice(0, 10)) {
    push(
      pay,
      `주문 …${o.id.slice(-6)}`,
      [
        str(o.data.packageId, 20),
        PAY_STATUS[str(o.data.status)] ?? str(o.data.status, 20),
        won(o.data.amount),
        o.data.approvedAt ? `승인 ${kst(o.data.approvedAt)}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    );
  }
  if (pay.length) {
    pay.push(["안내", "결제 확인·환불은 사이트 어드민 > 결제 관리에서만 합니다"]);
    sections.push({ title: "결제·주문 (조회 전용)", rows: pay });
  }

  if (res.messages.length) {
    sections.push({
      title: "히로 대화",
      rows: [
        ["메시지 수", String(res.messages.length)],
        ["첫 메시지(한국시간)", kst(res.messages[0].data.createdAt)],
        ["마지막 메시지(한국시간)", kst(res.messages[res.messages.length - 1].data.createdAt)],
      ],
    });
  }
  return sections;
}
