import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  watchAuth,
  signInWithKakao,
  type AppUser,
  type ConsultationDoc,
} from "../firebase";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { Icon } from "../components/Icon";

type PackageInfo = {
  id: "basic" | "pro" | "max";
  name: string;
  price: number;
  desc: string;
};

const PACKAGES: Record<PackageInfo["id"], PackageInfo> = {
  basic: {
    id: "basic",
    name: "기본 절차",
    price: 199000,
    desc: "통보·연락 응대 (분쟁 없음 가정)",
  },
  pro: {
    id: "pro",
    name: "표준 절차",
    price: 390000,
    desc: "임금·연차수당 청구 통합",
  },
  max: {
    id: "max",
    name: "분쟁 대응",
    price: 790000,
    desc: "괴롭힘·해고 등 분쟁 대응 (소송 수행은 별도 위임)",
  },
};

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? "";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: "카드" | "계좌이체" | "가상계좌",
        opts: {
          amount: number;
          orderId: string;
          orderName: string;
          customerName?: string;
          customerEmail?: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<void>;
    };
  }
}

export function CheckoutPage() {
  const { id: caseId } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const requestedPkg = (searchParams.get("pkg") ?? "basic") as PackageInfo["id"];
  const pkg = PACKAGES[requestedPkg] ?? PACKAGES.basic;

  const [user, setUser] = useState<AppUser | null>(null);
  const [doc1, setDoc1] = useState<ConsultationDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  // 로그인 없이 결제 가능 — 이름·연락처를 직접 입력받아 주문에 저장한다 (2026-08-20).
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [tossLoaded, setTossLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);
  const [paidOk, setPaidOk] = useState(false);

  useEffect(() => watchAuth(setUser), []);

  // 로그인되어 있으면 이름을 미리 채워준다 (수정 가능).
  useEffect(() => {
    if (user?.displayName) {
      setBuyerName((prev) => prev || user.displayName!);
    }
  }, [user]);

  // Firestore에서 사건 정보 로드
  useEffect(() => {
    let cancel = false;
    void (async () => {
      if (!caseId) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirestore();
        const snap = await getDoc(doc(db, "consultations", caseId));
        if (cancel) return;
        if (snap.exists()) {
          setDoc1({ id: snap.id, ...(snap.data() as Omit<ConsultationDoc, "id">) });
        }
      } catch (e) {
        console.warn("[checkout] case load failed", e);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [caseId]);

  // Toss SDK 로드
  useEffect(() => {
    if (!TOSS_CLIENT_KEY) return;
    if (window.TossPayments) {
      setTossLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1";
    script.async = true;
    script.onload = () => setTossLoaded(true);
    script.onerror = () => console.warn("Toss SDK load failed");
    document.head.appendChild(script);
  }, []);

  // 결제 실패로 되돌아온 경우(?fail=1). 토스는 code·message도 함께 붙여 준다.
  useEffect(() => {
    if (!searchParams.get("fail")) return;
    const reason = searchParams.get("message");
    setConfirmResult(
      [
        "결제가 완료되지 않았습니다.",
        ...(reason ? [`사유: ${reason}`] : []),
        "카드사에서 승인이 거절되었거나 결제창을 닫으신 경우입니다. 아래에서 다시 시도하실 수 있고, 계속 안 되시면 1660-4452로 전화 주시면 도와드리겠습니다.",
      ].join("\n")
    );
  }, [searchParams]);

  // success 콜백 처리 (URL ?paymentKey=...&orderId=...&amount=... 으로 돌아옴)
  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amountRaw = searchParams.get("amount");
    if (!paymentKey || !orderId || !amountRaw) return;
    const amount = Number(amountRaw);
    setConfirming(true);
    void (async () => {
      try {
        const resp = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data = (await resp.json()) as {
          ok?: boolean;
          payment?: { approvedAt?: string };
          error?: string;
          message?: string;
        };
        if (resp.status === 503) {
          setConfirmResult(
            "지금은 카드 결제를 받을 수 없습니다. 1660-4452로 전화 주시면 계좌 안내를 도와드리겠습니다."
          );
          return;
        }
        if (!resp.ok || !data.ok) {
          // 손님에게는 무엇을 하면 되는지만 보여 주고, 원인 코드는 사무실이 볼 수 있게 콘솔에만 남긴다.
          console.warn("[payment] confirm failed", data.error, data.message);
          setConfirmResult(
            [
              "결제 승인이 완료되지 않았습니다. 카드에서 금액이 빠져나갔다면 자동으로 취소됩니다.",
              "1660-4452로 전화 주시면 바로 확인해 드리겠습니다.",
            ].join("\n")
          );
          return;
        }
        // Firestore에 결제 결과 반영 — 의뢰인 본인이 카카오 로그인된 상태이므로
        // isOwner 권한으로 update 가능... 그러나 보안 규칙상 paymentStatus 는 어드민만 update 가능.
        // 따라서 프론트엔드는 결제 승인 결과만 UI에 표시하고 실제 DB 반영은 webhook 또는 어드민이 처리.
        setConfirmResult(
          `✓ 결제가 정상 처리되었습니다. 변호사 김창희가 영업일 기준 회신드립니다.\n결제 승인 시각: ${
            data.payment?.approvedAt ?? "—"
          }`
        );
      } catch (e) {
        console.warn("[payment] confirm error", e);
        setConfirmResult(
          "결제 결과를 확인하는 중 연결이 끊겼습니다. 잠시 후 새로고침해 보시고, " +
            "그래도 안 되면 1660-4452로 전화 주십시오."
        );
      } finally {
        setConfirming(false);
      }
    })();
  }, [searchParams]);

  const startPayment = async () => {
    if (!agreed) {
      alert("위임 약관에 동의해 주셔야 결제 진행이 가능합니다.");
      return;
    }
    if (!TOSS_CLIENT_KEY || !window.TossPayments) {
      alert(
        "지금은 카드 결제를 받을 수 없습니다. 1660-4452로 전화 주시면 계좌 안내를 도와드리겠습니다."
      );
      return;
    }
    // 로그인 필수 아님 — 이름·연락처만 확인되면 결제 진행 (변호사가 연락할 수단 확보 목적).
    const name = buyerName.trim();
    const phone = buyerPhone.replace(/[^0-9]/g, "");
    if (!name) {
      alert("성함을 입력해 주세요.");
      return;
    }
    if (phone.length < 9) {
      alert("연락받으실 전화번호를 입력해 주세요.");
      return;
    }

    // 서버에서 주문 생성 — 금액·orderId 는 서버가 결정(클라 금액 위변조 차단)
    let orderId: string;
    let amount: number;
    try {
      const resp = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          caseId: caseId ?? null,
          uid: user?.uid ?? null,
          userName: name,
          userEmail: user?.email ?? null,
          contact: phone,
        }),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        orderId?: string;
        amount?: number;
        message?: string;
      };
      if (resp.status === 503) {
        alert(
          "지금은 카드 결제를 받을 수 없습니다. 1660-4452로 전화 주시면 계좌 안내를 도와드리겠습니다."
        );
        return;
      }
      if (!resp.ok || !data.ok || !data.orderId || typeof data.amount !== "number") {
        alert("주문 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      orderId = data.orderId;
      amount = data.amount;
    } catch {
      alert("주문 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const tp = window.TossPayments(TOSS_CLIENT_KEY);
    try {
      await tp.requestPayment("카드", {
        amount,
        orderId,
        orderName: `퇴사히어로 ${pkg.name} 패키지`,
        customerName: name || user?.displayName || "의뢰인",
        customerEmail: user?.email ?? undefined,
        successUrl: window.location.origin + window.location.pathname,
        failUrl: window.location.origin + window.location.pathname + "?fail=1",
      });
    } catch (e) {
      console.warn("[toss] payment failed", e);
    }
  };

  if (loading) {
    return <div className="checkout-page"><div className="my-loading">로드 중...</div></div>;
  }

  return (
    <div className="checkout-page">
      <header className="calc-header">
        <Link to="/" className="my-back">← 홈으로</Link>
        <h1 className="calc-title">위임 신청 · 결제</h1>
      </header>

      <main className="calc-main" style={{ maxWidth: 700 }}>
        {confirmResult && (
          <div className={`checkout-result ${paidOk ? "ok" : "fail"}`}>
            {confirmResult}
            {/* 결제만 끝내고 끝내지 않는다. 다음에 무엇을 하면 되는지를 이 화면에서 이어 준다.
                위임장은 그동안 손님이 갈 길이 아예 없었다(2026-09-12 예행연습 ②). */}
            {paidOk && (
              <div className="checkout-next">
                <h3>다음으로 하실 일</h3>
                <ol>
                  <li>
                    <strong>위임장에 서명해 주세요.</strong> 변호사가 회사에 정식으로
                    통보하려면 위임장이 필요합니다. 휴대폰에서 손가락으로 서명하시면 됩니다.
                    <div style={{ marginTop: 6 }}>
                      <Link to="/delegation" className="btn primary">위임장 서명하러 가기</Link>
                    </div>
                  </li>
                  <li>
                    <strong>자료를 보내 주세요.</strong> 근로계약서·급여명세서·회사와 주고받은
                    문자가 있으면 카카오톡 채널로 보내 주시면 변호사가 함께 확인합니다.
                    <div style={{ marginTop: 6 }}>
                      <a
                        className="btn"
                        href="https://pf.kakao.com/_zkzIX"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        카카오톡 채널로 자료 보내기
                      </a>
                    </div>
                  </li>
                  <li>
                    담당변호사 김창희가 영업일 기준으로 연락드립니다. 급하시면 1660-4452로
                    전화 주셔도 됩니다.
                  </li>
                </ol>
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <Link to="/my" className="btn">내 사건 보기</Link>
              <Link to="/" className="btn" style={{ marginLeft: 8 }}>홈</Link>
            </div>
          </div>
        )}

        {!confirmResult && (
          <>
            <div className="checkout-summary">
              <h2>{pkg.name}</h2>
              <p className="checkout-desc">{pkg.desc}</p>
              <div className="checkout-price">
                <span>{pkg.price.toLocaleString("ko-KR")}</span>원
              </div>
              {doc1 && (
                <div className="checkout-case-ref">
                  접수번호: <code>#{doc1.id.slice(0, 8)}</code>{" "}
                  {doc1.userName && <>· 의뢰인: {doc1.userName}</>}
                </div>
              )}
            </div>

            {/* 로그인 없이 결제하면 그 사건이 계정에 붙지 않아 「내 사건」에서 영영 보이지 않는다.
                결제 전에 그 사실을 알리고 로그인을 먼저 권한다(2026-09-12 예행연습 ①⑧). */}
            {!user && (
              <div className="checkout-login-hint">
                <strong>진행 상황을 직접 확인하시려면 먼저 로그인해 주세요.</strong>
                <p>
                  로그인하시면 접수부터 종료까지 어디까지 왔는지 「내 사건」에서 보실 수 있고,
                  근로계약서 같은 자료도 올리실 수 있습니다. 로그인 없이 결제하셔도 진행에는
                  문제가 없지만, 그 경우 진행 상황은 전화나 카카오톡으로 안내받으셔야 합니다.
                </p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void signInWithKakao()}
                >
                  <Icon name="chat" size={16} /> 카카오로 로그인하고 진행
                </button>
              </div>
            )}

            <div className="checkout-terms">
              <h3>의뢰인 정보</h3>
              <p style={{ fontSize: 13, color: "#666", margin: "4px 0 10px" }}>
                {user
                  ? "변호사가 연락드릴 정보를 확인해 주세요."
                  : "로그인 없이도 진행됩니다. 변호사가 연락드릴 정보만 입력해 주세요."}
              </p>
              <div style={{ display: "grid", gap: 10, marginBottom: 6 }}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="성함 (필수)"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  autoComplete="name"
                />
                <input
                  type="tel"
                  className="chat-input"
                  placeholder="연락받으실 전화번호 (필수)"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="checkout-terms">
              <h3>위임 동의 사항</h3>
              <ul>
                <li>
                  본인은 법률사무소 청송law (대표 변호사 김창희)에 본 사안의 처리를
                  위임함을 확인합니다.
                </li>
                <li>
                  변호사가 위임받은 직무 수행 과정에서 변호사법 제26조에 따른
                  비밀유지 의무가 적용됨을 확인합니다.
                </li>
                <li>
                  표시된 보수는 위임계약 기준이며, 사안의 난이도·복잡성에 따라
                  추가 협의될 수 있습니다.
                </li>
                <li>
                  결과(소송 승소·금원 회수액 등)는 보장되지 않으며, 변호사는
                  성실한 직무 수행 의무를 부담합니다.
                </li>
                <li>
                  결제 완료 후 변호사 검토를 거쳐 사실관계 확인이 어려운 경우,
                  결제 취소 후 환불 절차가 진행될 수 있습니다 (변호사윤리장전).
                </li>
              </ul>
              <label className="checkout-agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>위 사항을 모두 확인했으며, 위임 진행에 동의합니다.</span>
              </label>
            </div>

            <button
              className="btn primary"
              style={{ width: "100%", fontSize: 17, padding: 18, marginTop: 20 }}
              onClick={() => void startPayment()}
              disabled={!agreed || confirming}
            >
              {confirming ? (
                "결제 처리 중..."
              ) : (
                <>
                  <Icon name="card" size={16} /> {pkg.price.toLocaleString("ko-KR")}원 결제 (토스페이먼츠)
                </>
              )}
            </button>

            {!TOSS_CLIENT_KEY && (
              <div className="checkout-not-ready">
                <Icon name="warning" size={16} /> 결제 인프라가 아직 설정되지 않은 상태입니다 (토스페이먼츠 가맹
                심사 진행 중). 위임 의사가 확정되시면 카카오톡 채널 또는 <Icon name="phone" size={14} />
                1660-4452 로 직접 문의해 주세요. 변호사가 안내드립니다.
              </div>
            )}

            <p className="calc-foot">
              본 결제는 토스페이먼츠 (PG) 를 통해 처리됩니다. 카드 정보는
              본 사이트에 저장되지 않습니다. 본 사이트는 변호사법 제23조에
              따른 광고물입니다.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
