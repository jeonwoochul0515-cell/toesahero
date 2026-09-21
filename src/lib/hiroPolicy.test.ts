// 히로 대화 운영 정책(호객꾼 §6) 검증 — §6-9가 요구하는 항목을 결정적으로 확인한다.
import { beforeEach, describe, expect, it } from "vitest";
import {
  alertNeeded,
  formalBlocked,
  intentOf,
  isLateNight,
  isQuestion,
  issuesFrom,
  ledgerHead,
  markAlerted,
  markOnce,
  noteAnswered,
  notePendingQuestion,
  noteVisit,
  pendingQuestion,
  slotsFrom,
  usedOnce,
  visitCount,
} from "./hiroPolicy";

// vitest 기본 환경은 node라 브라우저 저장소가 없다. 같은 동작의 최소 대역을 끼운다.
function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
  } as Storage;
}

beforeEach(() => {
  (globalThis as { sessionStorage?: Storage }).sessionStorage = fakeStorage();
  (globalThis as { localStorage?: Storage }).localStorage = fakeStorage();
});

describe("질문 판별", () => {
  it("물음표로 끝나면 질문이다 — 끝의 이모지·문장부호는 무시한다", () => {
    expect(isQuestion("어떤 조항이 걸리세요?")).toBe(true);
    expect(isQuestion("어떤 조항이 걸리세요? ")).toBe(true);
    expect(isQuestion("어떤 조항이 걸리세요? 🙂")).toBe(true);
    expect(isQuestion("(어떤 조항이 걸리세요?)")).toBe(true);
  });

  it("안내문은 질문이 아니다", () => {
    expect(isQuestion("패키지는 세 가지예요.")).toBe(false);
    expect(isQuestion("전화 1660-4452로 연락 주세요")).toBe(false);
  });
});

describe("§6-9 질문 직후 억제", () => {
  it("히로가 질문하면 정형 메시지가 막히고, 손님이 답하면 풀린다", () => {
    expect(formalBlocked()).toBe(false);
    notePendingQuestion("어떤 조항인가요?");
    expect(formalBlocked()).toBe(true);
    noteAnswered();
    expect(formalBlocked()).toBe(false);
  });

  it("대화창을 닫아도(=저장소만 남아도) 잠금이 유지된다", () => {
    notePendingQuestion("어떤 조항인가요?");
    // 컴포넌트가 사라진 상황 — 저장소 값만으로 판정된다
    expect(formalBlocked()).toBe(true);
    expect(pendingQuestion()).toBe("어떤 조항인가요?");
  });

  it("오염 상태(이전 잠금이 남아 있는 채 새 질문)에서도 마지막 질문이 남는다", () => {
    notePendingQuestion("회사 규모가 어떻게 되세요?");
    notePendingQuestion("계약서의 그 조항이 뭔가요?");
    expect(pendingQuestion()).toBe("계약서의 그 조항이 뭔가요?");
    expect(formalBlocked()).toBe(true);
  });

  it("답을 못 받은 채 10분이 지나면 잠금이 풀린다 — 침묵은 고장이다(헌장 제1조)", () => {
    sessionStorage.setItem(
      "hiro:pendingQ",
      JSON.stringify({ q: "어떤 조항인가요?", at: Date.now() - 11 * 60 * 1000 })
    );
    expect(formalBlocked()).toBe(false);
    // 상한이 지나도 "묻고 답을 못 받은 질문"이라는 사실은 남는다(§6-6 미회수 질문)
    expect(pendingQuestion()).toBe("어떤 조항인가요?");
  });

  it("저장소가 없어도 터지지 않고 잠그지 않는다", () => {
    (globalThis as { sessionStorage?: Storage }).sessionStorage = undefined;
    expect(() => notePendingQuestion("x?")).not.toThrow();
    expect(formalBlocked()).toBe(false);
    expect(pendingQuestion()).toBe(null);
  });
});

describe("§6-9 재질문 금지 — 이미 받은 답은 슬롯으로 기억한다", () => {
  it("회사 규모·보유 자료·퇴사 사유를 손님 말에서 그대로 뽑는다", () => {
    const slots = slotsFrom(
      [
        { who: "them", text: "어떤 상황이세요?" },
        { who: "me", text: "5인 미만 회사고요, 권고사직 당했어요. 카톡이랑 급여명세서는 있어요." },
      ],
      { name: "윤창우", contactSaved: true }
    );
    expect(slots).toContain("성함 윤창우");
    expect(slots).toContain("회신 연락처 접수 완료");
    expect(slots.some((s) => s.includes("5인 미만"))).toBe(true);
    expect(slots.some((s) => s.includes("카톡"))).toBe(true);
    expect(slots.some((s) => s.includes("권고사직"))).toBe(true);
  });

  it("히로의 말은 슬롯으로 세지 않는다 — 손님이 한 답만 기억한다", () => {
    const slots = slotsFrom([
      { who: "them", text: "5인 미만 사업장이신가요? 카톡 기록은 있으세요?" },
    ]);
    expect(slots).toEqual([]);
  });
});

describe("§6-9 중복 전송", () => {
  it("같은 쟁점이 반복돼도 쟁점 목록은 한 번만 잡힌다", () => {
    const issues = issuesFrom([
      { who: "me", text: "퇴직금을 못 받았어요" },
      { who: "me", text: "퇴직금을 못 받았어요" },
    ]);
    expect(issues).toEqual(["퇴직금"]);
  });
});

describe("§6-9 세션 재개 — 접수 알림은 세 경우에만", () => {
  const base = { sessionId: "s1", name: "", phone: "", issues: [] as string[] };

  it("최초 접수는 알린다", () => {
    expect(alertNeeded(base)).toBe(true);
  });

  it("같은 내용으로 다시 보고하면 문자를 보내지 않는다(접수함은 갱신된다)", () => {
    markAlerted(base);
    expect(alertNeeded(base)).toBe(false);
  });

  it("성함·연락처가 새로 확보되면 다시 알린다", () => {
    markAlerted(base);
    expect(alertNeeded({ ...base, name: "윤창우" })).toBe(true);
    markAlerted({ ...base, name: "윤창우" });
    expect(alertNeeded({ ...base, name: "윤창우", phone: "010-1234-5678" })).toBe(true);
  });

  it("새 쟁점이 붙으면 다시 알린다", () => {
    markAlerted({ ...base, issues: ["퇴직금"] });
    expect(alertNeeded({ ...base, issues: ["퇴직금"] })).toBe(false);
    expect(alertNeeded({ ...base, issues: ["퇴직금", "부당해고"] })).toBe(true);
  });

  it("보고가 실패하면 기록하지 않으므로 다음에 다시 알린다", () => {
    expect(alertNeeded(base)).toBe(true);
    // markAlerted를 부르지 않았다 = 문자가 못 나갔다
    expect(alertNeeded(base)).toBe(true);
  });
});

describe("§6-9 미회수 질문 · §6-7 절박 신호", () => {
  it("답을 못 받은 질문이 접수 맨 위에 적힌다", () => {
    notePendingQuestion("계약서의 그 조항이 뭔가요?");
    const head = ledgerHead({ unanswered: pendingQuestion(), lateNight: true, visits: 3 });
    expect(head.split("\n")[0]).toBe("「미회수 질문」 계약서의 그 조항이 뭔가요?");
    expect(head).toContain("심야");
    expect(head).toContain("재방문 3회");
  });

  it("답을 받았으면 미회수 질문이 없다", () => {
    notePendingQuestion("계약서의 그 조항이 뭔가요?");
    noteAnswered();
    expect(ledgerHead({ unanswered: pendingQuestion(), lateNight: false, visits: 1 })).toBe("");
  });

  it("22~05시를 심야로 본다", () => {
    expect(isLateNight(new Date(2026, 8, 10, 3, 17))).toBe(true);
    expect(isLateNight(new Date(2026, 8, 10, 22, 0))).toBe(true);
    expect(isLateNight(new Date(2026, 8, 10, 14, 0))).toBe(false);
  });

  it("방문은 탭 세션당 한 번만 센다", () => {
    expect(noteVisit()).toBe(1);
    expect(noteVisit()).toBe(1); // 같은 탭 세션의 다른 페이지 로드
    (globalThis as { sessionStorage?: Storage }).sessionStorage = fakeStorage(); // 새 방문
    expect(noteVisit()).toBe(2);
    expect(visitCount()).toBe(2);
  });
});

describe("접수함 판정(intent)", () => {
  it("쟁점이 잡히고 손님이 충분히 말했으면 사건으로 본다", () => {
    const s = intentOf({
      issues: ["퇴직금", "부당해고"],
      userChars: 200,
      contactSaved: true,
      lateNight: true,
      visits: 2,
    });
    expect(s.startsWith("사건")).toBe(true);
    expect(s).toContain("연락처 접수");
    expect(s).toContain("심야");
    expect(s).toContain("재방문 2회");
    expect(s.length).toBeLessThanOrEqual(120);
  });

  it("한두 마디만 던지고 만 방문은 불명이다", () => {
    const s = intentOf({
      issues: [],
      userChars: 5,
      contactSaved: false,
      lateNight: false,
      visits: 1,
    });
    expect(s.startsWith("불명")).toBe(true);
  });
});

describe("§6-3 고정 안내는 한 대화에 한 번", () => {
  it("실제로 내보낸 뒤에만 기록한다 — 막힌 안내는 다음에 다시 나갈 수 있다", () => {
    expect(usedOnce("/#pricing")).toBe(false);
    // 잠겨서 못 나간 경우: markOnce를 부르지 않는다
    expect(usedOnce("/#pricing")).toBe(false);
    markOnce("/#pricing");
    expect(usedOnce("/#pricing")).toBe(true);
  });
});

describe("오염 상태(대화 이력 + 재방문 + 같은 화면 재진입)", () => {
  it("이전 방문의 알림 기록·쿨다운이 남아 있어도 새 세션의 첫 보고는 알린다", () => {
    noteVisit(); // 어제 왔던 방문
    markAlerted({ sessionId: "old", name: "윤창우", phone: "010", issues: ["퇴직금"] });
    markOnce("/#pricing");
    notePendingQuestion("계약서의 그 조항이 뭔가요?");
    // 새 탭 세션 = 새 sessionStorage. localStorage(방문 횟수)만 이어진다.
    (globalThis as { sessionStorage?: Storage }).sessionStorage = fakeStorage();
    expect(alertNeeded({ sessionId: "new", name: "", phone: "", issues: [] })).toBe(true);
    expect(usedOnce("/#pricing")).toBe(false);
    expect(formalBlocked()).toBe(false);
    expect(noteVisit()).toBe(2);
  });
});
