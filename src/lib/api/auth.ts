import { http } from "./http";

/** Frontend role values used throughout the app. */
export type UserRole = "admin" | "personal" | "aluno";

/** Frontend user shape after mapping from backend. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  /** Only when role === "personal": the trainer record id. */
  personal_id?: string | null;
  /** Only when role === "aluno": the student record id. */
  aluno_id?: string | null;
}

/** Frontend session envelope. */
export interface AuthSession {
  token: string;
  user: AuthUser;
  expires_at: string;
}

export type BackendRole = "admin" | "personal" | "student";

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  avatar_url?: string | null;
  trainer_id?: string | null;
  student_id?: string | null;
  mfa_enabled?: boolean;
}

export interface LoginResponse {
  token: string;
  user: BackendUser;
  expires_at: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export function login(params: LoginParams): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/v1/auth/login", params);
}

export function fetchCurrentUser(): Promise<BackendUser> {
  return http.get<BackendUser>("/api/v1/auth/me");
}
