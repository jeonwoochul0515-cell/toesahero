// 히로 대화 운영 정책(호객꾼 §6) 검증 — §6-9가 요구하는 항목을 결정적으로 확인한다.
import { beforeEach, describe, expect, it } from "vitest";
import {
  formalBlocked,
  isQuestion,
  noteAnswered,
  notePendingQuestion,
  pendingQuestion,
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
