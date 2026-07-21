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

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  /** Default role: "student" (aluno). Backend may restrict this. */
  role?: BackendRole;
}

export function login(params: LoginParams): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/v1/auth/login", params);
}

export function googleLogin(accessToken: string): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/v1/auth/google", { access_token: accessToken });
}

/**
 * Self-service registration. Backend endpoint:
 * POST /api/v1/auth/register
 * Returns the same envelope as login so we can sign the user in immediately.
 */
export function register(params: RegisterParams): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/v1/auth/register", {
    role: "student",
    ...params,
  });
}

export function fetchCurrentUser(): Promise<BackendUser> {
  return http.get<BackendUser>("/api/v1/auth/me");
}

export interface UpdateCurrentUserPayload {
  name?: string;
  email?: string;
}

/** Updates the authenticated user's own name/email — any role can call this. */
export function updateCurrentUser(payload: UpdateCurrentUserPayload): Promise<BackendUser> {
  return http.patch<BackendUser>("/api/v1/auth/me", payload);
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

/** Changes the authenticated user's own password — any role can call this. */
export function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return http.patch<{ message: string }>("/api/v1/auth/password", payload);
}

/**
 * Requests a password reset link by e-mail. Always resolves with the same
 * generic message, whether or not the e-mail matches an account — the
 * backend never reveals which e-mails are registered.
 */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return http.post<{ message: string }>("/api/v1/auth/password/forgot", { email });
}

export interface ResetPasswordParams {
  token: string;
  password: string;
  password_confirmation: string;
}

/**
 * Consumes a password reset token (from the link sent by forgotPassword)
 * and sets a new password. Returns the same session envelope as login,
 * signing the user in immediately.
 */
export function resetPassword(params: ResetPasswordParams): Promise<LoginResponse> {
  return http.post<LoginResponse>("/api/v1/auth/password/reset", params);
}

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
