// 같은 대화의 접수 문서를 1건으로 묶을 때 상태·메모가 사라지지 않는지 확인하는 테스트
import { describe, it, expect } from "vitest";
import { groupChatSessions } from "./groupChatSessions";
import type { ConsultationDoc } from "../firebase";

// rows는 watchConsultations와 같은 순서(createdAt 내림차순 = 최신 먼저)로 준다.
function chat(
  id: string,
  seconds: number,
  extra: Partial<ConsultationDoc> = {}
): ConsultationDoc {
  return {
    id,
    source: "chat",
    sessionId: "s1",
    message: `메시지 ${id}`,
    createdAt: { seconds, nanoseconds: 0 },
    ...extra,
  };
}

describe("groupChatSessions", () => {
  it("같은 대화의 문서를 1건으로 묶고 건수를 센다", () => {
    const out = groupChatSessions([chat("new", 200), chat("old", 100)]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("new");
    expect(out[0].chatCount).toBe(2);
  });

  it("새 문서가 대표가 되어도 앞서 저장한 상태와 메모를 승계한다", () => {
    const out = groupChatSessions([
      chat("new", 200),
      chat("old", 100, { status: "contacted", notes: "9/12 통화, 서류 요청" }),
    ]);
    expect(out[0].status).toBe("contacted");
    expect(out[0].notes).toBe("9/12 통화, 서류 요청");
  });

  it("대표 문서에 저장된 상태가 옛 상태에 덮이지 않는다 (신규로 되돌리기 존중)", () => {
    const out = groupChatSessions([
      chat("new", 200, { status: "new" }),
      chat("old", 100, { status: "contracted" }),
    ]);
    expect(out[0].status).toBe("new");
  });

  it("메모를 지운 것(빈 문자열)도 그대로 존중한다", () => {
    const out = groupChatSessions([
      chat("new", 200, { notes: "" }),
      chat("old", 100, { notes: "옛 메모" }),
    ]);
    expect(out[0].notes).toBe("");
  });

  it("여러 옛 문서가 있으면 더 최근 문서의 값을 쓴다", () => {
    const out = groupChatSessions([
      chat("newest", 300),
      chat("mid", 200, { status: "consulted" }),
      chat("oldest", 100, { status: "contacted" }),
    ]);
    expect(out[0].status).toBe("consulted");
  });

  it("채팅이 아닌 접수와 sessionId 없는 접수는 묶지 않는다", () => {
    const rows: ConsultationDoc[] = [
      { id: "form1", source: "form" },
      { id: "chat-no-session", source: "chat", sessionId: null },
      chat("c1", 100),
    ];
    const out = groupChatSessions(rows);
    expect(out.map((r) => r.id)).toEqual(["form1", "chat-no-session", "c1"]);
  });
});
