import { Icon, type IconName } from "./Icon";

type AudCase = {
  tag: string;
  icon: IconName;
  title: string;
  body: string;
};

const cases: AudCase[] = [
  {
    tag: "부당해고",
    icon: "gavel",
    title: "어느 날 갑자기\n나오지 말래요",
    // TODO(변호사 확인): 5인 미만 단서(개선 지시서 4-7)
    body: "서면 통지 없는 해고는 다퉈볼 수 있습니다(상시 5인 이상 사업장). 복직·해고기간 임금까지 변호사가 대신 다툽니다.",
  },
  {
    tag: "임금체불",
    icon: "receipt",
    title: "월급이 몇 달째\n밀리고 있어요",
    body: "지연이자 연 20%까지 붙여 변호사 명의로 청구합니다.",
  },
  {
    tag: "퇴직금",
    icon: "coins",
    title: "받아야 할 돈\n못 받고 나갈까봐",
    body: "퇴직금·연차·야근수당, 변호사가 대신 계산하고 대신 청구합니다.",
  },
  {
    tag: "괴롭힘",
    icon: "siren",
    title: "직장 내 괴롭힘\n증거 정리 중",
    body: "신고 절차부터 산재 신청까지, 회사와 말 섞지 않고 진행합니다.",
  },
  {
    tag: "대면부담",
    icon: "monday",
    title: "사장 얼굴 보면\n말이 안 나옴",
    body: "통보·협상·다툼 전부 변호사가 대신합니다. 직접 대화는 없습니다.",
  },
  {
    tag: "갑질",
    icon: "ghost",
    title: "말 꺼내자마자\n사장이 잠수",
    body: "변호사가 법률사무소 명의로 직접 통보합니다.",
  },
  {
    tag: "손배협박",
    icon: "twoface",
    title: "회사가 손해배상\n물어내라고 협박",
    body: "위축되실 필요 없습니다. 손배·위약금 대응은 변호사 전속 영역입니다.",
  },
  {
    tag: "노무사한계",
    icon: "scale",
    title: "노무사가 안 된다고 함\n그럼 어떻게 하지?",
    body: "고소·민사·형사는 변호사 전속 사무 (변호사법 §109).",
  },
  {
    tag: "계약위반",
    icon: "contract",
    title: "근로계약서와\n실제가 다름",
    body: "근로기준법 위반 여부, 변호사가 검토하고 대신 따집니다.",
  },
];

export function Audience() {
  return (
    <section id="audience" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal">
          <span className="eyebrow">혹시 지금 이런 마음인가요</span>
          <h2 className="h2">
            이런 <span className="mark-hl">상황</span>이라면
            <br />
            혼자 삭이지 마세요
          </h2>
          <p className="lead">하나라도 마음에 걸린다면, 편하게 카톡으로 이야기부터 꺼내보세요. 변호사가 먼저 듣겠습니다.</p>
        </div>
        <div className="aud-grid reveal">
          {cases.map((c, i) => (
            <div key={i} className="aud-card">
              <div className="aud-tag">#{c.tag}</div>
              <div className="aud-emoji">
                <Icon name={c.icon} size={40} strokeWidth={2.25} />
              </div>
              <h3 className="aud-title">{c.title}</h3>
              <p className="aud-body">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
