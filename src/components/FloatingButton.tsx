import { useEffect, useState } from "react";

type Toast = {
  id: number;
  city: string;
  name: string;
  age: string;
  role: string;
};

const cities = ["서울", "부산", "대전", "광주", "인천", "수원", "울산"];
const names = ["김**", "이**", "박**", "최**", "정**"];
const ages = ["25세", "27세", "29세", "31세", "26세"];
const roles = [
  "IT 사원",
  "디자이너",
  "마케터",
  "간호사",
  "영업직",
  "신입 1년차",
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type Props = {
  openChat: () => void;
};

export function FloatingButton({ openChat }: Props) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      setToast({
        id: Date.now(),
        city: pick(cities),
        name: pick(names),
        age: pick(ages),
        role: pick(roles),
      });
      window.setTimeout(() => setToast(null), 4500);
    }, 9000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="floater">
      {toast && (
        <div className="toast">
          <span className="pulse" style={{ background: "var(--green)" }} />
          <div>
            <strong>
              {toast.city} {toast.name}
            </strong>
            님이
            <br />
            <span style={{ color: "var(--muted)", fontSize: 11 }}>
              {toast.age} {toast.role} · 방금
            </span>
            <br />
            상담 시작했어요 ✨
          </div>
        </div>
      )}
      <button className="floater-btn" onClick={openChat}>
        <span className="pulse" />
        <span>💬 긴급 상담</span>
      </button>
    </div>
  );
}
