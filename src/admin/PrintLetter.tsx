import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { watchConsultations, type ConsultationDoc } from "../firebase";

export function PrintLetter() {
  const { id } = useParams();
  const [row, setRow] = useState<ConsultationDoc | null>(null);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  useEffect(() => {
    return watchConsultations((rows) => {
      setRow(rows.find((r) => r.id === id) ?? null);
    }, 500);
  }, [id]);

  // 페이지 로드 + 데이터 도착 후 자동 인쇄 다이얼로그 1회
  useEffect(() => {
    if (row?.draftLetter && !hasAutoPrinted) {
      const t = window.setTimeout(() => {
        window.print();
        setHasAutoPrinted(true);
      }, 800);
      return () => window.clearTimeout(t);
    }
  }, [row?.draftLetter, hasAutoPrinted]);

  if (!row) {
    return (
      <div className="print-letter-page">
        <div className="print-letter">로드 중...</div>
      </div>
    );
  }

  if (!row.draftLetter) {
    return (
      <div className="print-letter-page">
        <div className="print-letter">
          <p style={{ color: "var(--muted)" }}>
            통보문 초안이 아직 생성되지 않았습니다.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${
    today.getMonth() + 1
  }월 ${today.getDate()}일`;

  // [작성일] [YYYY년 MM월 DD일] 자동 채움
  const filled = row.draftLetter.replace(
    /\[작성일\]\s*\[YYYY년 MM월 DD일\]/g,
    `[작성일] ${dateStr}`
  );

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

      <article className="print-letter">
        <header className="print-letter-header">
          <div className="print-firm-name">법률사무소 청송</div>
          <div className="print-firm-sub">
            대표 변호사 김창희 · 부산광역시 연제구 법원남로15번길 10, 202호
            <br />
            ☎ 1660-4452 · lawchungsong@daum.net
          </div>
        </header>

        <hr className="print-hr" />

        <pre className="print-body">{filled}</pre>

        <footer className="print-letter-footer">
          <div className="print-stamp">
            <div className="print-stamp-circle">청송</div>
            <span className="print-stamp-label">변호사 직인</span>
          </div>
          <div className="print-meta">
            본 통보문은 「변호사법」 제3조에 따른 변호사 직무 행위입니다.
            <br />
            본 사이트는 「변호사법」 제23조에 따른 광고물입니다.
          </div>
        </footer>
      </article>
    </div>
  );
}
