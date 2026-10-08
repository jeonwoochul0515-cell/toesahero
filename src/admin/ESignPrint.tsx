// 전자계약 서명본 보기·인쇄 화면 — 본문·서명 그림·서명 정보·문서 확인번호를 한 장에 모아 브라우저 인쇄(PDF 저장)로 남긴다.
import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { esignAdmin, feeText, kstText, type ESignFull } from "./esignApi";

export function ESignPrint() {
  const { token = "" } = useParams();
  const [c, setC] = useState<ESignFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void esignAdmin<{ contract: ESignFull }>({ action: "get", token }).then((r) => {
      if (r.ok) setC(r.data.contract);
      else setError(r.message);
    });
  }, [token]);

  if (error || !c) {
    return (
      <div className="print-letter-page">
        <div className="print-letter">{error ?? "불러오는 중..."}</div>
      </div>
    );
  }

  const status = c.status === "signed" ? "서명 완료" : c.status === "void" ? "무효" : c.expired ? "서명 전(기한 지남)" : "서명 전";

  return (
    <div className="print-letter-page">
      <div className="print-actions no-print">
        <button className="btn primary" onClick={() => window.print()}>
          🖨 인쇄 / PDF 저장
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Ctrl+P → 대상에서 "PDF로 저장" 선택</span>
      </div>

      <article className="print-letter" style={{ fontFamily: '"Batang", "바탕", serif' }}>
        {c.status !== "signed" && (
          <p style={{ border: "2px solid #b42318", color: "#b42318", padding: 8, textAlign: "center", fontWeight: 700 }}>
            {status} — 서명본이 아닙니다
          </p>
        )}
        <h1 style={{ textAlign: "center", fontSize: 26, margin: "6px 0 24px" }}>{c.title}</h1>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.85 }}>{c.body}</div>
        <div style={{ marginTop: 18, paddingTop: 10, borderTop: "1px dashed #000", fontSize: 14, fontWeight: 700 }}>
          <div>착수금: {feeText(c.fee)}</div>
          <div>성공보수: {c.successFee || "없음"}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", margin: "26px 0 12px", fontSize: 13 }}>
          <tbody>
            <tr>
              <th style={th}>위임인(서명자)</th>
              <td style={td}>{c.signedName ?? c.clientName}</td>
              <th style={th}>생년월일</th>
              <td style={td}>{c.signedBirth ?? "—"}</td>
            </tr>
            <tr>
              <th style={th}>주소</th>
              <td style={td} colSpan={3}>{c.signedAddr ?? "—"}</td>
            </tr>
            <tr>
              <th style={th}>휴대폰</th>
              <td style={td}>{c.clientPhone}</td>
              <th style={th}>서명 시각</th>
              <td style={td}>{kstText(c.signedAt)}</td>
            </tr>
            <tr>
              <th style={th}>보낸 시각</th>
              <td style={td}>{kstText(c.createdAt)}</td>
              <th style={th}>상태</th>
              <td style={td}>{status}</td>
            </tr>
            <tr>
              <th style={th}>수임인</th>
              <td style={td} colSpan={3}>법률사무소 청송law 담당변호사 김창희 · 1660-4452</td>
            </tr>
          </tbody>
        </table>

        {c.signedImage && (
          <div style={{ textAlign: "right", fontSize: 14 }}>
            위임인 <strong>{c.signedName}</strong> (전자서명)
            <div>
              <img src={c.signedImage} alt="위임인 자필 서명" style={{ width: 240, border: "1px solid #ccc", borderRadius: 6, marginTop: 6, background: "#fff" }} />
            </div>
          </div>
        )}

        <footer className="print-letter-footer" style={{ marginTop: 24 }}>
          <div className="print-meta" style={{ maxWidth: "100%", textAlign: "left", wordBreak: "break-all" }}>
            문서 확인번호(SHA-256, 제목·본문·착수금·성공보수 기준): {c.hash}
            <br />
            서명 접속 정보: IP {c.signedIp ?? "—"} · 기기 {c.signedUa ?? "—"}
            <br />
            본 계약서는 위임인이 toesahero.com 서명 링크에서 본문을 열람한 뒤 성함·생년월일·주소를 적고 손글씨로 서명해 제출한 문서이며,
            제출 시각과 접속 정보가 서버에 기록되어 있습니다.
          </div>
        </footer>
      </article>
    </div>
  );
}

const th: CSSProperties = { border: "1px solid #000", background: "#f2f2f2", padding: "6px 8px", width: 96, fontWeight: 700, textAlign: "center" };
const td: CSSProperties = { border: "1px solid #000", padding: "6px 8px", overflowWrap: "anywhere" };
