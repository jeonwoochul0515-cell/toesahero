// 히로 도크 — 방문자에게 먼저 말을 거는 호객꾼 캐릭터. 화면마다 안내하고 대화(ChatModal)로 잇는다.
// 능동성 최우선 원칙(2026-08-22): 끄기 버튼 없음, 억제는 "같은 화면 2분 쿨다운" 하나뿐.
// 프리렌더 주의: 반드시 마운트 후에만 렌더한다(정적 HTML에 위젯 흔적 0).
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mascot } from "./Mascot";
// 대화창은 Firestore SDK를 끌고 온다(370KB). 첫 화면에서는 필요 없으므로
// 손님이 히로를 눌러 대화를 열 때 받아 온다.
const ChatModal = lazy(() =>
  import("./ChatModal").then((m) => ({ default: m.ChatModal }))
);
import { Icon } from "./Icon";
import { getEntry } from "../lib/entry";
import { greetingFor, pageIntro, sectionIntro } from "../lib/hiroSpeech";

const KEY_MSGS = "hiro:msgs"; // ChatModal이 대화 이력을 저장하는 키 — 재방문 판별에 쓴다
const KEY_OPEN = "hiro:open"; // 패널 열림 상태 — 메뉴가 일반 링크(전체 로드)라 보존 안 하면 이동마다 닫힌다
const KEY_PAGE_SEEN = "hiro:page:"; // 값 = 마지막으로 그 화면을 안내한 시각(ms)
const SPEAK_COOLDOWN = 2 * 60 * 1000;

function loadOpenState(): boolean {
  try {
    return sessionStorage.getItem(KEY_OPEN) === "1";
  } catch {
    return false;
  }
}

function spokenRecently(path: string): boolean {
  try {
    return (
      Date.now() - parseInt(sessionStorage.getItem(KEY_PAGE_SEEN + path) || "0", 10) <
      SPEAK_COOLDOWN
    );
  } catch {
    return false;
  }
}

function markSpoken(path: string) {
  try {
    sessionStorage.setItem(KEY_PAGE_SEEN + path, String(Date.now()));
  } catch {
    /* 무시 */
  }
}

// 손님이 실제로 말을 건 적 있는 대화 이력이 있는지 — 재방문 인사 판별
function hasChatHistory(): boolean {
  try {
    const raw = sessionStorage.getItem(KEY_MSGS);
    return !!raw && raw.includes('"me"');
  } catch {
    return false;
  }
}

// 집중·민감 흐름이라 도크를 띄우지 않는 화면
const HIDDEN = /^\/(admin|delegation)(\/|$)/;

export function HiroChat() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [peek, setPeek] = useState(false); // 아바타 등장
  const [bubble, setBubble] = useState(false); // 먼저 건네는 말풍선
  const [bubbleTyped, setBubbleTyped] = useState(0);
  const [bubbleKey, setBubbleKey] = useState(0); // 말풍선 내용 교체 시 타이핑을 재시동하는 키
  const [open, setOpen] = useState(() => loadOpenState());
  const greeting = useRef("");
  const openRef = useRef(open);
  openRef.current = open;

  // 열림 상태 보존 — 페이지를 이동해도 대화가 열린 채 따라온다(동행 패널)
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY_OPEN, open ? "1" : "0");
    } catch {
      /* 무시 */
    }
  }, [open]);

  // 말 걸기 공통 경로 — 대화창이 열려 있으면 대화 안에 주입, 아니면 말풍선으로(타이핑 재시동 포함)
  const speak = (line: string) => {
    if (openRef.current) {
      window.dispatchEvent(new CustomEvent("hiro-page-intro", { detail: line }));
      return;
    }
    greeting.current = line;
    setPeek(true);
    setBubbleTyped(0);
    setBubbleKey((k) => k + 1);
    setBubble(true);
  };

  // 마운트 후에만 존재 — 프리렌더된 HTML에는 아무것도 남지 않는다
  useEffect(() => {
    setMounted(true);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const path = window.location.pathname;
    greeting.current = greetingFor(path, getEntry(), hasChatHistory());

    // 패널이 열린 채 이동해 온 경우(전체 로드) — 등장 연출 없이 새 화면 안내를 대화에 이어붙인다
    if (openRef.current) {
      const line = pageIntro(path);
      if (line && !HIDDEN.test(path) && !spokenRecently(path)) {
        markSpoken(path);
        const t = window.setTimeout(
          () =>
            window.dispatchEvent(
              new CustomEvent("hiro-page-intro", { detail: line })
            ),
          80
        );
        return () => window.clearTimeout(t);
      }
      return;
    }

    // 등장 연출: 3.5초 뒤 아바타가 튀어나오고, 잠시 후 말을 건다
    const t1 = window.setTimeout(() => setPeek(true), 3500);
    let t2 = 0;
    // 휴대폰 첫 화면에서는 말풍선이 본문의 문의 버튼을 덮는다(2026-09-15 점검).
    // 좁은 화면에서는 첫 화면을 지나 내려간 뒤에 말을 건다.
    const onScroll = () => {
      if (window.scrollY < 400) return;
      window.removeEventListener("scroll", onScroll);
      setBubble(true);
    };
    if (!HIDDEN.test(path) && !spokenRecently(path)) {
      markSpoken(path);
      t2 = window.setTimeout(() => {
        if (window.innerWidth > 480 || window.scrollY >= 400) setBubble(true);
        else window.addEventListener("scroll", onScroll, { passive: true });
      }, 4300);
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // 사이트 곳곳의 "상담하기" 버튼(open-chat 이벤트)이 대화창을 열게 한다
  useEffect(() => {
    const handler = () => {
      setBubble(false);
      setOpen(true);
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []);

  // 다른 메뉴로 이동하면 그 화면 안내를 건넨다(능동성 — 같은 화면 2분 쿨다운만).
  // 도달 경로 3개: 첫 화면은 마운트 인사가, SPA 이동은 여기가, 대화창이 열려 있으면 대화 안 주입이 담당.
  const firstPath = useRef<string | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (firstPath.current === null) {
      firstPath.current = location.pathname; // 첫 화면은 마운트 인사가 담당
      return;
    }
    if (HIDDEN.test(location.pathname)) return;
    const line = pageIntro(location.pathname);
    if (!line) return;
    if (spokenRecently(location.pathname)) return;
    markSpoken(location.pathname);
    speak(line); // 대화창이 열려 있으면 대화 안에, 아니면 말풍선으로
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, mounted, open]);

  // 홈은 긴 한 페이지 — 라우트가 안 바뀌어도 스크롤로 섹션에 들어오면 먼저 말을 건다(능동성 원칙).
  // 섹션이 화면 가운데 띠에 걸릴 때 발화, 같은 섹션은 2분 쿨다운.
  useEffect(() => {
    if (!mounted || location.pathname !== "/") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).id;
          const line = sectionIntro(id);
          if (!line) continue;
          const key = "/#" + id;
          if (spokenRecently(key)) continue;
          markSpoken(key);
          speak(line);
        }
      },
      // 화면 위아래 40%를 제외한 가운데 띠 기준 — 화면보다 키 큰 섹션도 확실히 잡힌다
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    for (const id of ["labor", "contract-check", "calc", "process", "lawyer", "pricing"]) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, location.pathname]);

  // 말풍선 타이핑 이펙트
  useEffect(() => {
    if (!bubble) return;
    if (reduced) {
      setBubbleTyped(greeting.current.length);
      return;
    }
    const iv = window.setInterval(() => {
      setBubbleTyped((n) => {
        if (n >= greeting.current.length) {
          window.clearInterval(iv);
          return n;
        }
        return n + 1;
      });
    }, 34);
    return () => window.clearInterval(iv);
  }, [bubble, reduced, bubbleKey]);

  const openChat = () => {
    setBubble(false);
    setOpen(true);
  };

  if (!mounted || HIDDEN.test(location.pathname)) return null;

  return (
    <>
      {peek && !open && (
        <div className={`hiro-dock${reduced ? " reduced" : ""}`}>
          <a
            href="tel:1660-4452"
            className="floater-btn floater-btn-call hiro-call"
            aria-label="전화로 상담하기"
          >
            <Icon name="phone" size={16} /> 전화 상담
          </a>
          {bubble && (
            <div className="hiro-bubble" role="dialog" aria-label="히로의 안내">
              <p className="hiro-bubble-name">히로 · 퇴사히어로</p>
              <p className="hiro-bubble-text">
                {greeting.current.slice(0, bubbleTyped)}
                {bubbleTyped < greeting.current.length && (
                  <span className="hiro-caret" />
                )}
              </p>
              <div className="hiro-bubble-actions">
                <button className="hiro-btn-talk" onClick={openChat}>
                  대화하기
                </button>
              </div>
            </div>
          )}
          <button
            className="hiro-avatar"
            onClick={openChat}
            aria-label="히로와 대화하기"
          >
            <Mascot size={118} pose={bubble ? "wave" : "stand"} />
            <span className="hiro-dot" aria-hidden="true" />
          </button>
        </div>
      )}
      {open && (
        <Suspense fallback={null}>
          <ChatModal
            open={open}
            onClose={() => setOpen(false)}
            greeting={greeting.current}
          />
        </Suspense>
      )}
    </>
  );
}
