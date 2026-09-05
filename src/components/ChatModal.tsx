// 히로 상담 대화창 — 호객꾼 캐릭터 "히로"가 전면에 서고, 판단·검토는 김창희 변호사가 맡는 구조.
// 연락처 게이트(익명 채팅 차단)·통보문 초안 퍼널·카카오 본인확인·Firestore 로깅을 유지한다.
// 접수(연락처 확보) 후에는 대화 전문을 빠짐없이 정리해 문자로 보고한다(2026-08-22 원칙).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  logChatMessage,
  saveConsultation,
  saveConsultationDetailed,
  saveDraftConsultation,
  signInWithKakao,
  signOut,
  watchAuth,
  type AppUser,
} from "../firebase";
import { Icon } from "./Icon";
import { Mascot, type MascotPose } from "./Mascot";

type Expression = "base" | "empathy" | "resolve" | "calm" | "cheer" | "urgent";

type Msg = {
  who: "me" | "them";
  text: string;
  expression?: Expression;
  urgent?: boolean;
};

// 표정 → 마스코트 포즈 매핑 (서버가 표정 태그를 파싱해 expression으로 내려준다)
const POSE: Record<Expression, MascotPose> = {
  base: "stand",
  empathy: "empathy",
  resolve: "fly",
  calm: "wink",
  cheer: "wave",
  urgent: "shock",
};

// AI 결과물을 검토하는 변호사 — 광고 규정(변호사 광고에 관한 규정 제6조)상 광고 및 AI 결과물에 표시 필수
const REVIEWING_LAWYER = "김창희";

const KEY_MSGS = "hiro:msgs";
const KEY_SID = "hiro:sid";
const KEY_CONTACT = "hiro:contact";

// 연락처 제출 상태도 탭 세션에 보존 — 대화(hiro:msgs)만 복원되고 이건 초기화되면
// 이미 연락처를 남긴 분이 새로고침 후 다시 차단되는 사고가 난다(2026-08-22 실사고).
function loadStoredContact(): {
  name: string;
  phone: string;
  saved: boolean;
  shareChat: boolean;
} {
  try {
    const raw = sessionStorage.getItem(KEY_CONTACT);
    if (raw) {
      const c = JSON.parse(raw) as {
        name?: string;
        phone?: string;
        saved?: boolean;
        shareChat?: boolean;
      };
      return {
        name: c.name || "",
        phone: c.phone || "",
        saved: c.saved === true,
        // 동의는 명시적으로 true일 때만 — 저장값이 깨져도 "동의함"으로 복원되지 않게
        shareChat: c.shareChat === true,
      };
    }
  } catch {
    /* 못 읽으면 새로 시작 */
  }
  return { name: "", phone: "", saved: false, shareChat: false };
}

// 한 번의 채팅 대화를 묶는 세션 ID — 탭 세션 동안 유지(새로고침에도 이어진다)
function loadSessionId(): string {
  try {
    const saved = sessionStorage.getItem(KEY_SID);
    if (saved) return saved;
  } catch {
    /* 못 읽으면 새로 발급 */
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  try {
    sessionStorage.setItem(KEY_SID, id);
  } catch {
    /* 저장 실패 무시 */
  }
  return id;
}

function loadStoredMsgs(): Msg[] {
  try {
    const raw = sessionStorage.getItem(KEY_MSGS);
    if (raw) return JSON.parse(raw) as Msg[];
  } catch {
    /* 사생활 보호 모드 등 — 새 대화로 시작 */
  }
  return [];
}

// 상담 시간(평일 9~18시) 여부 — 방문자 기기 시각 기준으로 판단해 서버에 알려 준다
function isOfficeOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const h = now.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}

const replies = [
  "어떤 서비스예요?",
  "비용이 궁금해요",
  "계약서에 무서운 조항이 있어요",
  "사장과 연락이 안 됩니다",
  "퇴직금 관련 문의",
  "직장 내 괴롭힘 상담",
];

// AI 챗봇 미설정·장애 시 폴백 응답
const fallbackResponses: Record<string, string> = {
  "어떤 서비스예요?":
    "퇴사 통보 대행부터 임금·퇴직금 청구, 직장 내 괴롭힘·부당해고 분쟁 대응까지 변호사가 직접 처리하는 서비스입니다. 임금 계산기(/calc)와 셀프 진단(/diagnose)도 무료로 쓰실 수 있습니다.",
  "비용이 궁금해요":
    "단순 통보 199,000원, 임금 청구 통합 390,000원, 분쟁 대응 790,000원 — 세 가지 정액 패키지입니다. 상황을 말씀해 주시면 맞는 패키지를 안내드립니다.",
  "계약서에 무서운 조항이 있어요":
    "통보 기간·승인·손해배상·지급보류 같은 조항은 실제 효력을 다툴 여지가 있는 경우가 많습니다. 어떤 조항인지 알려주시거나, 카카오톡 채널로 계약서 사진을 보내주시면 변호사가 확인 후 안내드립니다.",
  "사장과 연락이 안 됩니다":
    "변호사 명의로 공식 통보를 진행하는 절차가 있습니다. 사안에 따라 적합한 절차를 변호사가 안내드립니다.",
  "퇴직금 관련 문의":
    "근속기간과 평균임금 정보를 알려주시면 변호사가 검토 후 안내드립니다.",
  "직장 내 괴롭힘 상담":
    "관련 증거가 있는 경우 산재 신청·민사 청구 등의 절차 검토가 가능합니다. 비대면 상담 가능하니 카카오톡 채널로 연결드릴까요?",
  "퇴사 절차 안내":
    "기본 절차 위임은 199,000원부터 안내드리고 있습니다. 자세한 사항은 위임계약 시 안내드립니다.",
};

const FALLBACK_DEFAULT =
  "메시지 확인했습니다. 정확한 답변을 위해 카카오톡 채널 또는 1660-4452로 변호사와 직접 연결드리겠습니다.";

const PHONE_INVALID_MSG =
  "회신은 문자나 전화로 드리기 때문에 전화번호가 꼭 필요해요. 01로 시작하는 휴대폰 번호를 숫자로 입력해 주세요.";

const NAME_MISSING_MSG =
  "성함도 함께 남겨 주세요. 변호사가 연락드릴 때 어떻게 불러드리면 될지 필요해요.";

const PRIVACY_REQUIRED_MSG =
  "개인정보 수집·이용 동의에 체크해 주셔야 접수를 전달해 드릴 수 있어요. 성함과 연락처는 변호사 회신 목적으로만 사용됩니다.";

const DEFAULT_GREETING =
  "안녕하세요, 퇴사히어로의 상담 챗봇 히로예요. 회사 일로 마음 무거우셨죠. 어떤 상황인지 편하게 말씀해 주시면 뭐가 중요한지 같이 정리해 드릴게요.";

type AiReply = {
  text: string;
  expression?: Expression;
  urgent?: boolean;
  phoneDetected?: boolean;
};

// 대화창에 적힌 회신 번호를 감지한다 — 유효한 번호가 남으면 그대로 자동 접수한다.
function extractPhone(text: string): string {
  const m = text.match(/(^|\D)(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})(?=\D|$)/);
  if (!m) return "";
  const digits = m[2].replace(/\D/g, "");
  return /^01[016789][0-9]{7,8}$/.test(digits) ? digits : "";
}

// 자동 접수 성공 — 회신 목적 고지와 다음 단계(성함)까지 한 번에 안내한다.
const PHONE_AUTO_ACCEPTED_MSG =
  "남겨주신 번호를 변호사 회신용으로 접수했어요! 김창희 변호사님이 영업시간 중 확인 후 연락드립니다. 성함도 알려주시면 준비가 더 정확해져요.";

// 자동 접수 실패(저장·알림 모두 불발) — 거짓 성공 대신 접수칸 경로를 안내한다.
const PHONE_IN_CHAT_MSG =
  "지금 접수 전달에 문제가 생겨 대화창의 번호가 아직 접수되지 못했어요. 아래 접수칸에 번호를 채워 뒀으니 성함과 함께 \"연락처 남기기\"를 눌러 주세요. 급하시면 전화 1660-4452로 연락 부탁드려요.";

async function callAiChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userName: string | null,
  contactSaved: boolean
): Promise<AiReply | null> {
  // 일시 오류로 즉시 기계식 폴백이 나가는 것을 막기 위해 1회 재시도
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages,
          userName,
          // 게이트 통과 여부 — 이걸 안 알려주면 히로가 접수 완료 손님에게 연락처를 또 요청한다
          contactSaved,
          page: window.location.pathname,
          officeOpen: isOfficeOpen(),
        }),
      });
      if (resp.status === 503) {
        // AI not configured — fall back (재시도 무의미)
        return null;
      }
      if (!resp.ok) {
        console.warn("[chat] upstream error", resp.status);
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return null;
      }
      const data = (await resp.json()) as {
        text?: string;
        expression?: Expression;
        urgent?: boolean;
        phoneDetected?: boolean;
      };
      if (!data.text) return null;
      return {
        text: data.text,
        expression: data.expression,
        urgent: data.urgent,
        phoneDetected: data.phoneDetected,
      };
    } catch (e) {
      console.warn("[chat] network error", e);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return null;
    }
  }
  return null;
}

type Props = {
  open: boolean;
  onClose: () => void;
  greeting?: string; // 히로 도크가 계산한 상황 맞춤 첫인사
};

export function ChatModal({ open, onClose, greeting }: Props) {
  const [messages, setMessages] = useState<Msg[]>(() => loadStoredMsgs());
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSubmitted, setDraftSubmitted] = useState(false);
  const [contactName, setContactName] = useState(() => loadStoredContact().name); // 성함 — 접수·호칭에 쓴다
  const [contact, setContact] = useState(() => loadStoredContact().phone); // 전화번호 (카톡 ID 불가 — 회신 채널이 문자·전화)
  const [contactSaved, setContactSaved] = useState(() => loadStoredContact().saved);
  const [contactSending, setContactSending] = useState(false);
  // 대화 내용 전달 동의 — 민감정보가 섞이므로 기본 해제. 손님이 직접 체크해야 전달된다.
  const [shareChat, setShareChat] = useState(() => loadStoredContact().shareChat);
  // 개인정보 수집·이용 동의(필수) — 체크 전에는 접수가 전송되지 않는다.
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  // 연락처 시트 — 평소엔 접혀 있고 필요한 순간에만 대화 위로 올라온다(2026-09-06).
  // 예전엔 첫 마디 직후부터 폼이 상시 노출돼 대화 영역이 화면의 14%밖에 남지 않았다.
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const sheetAutoShownRef = useRef(false); // 3턴 자동 펼침은 1회만
  const closeAskedRef = useRef(false); // 닫기 때 붙잡기도 1회만
  const pendingDraftRef = useRef(false); // 연락처를 받고 이어서 통보문 요청할지
  const bodyRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);
  // 이 탭 세션 동안 유지되는 세션 ID. 메시지·상담 건·대화록 보고를 묶는다.
  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) sessionIdRef.current = loadSessionId();

  useEffect(() => watchAuth(setUser), []);

  // 첫 대화는 바로 시작한다. 연락처는 답변을 받은 뒤 회신을 원하는 분만 남긴다.
  useEffect(() => {
    if (!open) return;
    setMessages((m) =>
      m.length > 0
        ? m
        : [{ who: "them", text: greeting || DEFAULT_GREETING }]
    );
  }, [open, greeting]);

  // 대화 이력은 이 기기(탭 세션)에만 저장 — 재방문 인사·새로고침 연속성·대화록 보고에 쓴다
  useEffect(() => {
    try {
      if (messages.length)
        sessionStorage.setItem(KEY_MSGS, JSON.stringify(messages.slice(-40)));
    } catch {
      /* 저장 실패 무시 */
    }
  }, [messages]);

  // 연락처 제출 상태 보존 — 새로고침 후에도 이미 접수한 분을 다시 차단하지 않는다
  useEffect(() => {
    try {
      sessionStorage.setItem(
        KEY_CONTACT,
        JSON.stringify({
          name: contactName,
          phone: contact,
          saved: contactSaved,
          shareChat,
        })
      );
    } catch {
      /* 저장 실패 무시 */
    }
  }, [contactName, contact, contactSaved, shareChat]);

  // 화면 이동 안내(도달 경로 ③) — 대화창이 열려 있을 때 히로 도크가 쏘는 안내를 대화에 넣는다
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const line = (e as CustomEvent<string>).detail;
      if (!line) return;
      setMessages((m) => [...m, { who: "them", text: line, expression: "base" }]);
    };
    window.addEventListener("hiro-page-intro", handler);
    return () => window.removeEventListener("hiro-page-intro", handler);
  }, [open]);

  // ── 접수 후 대화 전문 보고 (2026-08-24 개정) ──────────────────────────────────
  // 전문은 중앙 접수함에 저장하고 문자는 간단 알림 한 통만 보낸다(서버가 처리).
  // ⚠ 법적 안전장치: 대화에는 민감정보가 섞이므로 손님이 "대화 전달" 칸을 직접
  //   체크한 경우에만 보고한다. 체크 안 하면 성함·연락처만 전달되고 대화는 안 나간다.
  // 트리거: ①대화창 닫힘 ②페이지 이탈(pagehide/visibilitychange) ③소강 3분 ④초안 접수.
  // 세션별 "마지막 보고 메시지 수"를 기억해 새 내용이 있을 때만, 매번 누적 전문을 보낸다.
  const stateRef = useRef({
    messages,
    contactSaved,
    contact,
    contactName,
    shareChat,
    user,
  });
  stateRef.current = {
    messages,
    contactSaved,
    contact,
    contactName,
    shareChat,
    user,
  };
  const reportedRef = useRef(0);

  function reportChatLog(useBeacon: boolean) {
    const s = stateRef.current;
    if (!s.contactSaved || !s.shareChat) return;
    const count = s.messages.length;
    const key = `hiro:reported:${sessionIdRef.current}`;
    let last = reportedRef.current;
    try {
      last = Math.max(last, parseInt(sessionStorage.getItem(key) || "0", 10) || 0);
    } catch {
      /* 못 읽으면 메모리 값 사용 */
    }
    if (count <= last) return;
    const markReported = () => {
      reportedRef.current = count;
      try {
        sessionStorage.setItem(key, String(count));
      } catch {
        /* 무시 */
      }
    };
    const transcript = s.messages
      .map((m) => `${m.who === "me" ? "손님" : "히로"}: ${m.text}`)
      .join("\n");
    const payload = JSON.stringify({
      type: "chatlog",
      sessionId: sessionIdRef.current,
      name: s.contactName.trim() || s.user?.displayName || null,
      contact: s.contact.trim() || null,
      transcript,
      consent: true,
      attr:
        (
          window as unknown as { getAttribution?: () => unknown }
        ).getAttribution?.() ?? null,
    });
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const queued = navigator.sendBeacon(
        "/api/notify",
        new Blob([payload], { type: "application/json" })
      );
      if (queued) markReported();
      return;
    }
    void fetch("/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        if (result?.ok === true) markReported();
      })
      .catch(() => {});
  }

  // 페이지 이탈(탭 닫기·외부 이동) 시에도 대화록이 유실되지 않게 sendBeacon으로 보고.
  // visibilitychange(hidden)도 함께 잡는다 — 모바일에서 앱 전환·탭 종료 시 pagehide가 안 오는 경우 대비.
  useEffect(() => {
    const onHide = () => reportChatLog(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") reportChatLog(true);
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 실시간 유실 방지: 접수된 대화가 3분간 소강 상태면 그 시점까지의 전문을 보고한다.
  // 창을 안 닫고 폰이 꺼지거나 브라우저가 죽어도 마지막 3분 이전 내용은 이미 변호사에게 가 있다.
  useEffect(() => {
    if (!contactSaved || !shareChat || messages.length === 0) return;
    const t = window.setTimeout(() => reportChatLog(false), 3 * 60 * 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, contactSaved, shareChat]);

  // 초안 접수는 핵심 전환 이벤트 — 접수 직후의 대화 전문도 보고한다
  useEffect(() => {
    if (draftSubmitted) reportChatLog(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSubmitted]);

  const handleClose = () => {
    // 연락처 없이 나가려 하면 딱 한 번만 붙잡는다. 두 번째 닫기는 무조건 닫힌다 —
    // 빠져나갈 길이 없는 안내를 만들지 않는다.
    if (
      !contactSaved &&
      !closeAskedRef.current &&
      messages.some((m) => m.who === "me")
    ) {
      closeAskedRef.current = true;
      setContactSheetOpen(true);
      return;
    }
    reportChatLog(false);
    onClose();
  };

  // 의뢰인이 충분히 정보를 제공했는지 추정 (말한 횟수 + 글자 수)
  const userTurnCount = useMemo(
    () => messages.filter((m) => m.who === "me").length,
    [messages]
  );
  const userTotalChars = useMemo(
    () =>
      messages
        .filter((m) => m.who === "me")
        .reduce((sum, m) => sum + m.text.length, 0),
    [messages]
  );
  const showDraftButton =
    !draftSubmitted &&
    userTurnCount >= 2 &&
    userTotalChars >= 30;

  // 대화가 세 마디쯤 쌓이면 연락처 시트를 한 번 올린다. 첫 마디부터 폼을 들이밀면
  // "상담하러 왔더니 영업 폼"으로 읽혀 이탈한다 — 상황을 주고받은 뒤가 수락률이 높다.
  useEffect(() => {
    if (contactSaved || sheetAutoShownRef.current) return;
    if (userTurnCount >= 3) {
      sheetAutoShownRef.current = true;
      setContactSheetOpen(true);
    }
  }, [userTurnCount, contactSaved]);

  // 통보문 작성 요청 — 손님에게 초안을 보여주지 않는다(2026-09-06 개정).
  //
  // ⚠ 변협 「변호사 광고에 관한 규정」 관련. 예전에는 손님이 버튼을 눌러 초안을 받고
  //   전문을 화면에서 읽는 구조였는데, 이는 "소비자가 AI 프로그램을 직접 사용하게 하는"
  //   광고 양태에 해당할 소지가 있다. 그래서 초안은 접수함에만 저장하고 손님에게는
  //   "요청이 접수되었다"만 알린다. 결과물은 김창희 변호사가 검토해 발송한다.
  //   ⇒ 이 흐름을 되돌려 손님 화면에 초안을 다시 노출하지 말 것.
  const requestLetter = async (
    // 연락처를 막 받은 직후 이어서 부를 때는 state 반영을 기다리지 않고 값을 직접 받는다
    justSaved?: { name: string; phone: string }
  ) => {
    if (draftSubmitted || draftLoading) return;
    // 통보문을 보낼 곳이 없으면 시작하지 않는다. 연락처가 필요한 이유가
    // 스스로 설명되는 자리라 여기서 시트를 연다.
    if (!contactSaved && !justSaved) {
      pendingDraftRef.current = true;
      setContactSheetOpen(true);
      hiroSay(
        "통보문을 보내드릴 곳이 필요해요. 아래에 성함과 연락처를 남겨 주시면 그대로 이어서 접수해 드릴게요."
      );
      return;
    }
    setDraftLoading(true);
    try {
      const conversation = messages
        .filter((m) => m.who === "me" || m.who === "them")
        .map((m) => ({
          role: (m.who === "me" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content: m.text,
        }));
      const resp = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversation,
          userName: user?.displayName ?? null,
        }),
      });
      const draft = resp.ok
        ? ((await resp.json()) as { text?: string }).text ?? ""
        : "";
      if (!draft) {
        hiroSay(
          "지금 요청 접수에 일시적인 문제가 있어요. 잠시 후 다시 눌러 주시고, 급하시면 전화 1660-4452 또는 카카오톡 채널로 연락 부탁드려요."
        );
        return;
      }
      // 초안은 화면에 띄우지 않고 접수함에만 저장한다 — 변호사가 검토·수정해 발송한다.
      // 선택 동의가 없으면 대화 전문을 섞지 않아 "성함·연락처만 전달" 약속을 지킨다.
      const conversationLog = shareChat
        ? messages
            .filter((m) => m.who === "me" || m.who === "them")
            .map((m) => `${m.who === "me" ? "[의뢰인]" : "[히로]"} ${m.text}`)
            .join("\n")
        : "";
      const id = await saveDraftConsultation({
        conversationLog,
        draftLetter: draft,
        userName:
          justSaved?.name || contactName.trim() || user?.displayName || null,
        // 이 대화에서 연락처를 이미 남겼다면 접수에도 실어 변호사가 바로 회신할 수 있게 한다.
        contact: justSaved?.phone ?? (contactSaved ? contact.trim() : null),
        sessionId: sessionIdRef.current,
      });
      if (!id) {
        hiroSay(
          "요청 저장에 실패했어요. 카카오톡 채널이나 전화 1660-4452로 직접 문의해 주시면 바로 도와드리겠습니다."
        );
        return;
      }
      setDraftSubmitted(true);
      setMessages((m) => [
        ...m,
        {
          who: "them",
          text: `통보문 작성 요청이 접수되었습니다. (접수번호: ${id.slice(
            0,
            8
          )})\n변호사 ${REVIEWING_LAWYER}가 직접 작성·검토해 ${
            justSaved?.phone || contact.trim() || "남겨주신 연락처"
          } 로 안내드리겠습니다.`,
          expression: "cheer",
        },
      ]);
    } catch (e) {
      console.error("[draft]", e);
      hiroSay(
        "요청을 보내는 중 문제가 생겼어요. 잠시 후 다시 눌러 주시거나 전화 1660-4452로 연락 부탁드려요."
      );
    } finally {
      setDraftLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setSigningIn(true);
    try {
      const u = await signInWithKakao();
      if (u) {
        setMessages((m) => [
          ...m,
          {
            who: "them",
            text: `${u.displayName ?? "의뢰인"}님 본인 확인이 완료되었습니다.\n이후 상담 내용은 변호사가 직접 확인하며, 비밀유지 의무가 적용됩니다.`,
          },
        ]);
      }
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = e?.code ?? "unknown";
      const msg = e?.message ?? String(err);
      const userClosed =
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request";
      setMessages((m) => [
        ...m,
        {
          who: "them",
          text: userClosed
            ? "본인확인 창이 닫혔습니다. 본인 확인 없이도 문의는 진행 가능합니다."
            : `본인확인이 정상적으로 진행되지 않았습니다. 변호사에게 다음 코드를 전달해 주세요.\n[${code}] ${msg}`,
        },
      ]);
      console.error("[kakao-login]", code, msg, err);
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    // 대화는 연락처 없이도 시작할 수 있다. 다만 대화 중 회신 번호를 남기면 즉시
    // 접수해, 진성 문의의 이탈·누락을 막는다.
    let preMsgs = messages;
    let nowSaved = contactSaved;
    let autoAcceptedPhone = "";
    let autoContactDeliveryFailed = false;
    if (!contactSaved) {
      const typedPhone = extractPhone(text);
      if (typedPhone) {
        // 대화에 회신 번호를 남기면 버튼 없이 그대로 접수한다.
        const formatted = typedPhone.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
        autoAcceptedPhone = formatted;
        setContact(formatted);
        const { id, notified } = await saveConsultationDetailed({
          source: "chat",
          message: "[대화창 연락처] 대화 중 회신 번호를 남겨 자동 접수했습니다.",
          userName: contactName.trim() || undefined,
          contact: formatted,
          sessionId: sessionIdRef.current,
        });
        if (!id && !notified) {
          // 접수 실패도 대화를 막지는 않는다. 안내 후 계속 상담할 수 있게 한다.
          autoContactDeliveryFailed = true;
        } else {
          setContactSaved(true);
          nowSaved = true;
          preMsgs = [
            ...messages,
            { who: "them", text: PHONE_AUTO_ACCEPTED_MSG, expression: "cheer" },
          ];
        }
      }
    }
    const userMsg: Msg = { who: "me", text };
    const nextMsgs = [...preMsgs, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setTyping(true);
    // 선택 동의를 하지 않은 대화는 브라우저 세션과 답변 생성 요청에만 사용하고,
    // Firestore·문자·중앙 접수함에는 저장하거나 전달하지 않는다.
    if (shareChat) void logChatMessage(text, "me", sessionIdRef.current);
    // 회사의 손해배상·위약금 협박 감지 → 변호사 우선 대응 플래그
    const damageThreat =
      /손해\s*배상|손배|위약금|배상\s*청구|배상하|물어내|변상|구상권/.test(text);
    // 일반 대화는 chat_messages에만 기록한다. 상담 목록에 같은 내용을 한 건씩
    // 중복 생성하지 않고, 손해배상 위협처럼 우선 확인이 필요한 경우만 별도 접수한다.
    if (shareChat && damageThreat) {
      void saveConsultation({
        source: "chat",
        message: text,
        userName: contactName.trim() || undefined,
        sessionId: sessionIdRef.current,
        damageThreat: true,
      });
    }

    // 히로 챗봇 호출 (변협 컴플라이언스 system prompt + 표정 태그 적용)
    const aiHistory = nextMsgs
      .filter((m) => m.who === "me" || m.who === "them")
      .map(
        (m) =>
          ({
            role: m.who === "me" ? "user" : "assistant",
            content: m.text,
          } as const)
      );
    const ai = await callAiChat(
      aiHistory,
      contactName.trim() || user?.displayName || null,
      nowSaved
    );

    setTyping(false);

    const reply: Msg = ai
      ? { who: "them", text: ai.text, expression: ai.expression, urgent: ai.urgent }
      : { who: "them", text: fallbackResponses[text] ?? FALLBACK_DEFAULT };

    setMessages((m) => [...m, reply]);
    if (shareChat) void logChatMessage(reply.text, "them", sessionIdRef.current);

    if (autoContactDeliveryFailed) {
      setMessages((m) => [
        ...m,
        { who: "them", text: PHONE_IN_CHAT_MSG, expression: "calm" },
      ]);
    }

    // 접수 후 대화에 새 번호가 등장하면(회신처 변경) 그대로 두면 옛 번호로 연락이 간다.
    // 별도 접수로 남겨 변호사가 최신 번호를 보게 한다. 회신 번호는 대화 전달 동의(shareChat)와
    // 무관하게 접수한다 — 대화 내용이 아니라 회신용 연락처이기 때문(2026-08-31 사용자 지시).
    const inChat = extractPhone(text) || (ai?.phoneDetected ? extractPhone(text) : "");
    const current = (autoAcceptedPhone || contact).replace(/[^0-9]/g, "");
    if (inChat && inChat !== current) {
      const formatted = inChat.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
      void saveConsultation({
        source: "chat",
        message: `[연락처 변경] 대화 중 새 번호가 언급되었습니다: ${formatted}`,
        userName: contactName.trim() || undefined,
        contact: formatted,
        sessionId: sessionIdRef.current,
      });
      hiroSay(
        `말씀해 주신 ${formatted} 번호도 함께 전달해 드렸어요. 이 번호로 연락드리면 될까요?`,
        "resolve"
      );
    }
  };

  // 히로가 대화에 안내 메시지를 넣는다 — 직전과 같은 문구면 반복하지 않는다
  const hiroSay = (text: string, expression: Expression = "calm") => {
    setMessages((m) =>
      m[m.length - 1]?.text === text ? m : [...m, { who: "them", text, expression }]
    );
  };

  // 성함 + 회신 전화번호 제출 — 이때만 변호사에게 문자 알림이 발송된다.
  // 연락처는 전화번호로 통일(카톡 ID 불가), 성함까지 받는 것이 히로의 역할(2026-08-22 사용자 확정).
  // 접수 누락 방지: DB 저장·문자 알림이 각각 독립적으로 시도되고, 둘 다 실패하면
  // 거짓 성공 대신 전화·재시도를 안내한다. 대화 자체는 계속할 수 있다.
  const submitContact = async () => {
    if (contactSaved || contactSending) return;
    const name = contactName.trim();
    if (!name) {
      hiroSay(NAME_MISSING_MSG);
      nameInputRef.current?.focus();
      return;
    }
    const digits = contact.replace(/[^0-9]/g, "");
    if (!/^01[016789][0-9]{7,8}$/.test(digits)) {
      hiroSay(PHONE_INVALID_MSG);
      contactInputRef.current?.focus();
      return;
    }
    const phone = digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
    if (!privacyAgreed) {
      hiroSay(PRIVACY_REQUIRED_MSG);
      return;
    }
    setContactSending(true);
    const { id, notified } = await saveConsultationDetailed({
      source: "chat",
      message: `[연락처 제출] 의뢰인이 성함과 회신 전화번호를 남겼습니다.${
        shareChat ? " (대화 내용 전달 동의함)" : " (대화 내용 전달 미동의)"
      }`,
      userName: name,
      contact: phone,
      sessionId: sessionIdRef.current,
    });
    setContactSending(false);
    if (!id && !notified) {
      hiroSay(
        "죄송해요, 지금 연락처 전달에 문제가 생겼어요. 잠시 후 \"연락처 남기기\"를 한 번 더 눌러 주시고, 급하시면 전화 1660-4452 또는 카카오톡 채널로 직접 연락 부탁드려요."
      );
      return;
    }
    setContact(phone);
    setContactSaved(true);
    setContactSheetOpen(false);
    setMessages((m) => [
      ...m,
      {
        who: "them",
        text: `${name}님, 연락처를 전달했습니다. 변호사 ${REVIEWING_LAWYER}가 영업일 기준으로 ${phone} 로 연락드리겠습니다.`,
        expression: "cheer",
      },
    ]);
    // 검토 요청을 하려다 연락처를 남긴 경우 — 버튼을 다시 찾게 만들지 않고 이어서 접수한다
    if (pendingDraftRef.current) {
      pendingDraftRef.current = false;
      void requestLetter({ name, phone });
    }
  };

  if (!open) return null;

  const lastExpression: Expression =
    ([...messages].reverse().find((m) => m.who === "them")?.expression as
      | Expression
      | undefined) || "base";
  const urgentNow = messages.some((m) => m.urgent);
  const hasStartedConversation = messages.some((m) => m.who === "me");

  // 가운데 모달이 아니라 지안처럼 우하단에 붙는 동행 패널 — 백드롭 없이 사이트를 계속
  // 둘러볼 수 있고, 열린 채 화면을 이동하면 히로가 대화 안에서 그 화면을 안내한다.
  return (
    <div className="modal hiro-panel" role="dialog" aria-label="히로 상담 창">
      <div className="modal-head">
          <div className="who">
            <div className="ava ava-hiro">
              <Mascot size={44} pose={POSE[lastExpression]} />
            </div>
            <div>
              <div className="name">히로</div>
              <div className="status">
                <span className="dot" />
                지금 답변 가능 · {REVIEWING_LAWYER} 변호사 검토
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="닫기">
            ×
          </button>
        </div>

        {user ? (
          <div className="auth-bar verified">
            <span className="auth-check">✓</span>
            <span className="auth-text">
              <strong>{user.displayName ?? "의뢰인"}</strong>님 본인 확인 완료
            </span>
            <button className="auth-out" onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>
        ) : (
          <div className="auth-bar">
            <span className="auth-text">
              <strong>본인 확인 시</strong> 변호사가 정확한 자문을 드릴 수 있습니다
            </span>
            <button
              className="auth-kakao"
              onClick={handleKakaoLogin}
              disabled={signingIn}
            >
              {signingIn ? "로그인 중..." : "카카오 본인확인"}
            </button>
          </div>
        )}
        {/* 대화 무대 — 연락처 시트가 이 안에서만 겹쳐 올라온다. 입력줄은 계속 쓸 수 있다. */}
        <div className="hiro-stage">
        <div className="modal-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`bubble ${m.who}`}
              style={{ whiteSpace: "pre-line" }}
            >
              {m.text}
            </div>
          ))}
          {typing && (
            <div className="bubble them" style={{ display: "flex", gap: 4 }}>
              <span className="typ" />
              <span className="typ" />
              <span className="typ" />
            </div>
          )}
          {urgentNow && (
            <div className="hiro-hotlines">
              <strong>지금 많이 힘드시다면 먼저 연락하세요</strong>
              <a href="tel:109">
                자살예방상담 <b>109</b> <em>24시간</em>
              </a>
              <a href="tel:1350">
                고용노동부 상담센터 <b>1350</b> <em>평일 9~18시</em>
              </a>
              <a href="tel:1660-4452">
                법률사무소 청송law <b>1660-4452</b> <em>변호사 상담</em>
              </a>
            </div>
          )}
        </div>
        {!contactSaved && contactSheetOpen && (
          <div className="contact-sheet" role="group" aria-label="연락처 남기기">
            <div className="contact-sheet-head">
              <strong>답변 이어받기</strong>
              <button
                className="contact-sheet-close"
                onClick={() => setContactSheetOpen(false)}
                aria-label="연락처 입력창 닫기"
              >
                ×
              </button>
            </div>
            <p className="contact-sheet-lead">
              성함과 연락처를 남기시면 변호사 {REVIEWING_LAWYER}가 직접 연락드립니다.
              남기지 않으셔도 대화는 계속하실 수 있어요.
            </p>
            <div className="chat-consent">
              <label>
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                />
                <span>
                  <strong>(필수)</strong> 상담 회신을 위해 성함·연락처를
                  수집·이용하는 데 동의합니다.{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    개인정보처리방침
                  </a>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={shareChat}
                  onChange={(e) => setShareChat(e.target.checked)}
                />
                <span>
                  <strong>(선택)</strong> 나눈 대화 내용도 변호사에게 함께
                  전달합니다.
                </span>
              </label>
              {/* 전문은 접어 둔다 — 고지 내용은 그대로 두되 폼이 5줄을 먹지 않게 */}
              <details className="chat-consent-more">
                <summary>무엇이 전달되나요?</summary>
                <p>
                  히로와 나눈 대화 내용(이후 이어지는 대화 포함)이 함께
                  전달됩니다. 변호사가 미리 읽고 연락드려{" "}
                  <strong>처음부터 다시 설명하지 않으셔도 됩니다.</strong>{" "}
                  체크하지 않으시면 성함·연락처만 전달됩니다.
                </p>
              </details>
            </div>
            <div className="chat-contact">
              <input
                type="text"
                className="chat-input chat-input-name"
                placeholder="성함"
                ref={nameInputRef}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") contactInputRef.current?.focus();
                }}
              />
              <input
                type="tel"
                className="chat-input"
                placeholder="회신받을 전화번호"
                ref={contactInputRef}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitContact();
                }}
              />
              <button
                className="btn primary"
                onClick={() => void submitContact()}
                disabled={contactSending}
              >
                {contactSending ? "전달 중..." : "연락처 남기기"}
              </button>
            </div>
          </div>
        )}
        </div>
        <div
          className={`quick-replies${hasStartedConversation ? " compact" : ""}`}
        >
          {replies.map((r) => (
            <button key={r} className="qr" onClick={() => void send(r)}>
              {r}
            </button>
          ))}
        </div>
        {contactSaved ? (
          <div className="chat-contact done">
            ✓ {contactName.trim() || "의뢰인"}님 연락처가 전달되었습니다 — 변호사가 직접 연락드립니다.
            {shareChat && (
              <span className="chat-consent-note">
                {" "}
                대화 내용도 함께 전달됩니다.
              </span>
            )}
          </div>
        ) : hasStartedConversation ? (
          /* 평소엔 한 줄 띠만 둔다 — 폼이 대화 자리를 영구히 차지하지 않게.
             시트가 열려 있을 때도 자리는 남겨 둔다 — 없애면 대화 높이가 52px 튄다. */
          <button
            className={`contact-strip${contactSheetOpen ? " is-hidden" : ""}`}
            onClick={() => setContactSheetOpen(true)}
            aria-hidden={contactSheetOpen}
            tabIndex={contactSheetOpen ? -1 : undefined}
          >
            <span className="contact-strip-text">
              <strong>연락처 남기고 답변 이어받기</strong>
              <span>변호사 {REVIEWING_LAWYER}가 직접 연락드립니다</span>
            </span>
            <span className="contact-strip-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        ) : null}
        <div className="modal-foot">
          <input
            type="text"
            className="chat-input"
            placeholder="직접 입력하기..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send(input);
            }}
          />
          <button className="btn primary" onClick={() => void send(input)}>
            보내기
          </button>
        </div>
        {showDraftButton && (
          /* 결과물을 손님에게 보여주지 않는다 — 위 requestLetter의 규정 주석 참조 */
          <div className="draft-cta">
            <p className="draft-cta-text">
              통보문이 필요하시면{" "}
              <strong>{REVIEWING_LAWYER} 변호사가 직접 작성</strong>해
              보내드립니다.
              <br />
              <span className="draft-cta-note">
                (베이직 199,000원 패키지 · 발송 전 변호사가 검토합니다)
              </span>
            </p>
            <button
              className="btn primary"
              onClick={() => void requestLetter()}
              disabled={draftLoading}
              style={{ width: "100%" }}
            >
              {draftLoading ? (
                "요청 접수 중..."
              ) : (
                <>
                  <Icon name="doc" size={16} /> 변호사에게 통보문 작성 요청
                </>
              )}
            </button>
          </div>
        )}

        <div className="modal-kakao-link">
          <a
            href="https://pf.kakao.com/_zkzIX"
            target="_blank"
            rel="noopener noreferrer"
            className="btn yellow"
            style={{ width: "100%", fontSize: 14, padding: "12px 16px" }}
          >
            <Icon name="chat" size={16} /> 카카오톡 채널에서 직접 상담
          </a>
        </div>
        <div className="chat-foot-note">
          <Icon name="lock" size={13} /> 변호사 비밀유지 의무 적용 · 자동 응답은 {REVIEWING_LAWYER} 변호사가 사후 검토 · 본 사이트는 변호사법 제23조에 따른 광고물입니다
        </div>
    </div>
  );
}
