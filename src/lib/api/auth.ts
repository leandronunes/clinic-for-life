import { http } from "./http";

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
