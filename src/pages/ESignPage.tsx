// 위임계약서 전자서명 페이지(/sign/<토큰>) — 손님이 로그인 없이 본문을 끝까지 읽고 성함·생년월일·주소·손글씨 서명으로 동의한다.
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { Icon } from "../components/Icon";

type PublicContract = {
  title: string;
  body: string;
  fee: number;
  successFee: string;
  hash: string;
  clientName: string;
  status: "sent" | "signed" | "void";
  expired: boolean;
  expiresAt: string;
  signedAt: string | null;
  signedName: string | null;
  signedBirth: string | null;
  signedAddr: string | null;
  signedImage: string | null;
  detailHidden: boolean;
};

const OFFICE = "법률사무소 청송law 담당변호사 김창희";
const PHONE = "1660-4452";

function kst(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) : "—";
}

function feeText(fee: number): string {
  return fee > 0 ? `${fee.toLocaleString("ko-KR")}원` : "없음 (0원)";
}

export function ESignPage() {
  const { token = "" } = useParams();
  const seo = usePageMeta({
    title: "위임계약서 전자서명",
    description: "법률사무소 청송law 위임계약서 전자서명",
    canonical: "/sign",
    noIndex: true,
  });

  const [contract, setContract] = useState<PublicContract | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const resp = await fetch("/api/esign/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; contract?: PublicContract; message?: string };
      if (!resp.ok || !data.ok || !data.contract) {
        setLoadError(data.message ?? "계약서를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.");
        return;
      }
      setContract(data.contract);
    } catch {
      setLoadError("연결이 끊겼습니다. 잠시 후 다시 열어 주세요.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="checkout-page esign-page">
      {seo}
      <header className="calc-header">
        <h1 className="calc-title">위임계약서 전자서명</h1>
        <p className="esign-office">{OFFICE}</p>
      </header>
      <main className="calc-main" style={{ maxWidth: 680 }}>
        {loadError && !contract && (
          <div className="checkout-not-ready">
            <Icon name="warning" size={15} /> {loadError}
            <p style={{ marginTop: 8 }}>
              문의: <a href={`tel:${PHONE.replace(/-/g, "")}`}>{PHONE}</a>
            </p>
          </div>
        )}
        {!contract && !loadError && <p className="calc-foot">계약서를 불러오는 중입니다…</p>}
        {contract && contract.status === "signed" && <SignedView c={contract} justSigned={justSigned} />}
        {contract && contract.status === "sent" && contract.expired && (
          <div className="checkout-not-ready">
            <Icon name="warning" size={15} /> 서명 기한이 지났습니다. 사무실로 연락하시면 다시 보내 드립니다.{" "}
            <a href={`tel:${PHONE.replace(/-/g, "")}`}>{PHONE}</a>
          </div>
        )}
        {contract && contract.status === "sent" && !contract.expired && (
          <SignForm
            c={contract}
            token={token}
            onSigned={(signed) => {
              // 저장은 끝났다 — 다시 불러오기가 실패해도 입력 화면으로 돌아가지 않게 먼저 완료 상태로 바꾼다
              setContract((prev) => (prev ? { ...prev, ...signed, status: "signed" } : prev));
              setJustSigned(true);
              window.scrollTo(0, 0); // 완료 안내가 맨 위에 있어 바로 보이게
              void load();
            }}
          />
        )}
      </main>
    </div>
  );
}

function ContractBody({ c, onReadEnd }: { c: PublicContract; onReadEnd?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const check = useCallback(() => {
    const el = boxRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 12) onReadEnd?.();
  }, [onReadEnd]);
  // 본문이 짧아 스크롤이 없으면 바로 다 읽은 것으로 본다
  useEffect(() => check(), [check]);

  return (
    <div className="checkout-terms">
      <h3>{c.title}</h3>
      <div ref={boxRef} className="esign-body" onScroll={check} tabIndex={0} aria-label="계약서 본문">
        {c.body}
        <div className="esign-terms-box">
          <div>착수금: {feeText(c.fee)}</div>
          <div>성공보수: {c.successFee || "없음"}</div>
        </div>
      </div>
      <p className="esign-hash">
        문서 확인번호(SHA-256): <code>{c.hash}</code>
      </p>
    </div>
  );
}

function SignedView({ c, justSigned }: { c: PublicContract; justSigned: boolean }) {
  return (
    <>
      <div className="checkout-result ok">
        ✓ {justSigned ? "서명이 끝났습니다." : "서명이 끝난 계약서입니다."}
        <p style={{ fontSize: 14, fontWeight: 400, marginTop: 10, lineHeight: 1.6 }}>
          서명본은 사무실이 보관하고, 원하시면 이 주소에서 다시 보실 수 있습니다.
          {c.fee > 0 && " 착수금 결제는 사무실이 따로 안내드립니다."} 궁금하신 점은{" "}
          <a href={`tel:${PHONE.replace(/-/g, "")}`}>{PHONE}</a>로 연락 주세요.
        </p>
      </div>
      <ContractBody c={c} />
      <div className="checkout-terms">
        <h3>서명 정보</h3>
        <dl className="esign-dl">
          <dt>성함</dt>
          <dd>{c.signedName ?? "—"}</dd>
          <dt>서명 시각</dt>
          <dd>{kst(c.signedAt)}</dd>
          {!c.detailHidden && (
            <>
              <dt>생년월일</dt>
              <dd>{c.signedBirth ?? "—"}</dd>
              <dt>주소</dt>
              <dd>{c.signedAddr ?? "—"}</dd>
            </>
          )}
        </dl>
        {c.detailHidden ? (
          <p className="calc-foot">서명한 지 90일이 지나 생년월일·주소·서명 그림은 가렸습니다. 필요하시면 사무실로 연락 주세요.</p>
        ) : (
          c.signedImage && <img src={c.signedImage} alt="자필 서명" className="esign-sig-img" />
        )}
      </div>
    </>
  );
}

type SignedPart = Pick<PublicContract, "signedAt" | "signedName" | "signedBirth" | "signedAddr" | "signedImage">;

function SignForm({ c, token, onSigned }: { c: PublicContract; token: string; onSigned: (s: SignedPart) => void }) {
  const [readEnd, setReadEnd] = useState(false);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [addr, setAddr] = useState("");
  const [agree, setAgree] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!readEnd) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  };
  const up = () => {
    drawingRef.current = false;
  };
  const clear = () => {
    const cv = canvasRef.current;
    cv?.getContext("2d")?.clearRect(0, 0, cv.width, cv.height);
    setHasStroke(false);
  };

  const nameOk = name.replace(/\s/g, "") === c.clientName.replace(/\s/g, "");

  const submit = async () => {
    setError(null);
    if (!readEnd) return setError("계약서를 끝까지 읽어 주세요.");
    if (!nameOk) return setError(`계약서에 적힌 성함(${c.clientName})과 같게 적어 주세요.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return setError("생년월일을 선택해 주세요.");
    if (addr.trim().length < 5) return setError("주소를 적어 주세요.");
    if (!hasStroke) return setError("서명 칸에 서명해 주세요.");
    if (!agree) return setError("동의 칸에 체크해 주세요.");
    setSubmitting(true);
    const image = canvasRef.current?.toDataURL("image/png") ?? "";
    try {
      const resp = await fetch("/api/esign/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), birth, addr: addr.trim(), image, agree, hash: c.hash }),
      });
      const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; message?: string; signedAt?: string };
      if (!resp.ok || !data.ok) {
        setError(data.message ?? `제출하지 못했습니다. 잠시 후 다시 시도하시거나 ${PHONE}로 연락 주세요.`);
        return;
      }
      onSigned({
        signedAt: data.signedAt ?? new Date().toISOString(),
        signedName: name.trim(),
        signedBirth: birth,
        signedAddr: addr.trim(),
        signedImage: image,
      });
    } catch {
      setError("연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <p className="esign-lead">
        {c.clientName}님, 아래 계약서를 끝까지 읽으신 뒤 서명해 주세요. 서명 기한은 {kst(c.expiresAt)}까지입니다.
      </p>
      <ContractBody c={c} onReadEnd={() => setReadEnd(true)} />
      {!readEnd && <p className="esign-hint">↓ 계약서를 끝까지 내려 읽으면 서명 칸이 열립니다.</p>}

      <fieldset className="checkout-terms esign-fields" disabled={!readEnd}>
        <h3>서명하시는 분</h3>
        <label className="esign-label">
          성함 (계약서와 같게)
          <input type="text" className="chat-input" value={name} maxLength={40}
            onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={c.clientName} />
        </label>
        {name && !nameOk && <p className="esign-warn">계약서에 적힌 성함은 {c.clientName}입니다.</p>}
        <label className="esign-label">
          생년월일
          <input type="date" className="chat-input" value={birth} max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01" onChange={(e) => setBirth(e.target.value)} autoComplete="bday" />
        </label>
        <label className="esign-label">
          주소
          <input type="text" className="chat-input" value={addr} maxLength={200}
            onChange={(e) => setAddr(e.target.value)} autoComplete="street-address" placeholder="예) 부산광역시 연제구 ○○로 00, 000호" />
        </label>

        <h3 style={{ marginTop: 18 }}>서명</h3>
        <p className="esign-hint">아래 칸에 손가락으로 서명해 주세요.</p>
        <canvas
          ref={canvasRef}
          width={600}
          height={220}
          className="esign-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
        <button type="button" className="btn" style={{ marginTop: 8, fontSize: 13 }} onClick={clear}>
          <Icon name="x" size={13} /> 지우고 다시 서명
        </button>

        <label className="esign-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          위 계약서 내용을 끝까지 읽었고, 이에 동의하여 서명합니다.
        </label>
      </fieldset>

      {error && (
        <div className="checkout-not-ready" style={{ marginTop: 12 }}>
          <Icon name="warning" size={15} /> {error}
        </div>
      )}

      <button
        className="btn primary"
        style={{ width: "100%", fontSize: 17, padding: 16, marginTop: 16 }}
        onClick={() => void submit()}
        disabled={submitting || !readEnd}
      >
        {submitting ? "제출 중..." : "서명 제출하기"}
      </button>
      <p className="calc-foot">
        제출하면 서명 시각·접속 정보(IP·기기)가 함께 기록됩니다. 서명 정보는 위임계약 확인에만 쓰이며 변호사 비밀유지 의무가
        적용됩니다. 문의 <a href={`tel:${PHONE.replace(/-/g, "")}`}>{PHONE}</a>
      </p>
    </>
  );
}
