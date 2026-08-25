// 히로의 화면별 안내말(pageIntro)과 첫인사(greetingFor) — 능동성 원칙의 대본 모음.
// 우선순위: 화면 안내 > 재방문 인사 > 유입 경로 > 시간대. 같은 상황에도 문장 변형 중 무작위.
import type { Entry } from "./entry";

export const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/** 화면별 안내말 — 하위 메뉴에 들어오면 히로가 그 화면이 무엇인지 설명한다. null이면 안내하지 않는 화면. */
export function pageIntro(path: string): string | null {
  if (path.startsWith("/calc"))
    return "여기는 월급이랑 근속기간만 넣으면 퇴직금·연차수당·미지급 임금이 자동으로 계산되는 화면이에요. 결과가 나오면 실제로 청구할 수 있는 항목인지 저랑 같이 정리해 봐요.";
  if (path.startsWith("/unemployment-calc"))
    return "월급·나이·고용보험 가입기간만 넣으면 실업급여 예상액이 나오는 계산기예요. 권고사직인지 자발적 퇴사인지에 따라 받을 수 있는지가 갈리니까, 애매하면 저한테 물어보세요.";
  if (path.startsWith("/resignation-letter"))
    return "상황별 사직서 양식 3종을 무료로 받아 가실 수 있는 화면이에요. 일반·즉시 퇴사·권고사직 확인서 중 뭘 써야 할지 헷갈리면 상황을 말씀해 주세요. 특히 권고사직은 이직사유 한 줄이 실업급여를 좌우해요.";
  if (path.startsWith("/diagnose"))
    return "몇 가지 질문에 답하면 통보·임금청구·분쟁대응 중 내 상황에 맞는 절차를 찾아 주는 셀프 진단이에요. 결과가 나오면 다음 걸음을 같이 정해 봐요.";
  if (path.startsWith("/harassment"))
    return "직장 내 괴롭힘 대응 안내 화면이에요. 신고부터 민사·형사 대응까지 변호사님이 대신 다투는 절차를 소개하고 있어요. 지금 겪고 계신 일을 말씀해 주시면 뭐가 중요한지 같이 정리해 드릴게요.";
  if (path.startsWith("/small-business"))
    return "5인 미만 사업장은 근로기준법이 일부만 적용돼서 권리 판단이 유난히 까다로워요. 우리 회사에 뭐가 적용되는지부터 같이 확인해 볼까요?";
  if (path.startsWith("/unfair-dismissal"))
    return "해고 통보를 받으셨나요? 서면으로 받았는지 말로만 들었는지, 날짜가 언제인지가 아주 중요해요. 구제신청은 해고일부터 3개월 안에 해야 하니, 상황을 먼저 말씀해 주세요.";
  if (path.startsWith("/unpaid-wages"))
    return "밀린 월급·수당 문제라면 잘 오셨어요. 언제부터 얼마가 밀렸는지, 급여명세서나 통장기록이 있는지 말씀해 주시면 어떤 절차로 받을 수 있는지 정리해 드릴게요.";
  if (path.startsWith("/severance-pay"))
    return "1년 이상 일했다면 퇴직금은 당연한 권리예요. 5인 미만 사업장도, 알바도 예외가 아니에요. 회사가 뭐라고 하던가요?";
  if (path.startsWith("/foreign-workers"))
    return "This page explains our lawyer-run resignation service for foreign workers in Korea. Feel free to tell me your situation in English — I'll help you sort it out.";
  if (path.startsWith("/blog"))
    return "김창희 변호사님이 직접 쓰신 노동법 칼럼이에요. 읽다가 \"이거 내 얘기 같은데\" 싶으면 언제든 말 걸어 주세요. 지금 상황에 뭐가 필요한지 같이 찾아드릴게요.";
  if (path.startsWith("/faq"))
    return "퇴사대행에서 자주 묻는 질문 15가지를 모아 둔 화면이에요. 계약서 조항, 회사 연락 대응 범위, 변호사와 노무사의 차이까지 있어요. 여기 없는 궁금증은 저한테 바로 물어보셔도 돼요.";
  if (path.startsWith("/checkout"))
    return "결제 화면이에요. 어떤 패키지가 내 상황에 맞는지 확신이 안 서면, 결제 전에 저한테 상황을 말씀해 주세요. 필요 이상으로 큰 패키지를 권하지 않아요.";
  if (path.startsWith("/my"))
    return "카카오 본인 확인을 하시면 신청하신 사건의 진행 상황을 보실 수 있는 화면이에요. 궁금한 게 있으면 저한테 물어보셔도 돼요.";
  return null;
}

/** 홈(긴 한 페이지) 섹션별 안내말 — 스크롤로 섹션에 들어오면 히로가 먼저 말을 건다.
 *  라우트가 안 바뀌는 홈에서도 지안·독고실장처럼 능동적으로 움직이게 하는 장치(2026-08-22). */
export function sectionIntro(id: string): string | null {
  switch (id) {
    case "labor":
      return "직장 내 괴롭힘, 부당해고, 임금체불 — 전부 변호사님이 당신 대신 다투는 사안들이에요. 혹시 지금 겪고 계신 일이 이 중에 있나요?";
    case "contract-check":
      return "계약서의 무서운 조항들 보고 계시죠. 30일 통보, 손해배상, 지급보류 — 겁주는 것만큼 전부 효력이 있는 건 아니에요. 어떤 조항이 걸리세요?";
    case "calc":
      return "여기서 월급이랑 근속기간만 넣으면 퇴직금·연차수당·미지급 임금이 바로 계산돼요. 결과가 나오면 저한테 보여주시면 같이 정리해 드릴게요.";
    case "process":
      return "위임부터 종결까지 어떻게 진행되는지 보여드리는 부분이에요. 궁금한 단계가 있으면 콕 집어 물어보세요.";
    case "lawyer":
      return "퇴사히어로의 모든 절차는 법률사무소 청송 김창희 변호사님이 직접 처리하고 검토해요. 상황을 말씀해 주시면 상담으로 바로 이어드릴게요.";
    case "pricing":
      return "패키지는 단순 통보 19만9천원, 임금 청구 통합 39만원, 분쟁 대응 79만원 — 세 가지예요. 내 상황에 뭐가 맞는지 헷갈리면 제가 골라드릴게요.";
    default:
      return null;
  }
}

/** 첫마디 — 화면 안내 > 재방문 > 유입 경로 > 시간대 순. 매번 같은 문장이 안 나오게 변형 중 무작위. */
export function greetingFor(path: string, entry: Entry, revisit: boolean): string {
  // 특정 화면에 바로 들어왔다면 그 화면 설명이 우선 — 재방문이면 인사만 짧게 얹는다
  const intro = pageIntro(path);
  if (intro && path !== "/") return revisit ? pick(["또 뵙네요. ", "다시 와 주셨네요. "]) + intro : intro;
  // 이미 대화한 적 있는 분 — 처음 온 사람 인사를 반복하지 않는다
  if (revisit)
    return pick([
      "다시 와 주셨네요. 지난 이야기 이어서 하셔도 되고, 그 사이에 회사에서 새로 생긴 일이 있으면 그것부터 말씀해 주세요.",
      "또 뵙네요. 그 뒤로 회사 상황은 좀 어땠어요? 변한 게 있으면 알려 주세요.",
    ]);
  // 유입 경로별 — 어떤 길로 왔는지에 맞춰 첫마디를 시작한다
  if (entry.kind === "ad" && entry.query)
    return pick([
      `"${entry.query}" 찾아보고 계셨죠. 딱 그 얘기, 여기서 하시면 돼요. 지금 회사에서 어떤 일이 있으세요?`,
      `"${entry.query}" 검색해서 와 주셨네요. 혼자 검색할 만큼 답답하셨을 것 같아요. 상황을 말씀해 주시면 뭐가 중요한지 같이 정리해 드릴게요.`,
    ]);
  if (entry.kind === "ad" || entry.kind === "search")
    return pick([
      `${entry.via ? entry.via + "에서 " : ""}검색하다 찾아와 주셨죠. 퇴사 문제는 혼자 검색으로 정리하기 어려워요. 무슨 일이 있었는지 편하게 말씀해 주세요.`,
      "검색해서 여기까지 오셨다는 건 회사 일로 마음에 걸리는 게 있다는 거잖아요. 어떤 상황인지 말씀해 주시면 같이 정리해 드릴게요.",
    ]);
  if (entry.kind === "blog")
    return "블로그 글 보고 와 주셨네요. 글이 다 담지 못한 내 상황은 여기서 물어보시면 돼요. 어떤 부분이 걸리셨어요?";
  if (entry.kind === "sns")
    return `${entry.via || "SNS"}에서 보고 와 주셨네요. 남 얘기 같지 않아서 눌러보셨을 것 같아요. 지금 회사에서 어떤 일이 있으세요?`;
  if (entry.kind === "kakao")
    return "카카오톡에서 넘어와 주셨네요. 상담 전에 상황을 미리 정리해 두면 변호사님과의 얘기가 훨씬 빨라져요. 무슨 일이 있었어요?";
  // 시간대 — "늦은 시간" 인사는 진짜 늦은 시간에만 (낮에 쓰면 틀린 말이 된다)
  const h = new Date().getHours();
  if (h >= 22 || h < 5)
    return pick([
      "늦은 시간까지 퇴사 고민으로 잠이 안 오시는 거죠. 지금은 저랑 먼저 정리해요. 적어 두면 아침에 변호사님이 바로 이어받아요.",
      "이 시간까지 혼자 찾아보고 계셨죠. 무슨 일인지 저한테 먼저 말해 보세요. 정리만 해 둬도 마음이 한결 가벼워져요.",
    ]);
  if (h < 9)
    return "출근 전부터 마음이 무거우셨나 봐요. 무슨 일이 있었는지 말씀해 주시면 오늘 뭘 하면 좋을지 같이 정리해 드릴게요.";
  return pick([
    "혼자 고민하고 계셨죠? 회사 일, 무슨 일이 있었는지 편하게 말씀해 주세요. 뭐가 중요한지 같이 정리해 드릴게요.",
    "어서 오세요. 여기는 퇴사 통보부터 임금·퇴직금 청구, 괴롭힘·부당해고 대응까지 변호사님이 직접 처리하는 곳이에요. 어떤 일로 오셨어요?",
  ]);
}
