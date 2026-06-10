import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  /** Id do aluno que admin/personal está visualizando, se houver. */
  impersonatedAlunoId: string | null;
  /** Quando impersonando, é o id do aluno; caso contrário, o aluno_id do usuário (se for aluno). */
  effectiveAlunoId: string | null;
  /** Papel "efetivo": "aluno" quando admin/personal está impersonando. */
  effectiveRole: UserRole | null;
  isImpersonating: boolean;
  impersonateAluno: (alunoId: string) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "forlife.session";
const IMPERSONATE_KEY = "forlife.impersonate";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedAlunoId, setImpersonatedAlunoId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
      const imp = localStorage.getItem(IMPERSONATE_KEY);
      if (imp) setImpersonatedAlunoId(imp);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const s = await apiLogin(email, password);
    setSession(s);
    setImpersonatedAlunoId(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    localStorage.removeItem(IMPERSONATE_KEY);
    return s.user;
  };

  const signOut = () => {
    setSession(null);
    setImpersonatedAlunoId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(IMPERSONATE_KEY);
  };

  const impersonateAluno = useCallback((alunoId: string) => {
    setImpersonatedAlunoId(alunoId);
    localStorage.setItem(IMPERSONATE_KEY, alunoId);
  }, []);

  const stopImpersonating = useCallback(() => {
    setImpersonatedAlunoId(null);
    localStorage.removeItem(IMPERSONATE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.user.role;
    const canImpersonate = role === "admin" || role === "personal";
    const activeImpersonation = canImpersonate ? impersonatedAlunoId : null;
    const effectiveRole: UserRole | null = activeImpersonation ? "aluno" : (role ?? null);
    const effectiveAlunoId = activeImpersonation
      ? activeImpersonation
      : (session?.user.aluno_id ?? null);

    return {
      user: session?.user ?? null,
      token: session?.token ?? null,
      loading,
      signIn,
      signOut,
      hasRole: (...roles: UserRole[]) => !!role && roles.includes(role),
      canWrite: role === "admin" || role === "personal",
      impersonatedAlunoId: activeImpersonation,
      effectiveAlunoId,
      effectiveRole,
      isImpersonating: !!activeImpersonation,
      impersonateAluno,
      stopImpersonating,
    };
  }, [session, loading, impersonatedAlunoId, impersonateAluno, stopImpersonating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
