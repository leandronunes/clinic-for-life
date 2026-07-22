import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  AuthSession,
  BackendRole,
  BackendUser,
  RegisterParams,
  ResetPasswordParams,
  UserRole,
} from "@/lib/api/auth";
import {
  login,
  register,
  googleLogin,
  resetPassword as resetPasswordApi,
  fetchCurrentUser,
  mapBackendUser,
} from "@/lib/api/auth";
import { setAuthTokenGetter } from "@/lib/api/http";
import { AuthContext, type AuthContextValue } from "./use-auth";

const STORAGE_KEY = "forlife.session";
const IMPERSONATE_KEY = "forlife.impersonate";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize session synchronously from storage to avoid auth race on reload.
  // A useState lazy initializer runs once (on mount) and stays referentially
  // stable, so the boot effect below can safely depend on it.
  const [initialSession] = useState<AuthSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  });
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
  }, [initialSession]);

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

  const signUp = async (params: RegisterParams) => {
    const res = await register(params);
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

  const signInWithGoogle = async (accessToken: string, role?: BackendRole) => {
    const res = await googleLogin(accessToken, role);
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

  const resetPassword = async (params: ResetPasswordParams) => {
    const res = await resetPasswordApi(params);
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

  const updateUser = useCallback((backendUser: BackendUser) => {
    setSession((prev) => {
      if (!prev) return prev;
      const fresh: AuthSession = { ...prev, user: mapBackendUser(backendUser) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    });
  }, []);

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
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
      updateUser,
      hasRole: (...roles: UserRole[]) => !!role && roles.includes(role),
      canWrite: role === "admin" || role === "personal",
      impersonatedAlunoId: activeImpersonation,
      effectiveAlunoId,
      effectiveRole,
      isImpersonating: !!activeImpersonation,
      impersonateAluno,
      stopImpersonating,
    };
  }, [session, loading, impersonatedAlunoId, impersonateAluno, stopImpersonating, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
