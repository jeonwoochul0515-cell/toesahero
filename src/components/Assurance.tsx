// 상담·결제 직전 흔한 망설임을 해소하는 우려 해소 섹션
import { Icon, type IconName } from "./Icon";

type Item = {
  icon: IconName;
  q: string;
  a: string;
};

const items: Item[] = [
  {
    icon: "help",
    q: "통보한 뒤에도 회사가 계속 연락하면 어떡하죠?",
    a: "변호사 명의 통보 이후에는 사무소가 창구가 되며, 회사 측 연락도 사무소를 통한 공식 응대로 전환되는 경우가 많습니다. (사안에 따라 다르며 결과를 보장하지 않습니다.)",
  },
  {
    icon: "scale",
    q: "그만두면 손해배상 청구하겠다고 협박받았어요",
    a: "손해배상·위약금 협박 대응은 노무사·일반 업체가 할 수 없는 변호사 전속 영역입니다. 계약서와 사실관계를 변호사가 직접 검토해 대응합니다.",
  },
  {
    icon: "chat",
    q: "지금 당장 회사에 말을 못 꺼내겠어요",
    a: "카톡 문의부터 편하게 남겨주셔도 됩니다. 변호사가 먼저 상황을 듣고 방향을 잡아드리니, 마음의 준비가 될 때까지 서두르지 않으셔도 됩니다.",
  },
  {
    icon: "coins",
    q: "비용이 부담돼요, 나중에 더 커지면 어떡하죠",
    a: "상담을 통해 사안 규모에 맞는 패키지를 안내드립니다. 처음부터 변호사가 맡으면 분쟁이 커져도 같은 사무소에서 이어지므로, 중간에 다른 전문가를 새로 찾는 비용·시간이 들지 않습니다.",
  },
];

export function Assurance() {
  return (
    <section id="assurance" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="reveal" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 40px" }}>
          <span className="eyebrow">망설이고 계신가요?</span>
          <h2 className="h2">
            이런 걱정 때문에
            <br />
            <span className="mark-hl">문의를 미루고</span> 계신가요?
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            결정하기 전에 부담 갖지 마시고 편하게 먼저 물어보세요.
          </p>
        </div>

        <div className="assure-grid reveal">
          {items.map((it, i) => (
            <div key={i} className="assure-card">
              <div className="assure-icon">
                <Icon name={it.icon} size={22} strokeWidth={2.25} />
              </div>
              <h3 className="assure-q">{it.q}</h3>
              <p className="assure-a">{it.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
