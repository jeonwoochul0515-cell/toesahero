import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  watchAuth,
  type AppUser,
  type ConsultationDoc,
} from "../firebase";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";

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
    desc: "고소·민사 등 변호사 전속 사무",
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
  const [tossLoaded, setTossLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);

  useEffect(() => watchAuth(setUser), []);

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
            "❌ 결제 인프라 미설정. 변호사 사무소에 직접 입금 안내드립니다."
          );
          return;
        }
        if (!resp.ok || !data.ok) {
          setConfirmResult(
            `❌ 결제 승인 실패: ${data.error ?? "unknown"} ${
              data.message ?? ""
            }`
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
        setConfirmResult(`❌ ${String(e)}`);
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
        "결제 인프라가 아직 설정되지 않았습니다. 변호사 사무소에 직접 문의해 주세요. (☎ 1660-4452)"
      );
      return;
    }
    if (!user) {
      alert("결제 진행을 위해 카카오 로그인이 필요합니다.");
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
          uid: user.uid,
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
          data.message ??
            "결제 인프라가 아직 설정되지 않았습니다. ☎ 1660-4452 로 문의해 주세요."
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
        customerName: user.displayName ?? "의뢰인",
        customerEmail: user.email ?? undefined,
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
          <div className={`checkout-result ${confirmResult.startsWith("✓") ? "ok" : "fail"}`}>
            {confirmResult}
            <div style={{ marginTop: 14 }}>
              <Link to="/my" className="btn primary">내 사건 보기</Link>
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

            <div className="checkout-terms">
              <h3>위임 동의 사항</h3>
              <ul>
                <li>
                  본인은 법률사무소 청송 (대표 변호사 김창희)에 본 사안의 처리를
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
              {confirming
                ? "결제 처리 중..."
                : `💳 ${pkg.price.toLocaleString("ko-KR")}원 결제 (토스페이먼츠)`}
            </button>

            {!TOSS_CLIENT_KEY && (
              <div className="checkout-not-ready">
                ⚠️ 결제 인프라가 아직 설정되지 않은 상태입니다 (토스페이먼츠 가맹
                심사 진행 중). 위임 의사가 확정되시면 카카오톡 채널 또는 ☎
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
