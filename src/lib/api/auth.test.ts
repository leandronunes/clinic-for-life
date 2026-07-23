import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  login,
  register,
  googleLogin,
  fetchCurrentUser,
  forgotPassword,
  resetPassword,
  mapBackendUser,
  type BackendUser,
  type LoginResponse,
} from "./auth";

vi.mock("./http", () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { http } from "./http";

const mockPost = vi.mocked(http.post);
const mockGet = vi.mocked(http.get);

const backendUser: BackendUser = {
  id: "u1",
  name: "Dra. Camila Andrade",
  email: "admin@forlife.app",
  role: "admin",
  avatar_url: null,
  trainer_id: null,
  student_id: null,
  mfa_enabled: false,
};

describe("auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login()", () => {
    it("calls POST /api/v1/auth/login with credentials", async () => {
      const response: LoginResponse = {
        token: "tok.abc.123",
        user: backendUser,
        expires_at: "2026-07-16T00:00:00Z",
      };
      mockPost.mockResolvedValue(response);

      const result = await login({ email: "admin@forlife.app", password: "Admin@2026" });

      expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "admin@forlife.app",
        password: "Admin@2026",
      });
      expect(result).toEqual(response);
    });

    it("propagates errors from the HTTP client", async () => {
      mockPost.mockRejectedValue({ status: 401, message: "Credenciais inválidas" });
      await expect(login({ email: "x@x.com", password: "wrong" })).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("forgotPassword()", () => {
    it("calls POST /api/v1/auth/password/forgot with the e-mail", async () => {
      mockPost.mockResolvedValue({ message: "Se o e-mail existir, enviaremos um link." });

      const result = await forgotPassword("admin@forlife.app");

      expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/password/forgot", {
        email: "admin@forlife.app",
      });
      expect(result).toEqual({ message: "Se o e-mail existir, enviaremos um link." });
    });

    it("propagates errors from the HTTP client (e.g. rate limited)", async () => {
      mockPost.mockRejectedValue({ status: 429, message: "Too many requests" });
      await expect(forgotPassword("admin@forlife.app")).rejects.toMatchObject({ status: 429 });
    });
  });

  describe("resetPassword()", () => {
    it("calls POST /api/v1/auth/password/reset with the token and new password", async () => {
      const response: LoginResponse = {
        token: "tok.abc.123",
        user: backendUser,
        expires_at: "2026-07-16T00:00:00Z",
      };
      mockPost.mockResolvedValue(response);

      const result = await resetPassword({
        token: "raw-token",
        password: "N3w@Str0ngPass",
        password_confirmation: "N3w@Str0ngPass",
      });

      expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/password/reset", {
        token: "raw-token",
        password: "N3w@Str0ngPass",
        password_confirmation: "N3w@Str0ngPass",
      });
      expect(result).toEqual(response);
    });

    it("propagates a 422 for an invalid or expired token", async () => {
      mockPost.mockRejectedValue({ status: 422, message: "Link inválido ou expirado" });
      await expect(
        resetPassword({
          token: "bad-token",
          password: "N3w@Str0ngPass",
          password_confirmation: "N3w@Str0ngPass",
        }),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  describe("fetchCurrentUser()", () => {
    it("calls GET /api/v1/auth/me and returns the user", async () => {
      mockGet.mockResolvedValue(backendUser);

      const result = await fetchCurrentUser();

      expect(mockGet).toHaveBeenCalledWith("/api/v1/auth/me");
      expect(result).toEqual(backendUser);
    });

    it("propagates 401 when the token is invalid", async () => {
      mockGet.mockRejectedValue({ status: 401, message: "Token inválido" });
      await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("mapBackendUser()", () => {
    it("keeps non-student roles as-is", () => {
      expect(mapBackendUser(backendUser)).toEqual({
        id: "u1",
        name: "Dra. Camila Andrade",
        email: "admin@forlife.app",
        role: "admin",
        avatar_url: undefined,
        personal_id: undefined,
        aluno_id: undefined,
        pending_approval: false,
        pending_migration_request: null,
        organization_id: undefined,
        organization_solo: false,
      });
    });

    it("maps the 'student' role to 'aluno' and student_id to aluno_id", () => {
      const student: BackendUser = {
        id: "u2",
        name: "Júlia Ferreira",
        email: "aluno@forlife.app",
        role: "student",
        avatar_url: null,
        trainer_id: null,
        student_id: "s1",
      };
      expect(mapBackendUser(student)).toMatchObject({ role: "aluno", aluno_id: "s1" });
    });

    it("maps trainer_id to personal_id for the 'personal' role", () => {
      const trainer: BackendUser = {
        id: "u3",
        name: "Rafael Monteiro",
        email: "personal@forlife.app",
        role: "personal",
        trainer_id: "t1",
      };
      expect(mapBackendUser(trainer)).toMatchObject({ role: "personal", personal_id: "t1" });
    });

    it("maps pending_approval through, defaulting to false when absent", () => {
      expect(mapBackendUser(backendUser)).toMatchObject({ pending_approval: false });

      const pending: BackendUser = {
        id: "u4",
        name: "Novo Personal",
        email: "novo@forlife.app",
        role: "personal",
        trainer_id: "t2",
        pending_approval: true,
      };
      expect(mapBackendUser(pending)).toMatchObject({ pending_approval: true });
    });

    it("maps pending_migration_request through, defaulting to null when absent", () => {
      expect(mapBackendUser(backendUser)).toMatchObject({ pending_migration_request: null });

      const invited: BackendUser = {
        id: "u7",
        name: "Júlia Ferreira",
        email: "aluno@forlife.app",
        role: "student",
        student_id: "s1",
        pending_migration_request: {
          id: "r1",
          status: "pending",
          target_organization_name: "Academia Vida Ativa",
          requested_by_name: "Dra. Camila Andrade",
          created_at: "2026-07-01T00:00:00Z",
        },
      };
      expect(mapBackendUser(invited)).toMatchObject({
        pending_migration_request: { id: "r1", status: "pending" },
      });
    });

    it("maps organization_id through, defaulting to undefined when absent", () => {
      expect(mapBackendUser(backendUser)).toMatchObject({ organization_id: undefined });

      const withOrg: BackendUser = {
        id: "u5",
        name: "Dra. Camila Andrade",
        email: "admin@forlife.app",
        role: "admin",
        organization_id: "org-1",
      };
      expect(mapBackendUser(withOrg)).toMatchObject({ organization_id: "org-1" });
    });

    it("maps organization_solo through, defaulting to false when absent", () => {
      expect(mapBackendUser(backendUser)).toMatchObject({ organization_solo: false });

      const soloAdmin: BackendUser = {
        id: "u6",
        name: "Novo Personal",
        email: "novo@forlife.app",
        role: "admin",
        organization_solo: true,
      };
      expect(mapBackendUser(soloAdmin)).toMatchObject({ organization_solo: true });
    });
  });
});
