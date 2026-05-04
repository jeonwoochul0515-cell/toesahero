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

  const signIn = async (email: string, password: string) => {
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
