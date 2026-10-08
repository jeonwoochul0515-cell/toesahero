// 관리자 전자계약 화면 — 위임계약서를 만들어 서명 링크를 받고, 보낸 계약서의 상태·서명본·무효 처리를 본다.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { esignAdmin, feeText, kstText, type ESignRow } from "./esignApi";

function statusLabel(r: ESignRow): string {
  if (r.status === "signed") return "서명함";
  if (r.status === "void") return "무효";
  return r.expired ? "보냄(기한 지남)" : "보냄";
}

export function ESignAdmin() {
  const [rows, setRows] = useState<ESignRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [title, setTitle] = useState("위임계약서");
  const [body, setBody] = useState("");
  const [fee, setFee] = useState("0");
  const [successFee, setSuccessFee] = useState("");
  const [created, setCreated] = useState<{ link: string; token: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await esignAdmin<{ contracts: ESignRow[] }>({ action: "list" });
    if (r.ok) {
      setRows(r.data.contracts);
      setListError(null);
    } else setListError(r.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setFormError(null);
    setCreated(null);
    const feeNum = Number(fee.replace(/[^0-9]/g, "") || "0");
    if (!confirm(`${clientName} 님 계약서를 만듭니다. 만든 뒤에는 고칠 수 없고, 바꾸려면 무효로 돌린 뒤 새로 만들어야 합니다.`)) return;
    setBusy(true);
    const r = await esignAdmin<{ link: string; token: string }>({
      action: "create",
      clientName,
      clientPhone,
      title,
      body,
      fee: feeNum,
      successFee,
    });
    setBusy(false);
    if (!r.ok) return setFormError(r.message);
    setCreated({ link: r.data.link, token: r.data.token });
    setBody("");
    void load();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("링크를 복사했습니다.");
    } catch {
      setNotice("복사하지 못했습니다. 링크를 길게 눌러 직접 복사해 주세요.");
    }
  };

  const sendSms = async (r: Pick<ESignRow, "token" | "clientName" | "clientPhone">) => {
    if (!confirm(`${r.clientName} 님(${r.clientPhone})에게 서명 요청 문자를 보냅니다. 문자 요금이 나갑니다.`)) return;
    setBusy(true);
    const res = await esignAdmin({ action: "sms", token: r.token });
    setBusy(false);
    setNotice(res.ok ? "문자를 보냈습니다." : res.message);
    void load();
  };

  const voidIt = async (r: ESignRow) => {
    if (!confirm(`${r.clientName} 님 계약서를 무효로 돌립니다. 링크로 더는 서명할 수 없습니다.`)) return;
    setBusy(true);
    const res = await esignAdmin({ action: "void", token: r.token });
    setBusy(false);
    setNotice(res.ok ? "무효로 돌렸습니다." : res.message);
    void load();
  };

  return (
    <div className="admin-dash">
      <h2>전자계약 (위임계약서 서명)</h2>

      <section style={{ padding: 16, marginBottom: 20, border: "2px solid var(--ink)", borderRadius: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>새 계약서 만들기</h3>
        <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
          <label>
            의뢰인 성함
            <input className="admin-input" value={clientName} maxLength={40} onChange={(e) => setClientName(e.target.value)} />
          </label>
          <label>
            의뢰인 휴대폰
            <input className="admin-input" value={clientPhone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => setClientPhone(e.target.value)} />
          </label>
          <label>
            계약서 제목
            <input className="admin-input" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            계약서 본문 (사무실 문안을 그대로 붙여 넣기 · 최대 30,000자)
            <textarea className="admin-input" value={body} rows={16} maxLength={30000} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", fontFamily: "inherit" }} />
            <small>{body.length.toLocaleString()}자</small>
          </label>
          <label>
            착수금 (원, 없으면 0)
            <input className="admin-input" value={fee} inputMode="numeric" onChange={(e) => setFee(e.target.value)} />
          </label>
          <label>
            성공보수 문구
            <input className="admin-input" value={successFee} maxLength={500} placeholder="예) 회수액의 10%(부가가치세 별도)" onChange={(e) => setSuccessFee(e.target.value)} />
          </label>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            만든 순간 제목·본문·착수금·성공보수가 고정되고 문서 확인번호(SHA-256)가 붙습니다. 서명 링크는 14일 동안 유효합니다.
            착수금이 있어도 사이트에서 결제를 받지 않습니다 — 결제는 사무실이 따로 안내합니다.
          </p>
          {formError && <p style={{ color: "#b42318", margin: 0 }}>{formError}</p>}
          <button className="btn primary" disabled={busy} onClick={() => void create()}>
            계약서 만들기
          </button>
        </div>
        {created && (
          <div style={{ marginTop: 14, padding: 12, border: "2px solid var(--ink)", borderRadius: 10, background: "#fffbe6" }}>
            <strong>서명 링크가 만들어졌습니다.</strong>
            <div style={{ wordBreak: "break-all", margin: "6px 0" }}>{created.link}</div>
            <button className="btn" onClick={() => void copy(created.link)}>링크 복사</button>{" "}
            {(() => {
              const row = rows.find((x) => x.token === created.token);
              return row ? (
                <button className="btn" disabled={busy} onClick={() => void sendSms(row)}>문자로 보내기</button>
              ) : null;
            })()}
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
              문자는 버튼을 눌러야만 나갑니다. 밤 9시~아침 8시에는 보내지 않습니다.
            </p>
          </div>
        )}
      </section>

      {notice && <p className="admin-count">{notice}</p>}
      {listError && <p style={{ color: "#b42318" }}>{listError}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>만든 시각</th>
            <th>의뢰인</th>
            <th>제목</th>
            <th>착수금</th>
            <th>상태</th>
            <th>서명 시각</th>
            <th>할 일</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="admin-empty">보낸 계약서가 없습니다.</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.token}>
              <td>{kstText(r.createdAt)}</td>
              <td>
                {r.clientName}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.clientPhone}</div>
              </td>
              <td>{r.title}</td>
              <td>{feeText(r.fee)}</td>
              <td>
                {statusLabel(r)}
                {r.smsSentAt && <div style={{ fontSize: 12, color: "var(--muted)" }}>문자 {kstText(r.smsSentAt)}</div>}
              </td>
              <td>{kstText(r.signedAt)}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <Link to={`/admin/esign/${r.token}/print`} target="_blank" rel="noopener">서명본 보기</Link>
                {r.status === "sent" && !r.expired && (
                  <>
                    {" · "}
                    <button className="admin-out" onClick={() => void copy(r.link)}>링크 복사</button>{" "}
                    <button className="admin-out" disabled={busy} onClick={() => void sendSms(r)}>문자</button>
                  </>
                )}
                {r.status === "sent" && (
                  <>
                    {" "}
                    <button className="admin-out" disabled={busy} onClick={() => void voidIt(r)}>무효</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
