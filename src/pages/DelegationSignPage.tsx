// 위임장 전자서명 페이지 — 고객이 링크로 들어와 정보 입력 + 캔버스 서명 후 제출하면 상담함으로 접수된다
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { saveConsultation } from "../firebase";
import { Icon } from "../components/Icon";

const SCOPE_ITEMS = [
  "퇴직·직장 내 괴롭힘·임금체불 등 노동 사안에 관한 의사와 요구의 통지 및 관련 서면의 작성·발송·수령",
  "회사·파견업체 등 상대방 측과의 연락 수령·회신·협의",
  "관할 고용노동청 등 행정기관에 대한 신고·진정 관련 사무",
  "임금 등 금품의 정산·청구에 관한 협의",
  "징계 등 인사 절차 대응에 관한 사무",
  "관련 서류(각종 확인서, 이직확인서, 경력증명서 등)의 요청·수령·전달",
];

export function DelegationSignPage() {
  const seo = usePageMeta({
    title: "위임장 전자서명 — 퇴사히어로",
    description: "법률사무소 청송law 위임장 전자서명 제출 페이지",
    canonical: "/delegation",
    noIndex: true,
  });

  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hasStroke, setHasStroke] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  };

  const onPointerUp = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("성명을 입력해 주세요.");
    if (!birth.trim()) return setError("생년월일을 입력해 주세요.");
    if (phone.replace(/[^0-9]/g, "").length < 9)
      return setError("연락처를 입력해 주세요.");
    if (!address.trim()) return setError("주소를 입력해 주세요.");
    if (!hasStroke) return setError("서명란에 서명해 주세요.");

    setSubmitting(true);
    try {
      const signaturePng = canvasRef.current?.toDataURL("image/png") ?? "";
      const id = await saveConsultation({
        source: "form",
        userName: name.trim(),
        contact: phone.trim(),
        message: `[전자서명] 위임장 제출 — ${name.trim()}`,
        meta: {
          docType: "delegation",
          birth: birth.trim(),
          address: address.trim(),
          signaturePng,
          signedAt: new Date().toISOString(),
          scope: SCOPE_ITEMS,
        },
      });
      if (id) setDoneId(id);
      else setError("제출에 실패했습니다. 잠시 후 다시 시도하시거나 1660-4452로 연락 주세요.");
    } catch {
      setError("제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (doneId) {
    return (
      <div className="checkout-page">
        {seo}
        <header className="calc-header">
          <Link to="/" className="my-back">← 홈으로</Link>
          <h1 className="calc-title">위임장 전자서명</h1>
        </header>
        <main className="calc-main" style={{ maxWidth: 640 }}>
          <div className="checkout-result ok">
            ✓ 위임장이 제출되었습니다. (접수번호 #{doneId.slice(0, 8)})
            <p style={{ fontSize: 14, fontWeight: 400, marginTop: 10, lineHeight: 1.6 }}>
              변호사가 확인 후 상대방에게 위임 사실을 회신합니다. 별도로 하실
              일은 없으며, 궁금하신 점은 카카오톡 채널 또는 1660-4452로 연락
              주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {seo}
      <header className="calc-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="calc-title">위임장 전자서명</h1>
      </header>

      <main className="calc-main" style={{ maxWidth: 640 }}>
        <div className="checkout-terms">
          <h3>위임장</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>
            본인(위임인)은 <strong>법률사무소 청송law 변호사 김창희</strong>(부산광역시
            연제구 법원남로15번길 10, 202호 · ☎ 1660-4452)에게, 본인의 노동
            사안(퇴직·직장 내 괴롭힘·임금 등)과 관련한 아래 사무의 처리를
            위임하였음을 확인하며, 이 건에 관한 연락은 수임인을 통하여 주실
            것을 요청합니다.
          </p>
          <ul>
            {SCOPE_ITEMS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="checkout-terms">
          <h3>위임인 정보</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input type="text" className="chat-input" placeholder="성명 (필수)"
              value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <input type="text" className="chat-input" placeholder="생년월일 예: 2000-12-02 (필수)"
              value={birth} onChange={(e) => setBirth(e.target.value)} autoComplete="bday" />
            <input type="tel" className="chat-input" placeholder="연락처 (필수)"
              value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            <input type="text" className="chat-input" placeholder="주소 (필수)"
              value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
          </div>
        </div>

        <div className="checkout-terms">
          <h3>서명</h3>
          <p style={{ fontSize: 13, color: "#666", margin: "4px 0 10px" }}>
            아래 칸에 손가락 또는 마우스로 서명해 주세요.
          </p>
          <canvas
            ref={canvasRef}
            width={600}
            height={220}
            style={{
              width: "100%",
              height: 180,
              border: "2px dashed var(--ink)",
              borderRadius: 12,
              background: "#fff",
              touchAction: "none",
              cursor: "crosshair",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          <button className="btn" style={{ marginTop: 8, fontSize: 13 }} onClick={clearCanvas}>
            <Icon name="x" size={13} /> 다시 서명
          </button>
        </div>

        {error && (
          <div className="checkout-not-ready" style={{ marginTop: 12 }}>
            <Icon name="warning" size={15} /> {error}
          </div>
        )}

        <button
          className="btn primary"
          style={{ width: "100%", fontSize: 17, padding: 16, marginTop: 16 }}
          onClick={() => void submit()}
          disabled={submitting}
        >
          {submitting ? "제출 중..." : "위임장 제출하기"}
        </button>

        <p className="calc-foot">
          제출 시각과 서명 정보가 함께 기록됩니다. 서명 정보는 위임 확인
          용도로만 사용되며, 변호사 비밀유지 의무가 적용됩니다.
        </p>
      </main>
    </div>
  );
}
