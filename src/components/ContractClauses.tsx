// 홈 "계약서 공포 조항" 섹션 — 겁주는 조항 4종의 김을 빼고, 회사 전화를 사무소가 대신 받는다는 핵심 약속으로 연결
import { Icon } from "./Icon";

type Clause = {
  quote: string;
  answer: string;
};

const CLAUSES: Clause[] = [
  {
    quote: "퇴사 30일 전에 통보하고 회사의 승인을 받아야 퇴직 처리된다",
    answer:
      "퇴직에 회사의 허락은 필요하지 않습니다. 효력을 다툴 여지가 큰 조항입니다.",
  },
  {
    quote: "지키지 않으면 무단결근으로 처리하고 잔여 급여를 지급보류할 수 있다",
    answer:
      "임금은 전액·기일 지급이 근로기준법의 원칙입니다. 일한 몫은 지급되어야 합니다.",
  },
  {
    quote: "회사에 손해를 끼치면 전적으로 근로자가 배상한다",
    answer:
      "위약금을 미리 정하는 약정은 근로기준법 제20조가 금지합니다. 실손해는 회사가 입증해야 합니다.",
  },
  {
    quote: "사직서가 수리되어야 퇴직된다",
    answer:
      "사직의 자유는 계약서 문구보다 위에 있습니다. 수리 거부가 퇴직을 막지 못합니다.",
  },
];

const PRESSURE_LINES = [
  "그만두기로 한 날짜까지는 나오셔야죠.",
  "무단결근으로 처리하겠습니다.",
  "회사 손해는 배상하셔야 할 수 있어요.",
  "일단 나와서 사직서부터 쓰세요.",
  "전화 좀 받으세요.",
];

type Props = {
  openChat: () => void;
};

export function ContractClauses({ openChat }: Props) {
  return (
    <section
      id="contract-check"
      className="wrap reveal"
      style={{ padding: "72px 0", scrollMarginTop: 80 }}
    >
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 800,
            padding: "6px 14px",
            border: "2px solid var(--ink)",
            borderRadius: 999,
            background: "var(--paper)",
          }}
        >
          <Icon name="contract" size={14} /> 근로계약서 조항 점검
        </span>
      </div>
      <h2
        style={{
          fontSize: "clamp(26px, 4.5vw, 40px)",
          fontWeight: 900,
          letterSpacing: "-.03em",
          lineHeight: 1.15,
          textAlign: "center",
          margin: "0 0 10px",
        }}
      >
        계약서에 이런 조항,
        <br />
        <span className="mark-hl">있으세요?</span>
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--muted)",
          textAlign: "center",
          maxWidth: 540,
          margin: "0 auto 32px",
          lineHeight: 1.6,
        }}
      >
        계약서의 겁주는 문구 때문에 퇴사를 미루는 분들이 많습니다. 하지만 그런
        조항의 상당수는 실제 효력을 그대로 인정받기 어렵습니다.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          maxWidth: 900,
          margin: "0 auto 14px",
        }}
      >
        {CLAUSES.map((c) => (
          <div
            key={c.quote}
            style={{
              padding: "20px 20px 18px",
              border: "2.5px solid var(--ink)",
              borderRadius: 16,
              background: "var(--paper)",
              boxShadow: "4px 4px 0 0 var(--ink)",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 14.5,
                fontWeight: 800,
                lineHeight: 1.55,
              }}
            >
              <Icon name="warning" size={15} /> &ldquo;{c.quote}&rdquo;
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--ink-2)",
              }}
            >
              <Icon name="check" size={13} /> {c.answer}
            </p>
          </div>
        ))}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--muted)",
          textAlign: "center",
          margin: "0 auto 48px",
          maxWidth: 620,
        }}
      >
        구체적 판단은 계약서 내용과 사실관계에 따라 다르며, 변호사 검토가
        필요합니다.
      </p>

      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "28px 24px",
          border: "2.5px solid var(--ink)",
          borderRadius: 20,
          background: "var(--cream)",
          boxShadow: "5px 5px 0 0 var(--ink)",
        }}
      >
        <h3
          style={{
            fontSize: 19,
            fontWeight: 900,
            textAlign: "center",
            margin: "0 0 18px",
          }}
        >
          퇴사 통보 후, 이런 전화가 두려우신가요?
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {PRESSURE_LINES.map((line, i) => (
            <div
              key={line}
              style={{
                alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
                padding: "10px 16px",
                border: "2px solid var(--ink)",
                borderRadius: 14,
                background: "var(--paper)",
                fontSize: 14,
                fontWeight: 700,
                maxWidth: "85%",
              }}
            >
              &ldquo;{line}&rdquo;
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: 17,
            fontWeight: 900,
            textAlign: "center",
            margin: "0 0 6px",
          }}
        >
          이 전화, <span className="mark-hl">사무소가 대신 받습니다.</span>
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            textAlign: "center",
            lineHeight: 1.65,
            margin: "0 0 20px",
          }}
        >
          통보문 발송으로 끝나지 않습니다. 통보 이후 회사·파견업체에서 오는
          전화·문자 대응을 사무소로 일원화해, 의뢰인이 설득과 압박에 직접
          노출되지 않도록 합니다.
        </p>
        <div style={{ textAlign: "center" }}>
          <button
            className="btn primary"
            style={{ fontSize: 16, padding: "14px 26px" }}
            onClick={openChat}
          >
            <Icon name="doc" size={16} /> 내 계약서, 변호사가 봐드립니다
          </button>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 0" }}>
            채팅으로 상황을 남기시면 계약서 확인 방법을 안내드립니다.
          </p>
        </div>
      </div>
    </section>
  );
}
