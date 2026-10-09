import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  watchAuth,
  checkIsAdmin,
  signInAdminWithEmail,
  signOut as fbSignOut,
  type AppUser,
} from "../firebase";

type AdminAuthState = {
  user: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | null>(null);

const ADMIN_IDLE_MS = 30 * 60 * 1000;
const LAST_ACTIVE_KEY = "toesahero_admin_last_active";
function readLastActive(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}
function writeLastActive(t: number): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(t));
  } catch {
    /* 저장 불가 환경 — 화면 안 타이머만으로 동작 */
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return watchAuth(async (u) => {
      setUser(u);
      if (u) {
        const ok = await checkIsAdmin(u.uid);
        setIsAdmin(ok);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  // 자동 로그아웃(보안점검 5번) — 관리자 화면에서 30분 동안 아무 동작이 없으면 로그아웃한다.
  // 마지막 동작 시각을 브라우저에 적어 두어, 창을 닫았다가 다시 열어도 오래 지났으면 로그아웃된다.
  useEffect(() => {
    if (!isAdmin) return;
    const prev = readLastActive();
    if (prev && Date.now() - prev > ADMIN_IDLE_MS) {
      void signOut();
      return;
    }
    let lastLocal = Date.now();
    const touch = () => {
      lastLocal = Date.now();
      writeLastActive(lastLocal);
    };
    touch();
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    const onActivity = () => {
      // 탭이 잠들어 타이머가 늦었더라도, 이미 30분이 지났으면 연장하지 않고 로그아웃한다
      if (Date.now() - Math.max(lastLocal, readLastActive()) > ADMIN_IDLE_MS) {
        void signOut();
        return;
      }
      if (Date.now() - lastLocal > 30_000) touch();
    };
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = window.setInterval(() => {
      // 다른 탭에서 쓰고 있으면 그 시각을 따른다
      const last = Math.max(lastLocal, readLastActive());
      if (Date.now() - last > ADMIN_IDLE_MS) void signOut();
    }, 60_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const signIn = async (email: string, password: string) => {
    // 새로 로그인할 때는 예전 "마지막 동작 시각" 때문에 바로 로그아웃되지 않게 먼저 갱신한다
    writeLastActive(Date.now());
    const u = await signInAdminWithEmail(email, password);
    const ok = await checkIsAdmin(u.uid);
    if (!ok) {
      await fbSignOut();
      throw new Error(
        "로그인은 성공했지만 어드민 권한이 없습니다. 관리자에게 문의하세요."
      );
    }
    setUser(u);
    setIsAdmin(true);
  };

  const signOut = async () => {
    await fbSignOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return v;
}
