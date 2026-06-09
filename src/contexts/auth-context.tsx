import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthSession, AuthUser, UserRole } from "@/lib/mock-api";
import { apiLogin } from "@/lib/mock-api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  canWrite: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "forlife.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const s = await apiLogin(email, password);
    setSession(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s.user;
  };

  const signOut = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.user.role;
    return {
      user: session?.user ?? null,
      token: session?.token ?? null,
      loading,
      signIn,
      signOut,
      hasRole: (...roles: UserRole[]) => !!role && roles.includes(role),
      canWrite: role === "admin" || role === "personal",
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
