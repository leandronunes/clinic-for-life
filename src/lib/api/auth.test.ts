import { describe, expect, it, vi, beforeEach } from "vitest";
import { login, fetchCurrentUser, type BackendUser, type LoginResponse } from "./auth";

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
});
