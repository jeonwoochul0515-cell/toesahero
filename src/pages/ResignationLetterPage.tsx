// 사직서 양식 3종 무료 제공 페이지 — 복사 기능 + 상담 연결 (SEO 콘텐츠)
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta, breadcrumbJsonLd } from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";

type Template = {
  id: string;
  title: string;
  desc: string;
  body: string;
};

const TEMPLATES: Template[] = [
  {
    id: "basic",
    title: "일반 사직서",
    desc: "가장 기본적인 형태. 특별한 사정 없이 통상적으로 퇴사할 때 사용합니다.",
    body: `사직서

소속 : (부서명)
직위 : (직급)
성명 : (이름)

위 본인은 개인 사정으로 인하여 [YYYY년 MM월 DD일]부로 퇴직하고자 하오니
사직을 허가하여 주시기 바랍니다.

퇴직 예정일 : [YYYY년 MM월 DD일]

[YYYY년 MM월 DD일]
성명:                    (인)

○○○ 귀중`,
  },
  {
    id: "immediate",
    title: "즉시 퇴사 요청 사직서",
    desc: "회사의 승낙을 기다리기 어려운 급한 사정일 때. 민법상 근거를 함께 명시합니다.",
    body: `사직서 (즉시 퇴직 요청)

소속 : (부서명)
직위 : (직급)
성명 : (이름)

위 본인은 부득이한 사정으로 인하여 본 사직서 제출일로부터 즉시 퇴직하고자
합니다. 「민법」 제660조에 따라 사용자의 승낙이 없더라도 통고 후 1개월이
경과하면 사직의 효력이 발생함을 알려드리며, 원만한 인수인계를 위해 최대한
협조하겠습니다.

제출일 : [YYYY년 MM월 DD일]
성명:                    (인)

○○○ 귀중`,
  },
  {
    id: "recommended",
    title: "권고사직 확인서 (겸 사직서)",
    desc: "회사가 먼저 퇴사를 권고한 경우. 이직사유를 명확히 남겨 실업급여 분쟁을 예방합니다.",
    body: `권고사직 확인서 (겸 사직서)

소속 : (부서명)
직위 : (직급)
성명 : (이름)

본인은 [YYYY년 MM월 DD일] 회사(○○○)로부터 권고사직을 제안받았으며,
이를 수용하여 [YYYY년 MM월 DD일]부로 퇴직합니다.

본 퇴직은 본인의 자발적 의사가 아니라 회사 측의 권고에 따른 것임을 명확히
하며, 이직확인서 작성 시 이직사유를 "회사의 권고에 의한 이직"으로 기재하여
줄 것을 요청합니다.

[YYYY년 MM월 DD일]
성명:                    (인)          확인(서명):

○○○ 귀중`,
  },
];

export function ResignationLetterPage() {
  const seo = usePageMeta({
    title: "사직서 양식 무료 다운로드 — 상황별 3종",
    description:
      "일반 사직서, 즉시 퇴사 요청, 권고사직 확인서까지 상황별 사직서 양식을 무료로 복사해 쓰실 수 있습니다. 권고사직인 경우 이직사유 기재가 실업급여에 직결됩니다.",
    canonical: "/resignation-letter",
    keywords: [
      "사직서양식",
      "사직서 양식",
      "사직서 양식 다운로드",
      "사직서 무료 양식",
      "권고사직서 양식",
      "권고사직",
      "퇴사대행",
      "법률사무소 청송",
    ],
    jsonLd: breadcrumbJsonLd([
      { name: "홈", url: "/" },
      { name: "사직서 양식", url: "/resignation-letter" },
    ]),
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(t.body);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId((cur) => (cur === t.id ? null : cur)), 2000);
    } catch {
      alert("복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.");
    }
  };

  return (
    <div className="page-static">
      {seo}
      <header className="page-static-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <div style={{ fontSize: 44, marginTop: 8 }}><Icon name="doc" size={40} /></div>
        <h1 className="page-static-title">사직서 양식 무료 다운로드</h1>
        <p className="page-static-sub">
          상황에 맞는 사직서를 골라 복사한 뒤 빈칸만 채우세요. 특히 회사가 권고사직을
          요청한 경우, 이직사유를 서면에 남기는 게 나중에 실업급여를 받을 수 있는지를 좌우합니다.
        </p>
      </header>

      <main className="page-static-main" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              style={{
                border: "2.5px solid var(--ink)",
                borderRadius: 14,
                background: "var(--paper)",
                boxShadow: "3px 3px 0 0 var(--ink)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "16px 20px 4px" }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>{t.title}</h2>
                <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                  {t.desc}
                </p>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "16px 20px",
                  background: "var(--cream)",
                  borderTop: "2px dashed var(--gray-2)",
                  borderBottom: "2px dashed var(--gray-2)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {t.body}
              </pre>
              <div style={{ padding: "12px 20px" }}>
                <button
                  className="btn primary"
                  style={{ width: "100%", padding: 12 }}
                  onClick={() => void copy(t)}
                >
                  <Icon name="clipboard" size={16} />{" "}
                  {copiedId === t.id ? "복사되었습니다!" : "이 양식 복사하기"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          className="calc-extra"
          style={{ marginTop: 22, borderColor: "var(--orange)" }}
        >
          <Icon name="warning" size={16} /> <strong>회사가 사직서를 안 받아주거나</strong>,
          권고사직인데 이직확인서에 "자발적 사직"으로 적으려 하거나, 손해배상 얘기가 나온다면
          — 사직서 문구만으로는 해결이 안 되는 단계입니다. 변호사가 직접 도와드립니다.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <Link to="/unemployment-calc" className="btn primary" style={{ padding: 15, textAlign: "center" }}>
            <Icon name="calc" size={16} /> 실업급여 예상액 확인하기
          </Link>
          <Link to="/calc" className="btn" style={{ padding: 15, textAlign: "center" }}>
            <Icon name="calc" size={16} /> 퇴직금·연차수당 계산기
          </Link>
          <a
            href="https://pf.kakao.com/_zkzIX"
            target="_blank"
            rel="noopener noreferrer"
            className="btn yellow"
            style={{ padding: 15, textAlign: "center" }}
          >
            <Icon name="chat" size={16} /> 카톡으로 상담하기
          </a>
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20, lineHeight: 1.6 }}>
          본 페이지는 일반적 법률 정보 제공이며 법률 자문이 아닙니다. 개별 사안은 상담을 통해
          확인이 필요합니다. 본 사이트는 변호사법 제23조에 따른 광고물입니다.
        </p>
      </main>
    </div>
  );
}
