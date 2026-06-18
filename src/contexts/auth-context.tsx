import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, AuthUser, UserRole } from "@/lib/api/auth";
import { login, fetchCurrentUser, type BackendUser } from "@/lib/api/auth";
import { setAuthTokenGetter } from "@/lib/api/http";

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

/** Maps backend English fields to the shape the app currently consumes. */
export function mapBackendUser(u: BackendUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "student" ? "aluno" : (u.role as UserRole),
    avatar_url: u.avatar_url ?? undefined,
    personal_id: u.trainer_id ?? undefined,
    aluno_id: u.student_id ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize session synchronously from storage to avoid auth race on reload.
  const initialSession: AuthSession | null = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  })();
  const initialImpersonation: string | null = (() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(IMPERSONATE_KEY);
    } catch {
      return null;
    }
  })();

  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [loading, setLoading] = useState(true);
  const [impersonatedAlunoId, setImpersonatedAlunoId] = useState<string | null>(
    initialImpersonation,
  );
  const sessionRef = useRef<AuthSession | null>(initialSession);
  sessionRef.current = session;

  // Register the token getter synchronously so the HTTP client has the bearer
  // available before any effect or query fires after a reload.
  setAuthTokenGetter(() => sessionRef.current?.token ?? null);

  // Revalidate the restored session against the backend (does not gate UI on success).
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!initialSession) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const backendUser = await fetchCurrentUser();
        if (!cancelled) {
          const fresh: AuthSession = { ...initialSession, user: mapBackendUser(backendUser) };
          setSession(fresh);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
      } catch (err) {
        // Only sign the user out for real auth failures (401/403). Network errors
        // or transient 5xx must NOT wipe the session — keep the user logged in.
        const status = (err as { status?: number } | undefined)?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          setSession(null);
          setImpersonatedAlunoId(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(IMPERSONATE_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await login({ email, password });
    const s: AuthSession = {
      token: res.token,
      user: mapBackendUser(res.user),
      expires_at: res.expires_at,
    };
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
