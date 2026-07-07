import { createContext, useContext } from "react";
import type { AuthUser, RegisterParams, UserRole } from "@/lib/api/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (params: RegisterParams) => Promise<AuthUser>;
  signInWithGoogle: (accessToken: string) => Promise<AuthUser>;
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

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
