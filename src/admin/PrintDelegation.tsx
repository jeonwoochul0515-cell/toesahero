// 전자서명 위임장 인쇄 화면 — 고객 제출 데이터(서명 이미지 포함)를 완성 위임장으로 렌더링해 인쇄/PDF 저장
import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { watchConsultations, type ConsultationDoc } from "../firebase";

type DelegationMeta = {
  docType?: string;
  birth?: string;
  address?: string;
  signaturePng?: string;
  signedAt?: string;
  scope?: string[];
};

export function PrintDelegation() {
  const { id } = useParams();
  const [row, setRow] = useState<ConsultationDoc | null>(null);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  useEffect(() => {
    return watchConsultations((rows) => {
      setRow(rows.find((r) => r.id === id) ?? null);
    }, 500);
  }, [id]);

  const meta = (row?.meta ?? {}) as DelegationMeta;
  const ready = meta.docType === "delegation" && !!meta.signaturePng;

  useEffect(() => {
    if (ready && !hasAutoPrinted) {
      const t = window.setTimeout(() => {
        window.print();
        setHasAutoPrinted(true);
      }, 800);
      return () => window.clearTimeout(t);
    }
  }, [ready, hasAutoPrinted]);

  if (!row) {
    return (
      <div className="print-letter-page">
        <div className="print-letter">로드 중...</div>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="print-letter-page">
        <div className="print-letter">
          <p style={{ color: "var(--muted)" }}>
            이 상담 건에는 전자서명 위임장이 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const signedDate = meta.signedAt ? new Date(meta.signedAt) : null;
  const dateStr = signedDate
    ? `${signedDate.getFullYear()}년 ${signedDate.getMonth() + 1}월 ${signedDate.getDate()}일`
    : "";
  const scope = meta.scope ?? [];

  return (
    <div className="print-letter-page">
      <div className="print-actions no-print">
        <button className="btn primary" onClick={() => window.print()}>
          🖨 인쇄 / PDF 저장
        </button>
        <button className="btn" onClick={() => window.close()}>
          닫기
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Ctrl+P → 대상에서 "PDF로 저장" 선택
        </span>
      </div>

      <article className="print-letter" style={{ fontFamily: '"Batang", "바탕", serif' }}>
        <h1
          style={{
            textAlign: "center",
            fontSize: 30,
            letterSpacing: 24,
            textIndent: 24,
            margin: "10px 0 34px",
          }}
        >
          위임장
        </h1>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 22, fontSize: 14 }}>
          <tbody>
            <tr>
              <th style={th}>위임인</th>
              <td style={td}>{row.userName ?? "—"}</td>
              <th style={th}>생년월일</th>
              <td style={td}>{meta.birth ?? "—"}</td>
            </tr>
            <tr>
              <th style={th}>연락처</th>
              <td style={td}>{row.contact ?? "—"}</td>
              <th style={th}>제출일시</th>
              <td style={td}>
                {meta.signedAt ? new Date(meta.signedAt).toLocaleString("ko-KR", { hour12: false }) : "—"}
              </td>
            </tr>
            <tr>
              <th style={th}>주소</th>
              <td style={td} colSpan={3}>{meta.address ?? "—"}</td>
            </tr>
            <tr>
              <th style={th}>수임인</th>
              <td style={td} colSpan={3}>
                법률사무소 청송law 변호사 김창희 — 부산광역시 연제구 법원남로15번길 10, 202호 (☎ 1660-4452)
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: 14.5, lineHeight: 1.9, margin: "0 0 8px" }}>
          위임인은 위임인의 노동 사안과 관련한 다음 각 사무 일체의 처리를
          수임인에게 위임하였음을 확인하며, 이 건에 관한 연락은 수임인을 통하여
          주실 것을 요청합니다.
        </p>
        <ol style={{ fontSize: 14, lineHeight: 1.9, margin: "0 0 24px", paddingLeft: 26 }}>
          {scope.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        <p style={{ textAlign: "center", fontSize: 15, margin: "30px 0 20px" }}>{dateStr}</p>

        <div style={{ textAlign: "right", fontSize: 15, lineHeight: 2 }}>
          위임인&nbsp;&nbsp;<strong>{row.userName}</strong>&nbsp;&nbsp;(전자서명)
          <div>
            <img
              src={meta.signaturePng}
              alt="위임인 전자서명"
              style={{
                width: 220,
                border: "1px solid #ccc",
                borderRadius: 6,
                marginTop: 6,
                background: "#fff",
              }}
            />
          </div>
        </div>

        <footer className="print-letter-footer" style={{ marginTop: 30 }}>
          <div className="print-meta">
            본 위임장은 위임인이 퇴사히어로(toesahero.com/delegation)에서 전자적
            방식으로 작성·서명하여 제출한 문서이며, 제출 시각이 시스템에
            기록되어 있습니다.
          </div>
        </footer>
      </article>
    </div>
  );
}

const th: CSSProperties = {
  border: "1px solid #000",
  background: "#f2f2f2",
  padding: "7px 10px",
  width: 86,
  fontWeight: 700,
  textAlign: "center",
};
const td: CSSProperties = {
  border: "1px solid #000",
  padding: "7px 10px",
};
