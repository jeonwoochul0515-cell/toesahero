// 같은 채팅 대화(sessionId)로 생성된 상담 문서 여러 건을 어드민 표시용 1건으로 묶는 헬퍼
import type { ConsultationDoc } from "../firebase";

export type GroupedConsultation = ConsultationDoc & {
  chatCount?: number; // 묶인 채팅 상담 문서 수 (2 이상이면 목록에 "N건" 배지 표시)
  groupSearchText?: string; // 그룹 내 모든 메시지를 합친 문자열 — 키워드 검색용
};

// source==="chat" && sessionId가 있는 문서를 sessionId별 1건으로 묶는다.
// rows는 createdAt desc 정렬(watchConsultations)이므로 세션별 첫 문서 = 최신 메시지가 대표가 된다.
// 이름·이메일·연락처·손배협박 플래그, 그리고 상태·메모는 그룹 내 어느 문서에 있든 대표에 승계한다.
export function groupChatSessions(
  rows: ConsultationDoc[]
): GroupedConsultation[] {
  const out: GroupedConsultation[] = [];
  const bySession = new Map<string, GroupedConsultation>();
  for (const r of rows) {
    const key = r.source === "chat" && r.sessionId ? r.sessionId : null;
    if (!key) {
      out.push(r);
      continue;
    }
    const g = bySession.get(key);
    if (!g) {
      const rep: GroupedConsultation = {
        ...r,
        chatCount: 1,
        groupSearchText: r.message ?? "",
      };
      bySession.set(key, rep);
      out.push(rep);
    } else {
      g.chatCount = (g.chatCount ?? 1) + 1;
      g.groupSearchText = `${g.groupSearchText ?? ""}\n${r.message ?? ""}`;
      if (!g.userName && r.userName) g.userName = r.userName;
      if (!g.userEmail && r.userEmail) g.userEmail = r.userEmail;
      if (!g.contact && r.contact) g.contact = r.contact;
      if (r.damageThreat) g.damageThreat = true;
      // 상태·메모 승계(2026-09-13). 손님이 대화를 더 하면 같은 대화에 새 접수 문서가
      // 생기고 대표가 그 문서로 바뀐다. 승계하지 않으면 카드가 "신규"로 되돌아가고
      // 어제 적은 변호사 메모가 목록·칸반에서 사라진다.
      // 판정은 "필드가 저장되어 있는지"로 한다 — 실무자가 일부러 「신규」로 되돌린 것도
      // 저장된 값이므로 옛 값이 그것을 덮지 않는다. rows가 최신순이라 먼저 만나는 값이 이긴다.
      if (g.status === undefined && r.status !== undefined) g.status = r.status;
      if (g.notes === undefined && r.notes !== undefined) g.notes = r.notes;
    }
  }
  return out;
}
