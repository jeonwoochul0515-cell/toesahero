// 홈에서 다른 페이지로 옮긴 도구로 가는 링크 한 줄 — 놓친 돈 체크(/calc)·계약서 조항 점검(/contract-check), 2026-09-25
import { Icon } from "./Icon";

export function MoreTools() {
  return (
    // 예전 #calc·#contract-check 앵커로 들어오는 링크를 받는다
    <section id="calc" className="more-tools" style={{ background: "var(--paper)" }}>
      <div className="wrap more-tools-row">
        <a href="/calc" className="more-tool">
          <Icon name="calc" size={22} />
          <span>
            <strong>받을 돈 계산해 보기</strong>
            퇴직금·연차수당·밀린 월급·지연이자
          </span>
          <Icon name="arrow" size={16} />
        </a>
        <a href="/contract-check" id="contract-check" className="more-tool">
          <Icon name="doc" size={22} />
          <span>
            <strong>계약서 무서운 조항 점검</strong>
            30일 통보·지급보류·손해배상 조항, 정말 효력이 있을까요
          </span>
          <Icon name="arrow" size={16} />
        </a>
      </div>
    </section>
  );
}
