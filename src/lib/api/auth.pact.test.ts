/**
 * Exhaustive reference contract (see docs/pact.md) — covers every verb,
 * matcher type, and error scenario for the Auth domain.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  boolean,
  enumString,
  errorArrayBody,
  errorStringBody,
  idString,
  iso8601DateTime,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  changePassword,
  fetchCurrentUser,
  forgotPassword,
  googleLogin,
  login,
  register,
  resetPassword,
  updateCurrentUser,
} from "./auth";

const ROLES = ["admin", "personal", "student"];

const userTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1"),
  name: like("Pessoa Exemplo"),
  email: like("pessoa@forlife.app"),
  role: enumString(ROLES, "student"),
  avatar_url: nullValue(),
  trainer_id: nullValue(),
  student_id: nullValue(),
  mfa_enabled: boolean(false),
  ...overrides,
});

const sessionTemplate = (overrides: Record<string, unknown> = {}) => ({
  token: like("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.signature"),
  user: userTemplate(),
  expires_at: iso8601DateTime(),
  ...overrides,
});

describe("auth API contract", () => {
  describe("POST /api/v1/auth/login", () => {
    it("logs in with valid credentials", async () => {
      const pact = createPact();
      pact
        .given("a user with valid credentials exists")
        .uponReceiving("a login request with valid credentials")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/login",
          headers: { "Content-Type": "application/json" },
          body: { email: "pact.login@forlife.app", password: "Str0ng@Pass1" },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: sessionTemplate() },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const session = await login({
              email: "pact.login@forlife.app",
              password: "Str0ng@Pass1",
            });
            expect(session.token).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });

    it("rejects invalid credentials", async () => {
      const pact = createPact();
      pact
        .given("no account exists for the given email")
        .uponReceiving("a login request with invalid credentials")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/login",
          headers: { "Content-Type": "application/json" },
          body: { email: "nobody@forlife.app", password: "wrong" },
        })
        .willRespondWith({
          status: 401,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Invalid credentials"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(
              login({ email: "nobody@forlife.app", password: "wrong" }),
            ).rejects.toMatchObject({
              status: 401,
            });
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("POST /api/v1/auth/register", () => {
    it("creates a new account", async () => {
      const pact = createPact();
      pact
        .given("no account is registered with this email")
        .uponReceiving("a registration request for a new account")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/register",
          headers: { "Content-Type": "application/json" },
          body: {
            role: "student",
            name: "Pessoa Nova",
            email: "pact.newaccount@forlife.app",
            password: "Str0ng@Pass1",
            password_confirmation: "Str0ng@Pass1",
          },
        })
        .willRespondWith({
          status: 201,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          // A "student" registration with no pre-existing Trainer/Student
          // matching the e-mail gets a fresh Student profile built for it,
          // so student_id is never null here — see auth_controller.rb's
          // build_student_if_needed.
          body: { data: sessionTemplate({ user: userTemplate({ student_id: idString("2701") }) }) },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const session = await register({
              name: "Pessoa Nova",
              email: "pact.newaccount@forlife.app",
              password: "Str0ng@Pass1",
              password_confirmation: "Str0ng@Pass1",
            });
            expect(session.user.email).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });

    it("rejects a duplicate email with a single error message", async () => {
      const pact = createPact();
      pact
        .given("an account is already registered with this email")
        .uponReceiving("a registration request for an email that already exists")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/register",
          headers: { "Content-Type": "application/json" },
          body: {
            role: "student",
            name: "Pessoa Duplicada",
            email: "pact.existing@forlife.app",
            password: "Str0ng@Pass1",
            password_confirmation: "Str0ng@Pass1",
          },
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("E-mail já possui uma conta cadastrada"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(
              register({
                name: "Pessoa Duplicada",
                email: "pact.existing@forlife.app",
                password: "Str0ng@Pass1",
                password_confirmation: "Str0ng@Pass1",
              }),
            ).rejects.toMatchObject({ status: 422 });
          },
          { authenticated: false },
        );
      });
    });

    it("rejects an invalid payload with a list of validation errors", async () => {
      const pact = createPact();
      pact
        .given("no account is registered with this email")
        .uponReceiving("a registration request with a weak password")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/register",
          headers: { "Content-Type": "application/json" },
          body: {
            role: "student",
            name: "Pessoa Fraca",
            email: "pact.weakpass@forlife.app",
            password: "weak",
            password_confirmation: "weak",
          },
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorArrayBody("Password must be at least 8 characters"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(
              register({
                name: "Pessoa Fraca",
                email: "pact.weakpass@forlife.app",
                password: "weak",
                password_confirmation: "weak",
              }),
            ).rejects.toMatchObject({ status: 422 });
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("POST /api/v1/auth/google", () => {
    it("logs in an existing user", async () => {
      const pact = createPact();
      pact
        .given("a user already exists for this google account")
        .uponReceiving("a google login for an already-linked account")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/google",
          headers: { "Content-Type": "application/json" },
          body: { access_token: like("fake-google-access-token") },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: sessionTemplate() },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const session = await googleLogin("fake-google-access-token");
            expect(session.token).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });

    it("creates a new account on first google login", async () => {
      const pact = createPact();
      pact
        .given("no user exists for this google account yet")
        .uponReceiving("a google login for a brand new account")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/google",
          headers: { "Content-Type": "application/json" },
          body: { access_token: like("fake-google-access-token") },
        })
        .willRespondWith({
          status: 201,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          // Same as self-registration — a brand new "student" account gets
          // a fresh Student profile built for it, so student_id is never
          // null here.
          body: { data: sessionTemplate({ user: userTemplate({ student_id: idString("2702") }) }) },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const session = await googleLogin("fake-google-access-token");
            expect(session.token).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });

    it("rejects an invalid google token", async () => {
      const pact = createPact();
      pact
        .given("the google access token is invalid")
        .uponReceiving("a google login with an invalid token")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/google",
          headers: { "Content-Type": "application/json" },
          body: { access_token: like("invalid-token") },
        })
        .willRespondWith({
          status: 401,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Token do Google inválido"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(googleLogin("invalid-token")).rejects.toMatchObject({ status: 401 });
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns the authenticated user", async () => {
      const pact = createPact();
      pact
        .given("an authenticated user requests their own profile")
        .uponReceiving("a request for the current user")
        .withRequest({
          method: "GET",
          path: "/api/v1/auth/me",
          headers: { Authorization: bearerToken() },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: userTemplate({ role: enumString(ROLES, "admin") }) },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const user = await fetchCurrentUser();
          expect(user.email).toEqual(expect.any(String));
        });
      });
    });

    it("rejects a request with no token", async () => {
      const pact = createPact();
      pact
        .uponReceiving("a request for the current user with no auth token")
        .withRequest({
          method: "GET",
          path: "/api/v1/auth/me",
        })
        .willRespondWith({
          status: 401,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Unauthorized"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 401 });
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("PATCH /api/v1/auth/me", () => {
    it("updates the authenticated user's own name and e-mail", async () => {
      const pact = createPact();
      pact
        .given("an authenticated user requests their own profile")
        .uponReceiving("a request to update the current user's name and e-mail")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/auth/me",
          headers: {
            Authorization: bearerToken(),
            "Content-Type": "application/json",
          },
          body: { name: "Novo Nome", email: "novo@forlife.app" },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: userTemplate({ name: like("Novo Nome"), email: like("novo@forlife.app") }),
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const user = await updateCurrentUser({ name: "Novo Nome", email: "novo@forlife.app" });
          expect(user.name).toEqual(expect.any(String));
        });
      });
    });

    it("rejects a request with no token", async () => {
      const pact = createPact();
      pact
        .uponReceiving("a request to update the current user with no auth token")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/auth/me",
          headers: { "Content-Type": "application/json" },
          body: { name: "Novo Nome" },
        })
        .willRespondWith({
          status: 401,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Unauthorized"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(updateCurrentUser({ name: "Novo Nome" })).rejects.toMatchObject({
              status: 401,
            });
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("PATCH /api/v1/auth/password", () => {
    it("changes the authenticated user's own password", async () => {
      const pact = createPact();
      pact
        .given("an authenticated user requests their own profile")
        .uponReceiving("a request to change the current user's password")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/auth/password",
          headers: {
            Authorization: bearerToken(),
            "Content-Type": "application/json",
          },
          body: {
            current_password: "Str0ng@Pass",
            password: "N3w@Str0ngPass",
            password_confirmation: "N3w@Str0ngPass",
          },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: { message: like("Senha atualizada com sucesso") } },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(mockServer.url, async () => {
          const result = await changePassword({
            current_password: "Str0ng@Pass",
            password: "N3w@Str0ngPass",
            password_confirmation: "N3w@Str0ngPass",
          });
          expect(result.message).toEqual(expect.any(String));
        });
      });
    });

    it("rejects a request with no token", async () => {
      const pact = createPact();
      pact
        .uponReceiving("a request to change the current user's password with no auth token")
        .withRequest({
          method: "PATCH",
          path: "/api/v1/auth/password",
          headers: { "Content-Type": "application/json" },
          body: {
            current_password: "Str0ng@Pass",
            password: "N3w@Str0ngPass",
            password_confirmation: "N3w@Str0ngPass",
          },
        })
        .willRespondWith({
          status: 401,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Unauthorized"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(
              changePassword({
                current_password: "Str0ng@Pass",
                password: "N3w@Str0ngPass",
                password_confirmation: "N3w@Str0ngPass",
              }),
            ).rejects.toMatchObject({ status: 401 });
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("POST /api/v1/auth/password/forgot", () => {
    it("responds with a generic message when the e-mail is registered", async () => {
      const pact = createPact();
      pact
        .given("a user with email pact.forgot@forlife.app exists to request a password reset")
        .uponReceiving("a request to request a password reset for a registered e-mail")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/password/forgot",
          headers: { "Content-Type": "application/json" },
          body: { email: "pact.forgot@forlife.app" },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: { message: like("Se o e-mail existir, enviaremos um link de redefinição.") },
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const result = await forgotPassword("pact.forgot@forlife.app");
            expect(result.message).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });

    it("responds with the same generic message for an unregistered e-mail", async () => {
      const pact = createPact();
      pact
        .given("no account exists for the given email")
        .uponReceiving("a request to request a password reset for an unregistered e-mail")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/password/forgot",
          headers: { "Content-Type": "application/json" },
          body: { email: "nobody@forlife.app" },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: {
            data: { message: like("Se o e-mail existir, enviaremos um link de redefinição.") },
          },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const result = await forgotPassword("nobody@forlife.app");
            expect(result.message).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });
  });

  describe("POST /api/v1/auth/password/reset", () => {
    it("resets the password and signs the user in with a valid token", async () => {
      const pact = createPact();
      pact
        .given("a user has a valid password reset token")
        .uponReceiving("a request to reset the password with a valid token")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/password/reset",
          headers: { "Content-Type": "application/json" },
          body: {
            token: "pact-reset-token-0123456789abcdef",
            password: "N3w@Str0ngPass",
            password_confirmation: "N3w@Str0ngPass",
          },
        })
        .willRespondWith({
          status: 200,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: { data: sessionTemplate() },
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            const session = await resetPassword({
              token: "pact-reset-token-0123456789abcdef",
              password: "N3w@Str0ngPass",
              password_confirmation: "N3w@Str0ngPass",
            });
            expect(session.token).toEqual(expect.any(String));
          },
          { authenticated: false },
        );
      });
    });

    it("rejects an invalid or expired token", async () => {
      const pact = createPact();
      pact
        .given("no password reset token is valid")
        .uponReceiving("a request to reset the password with an invalid token")
        .withRequest({
          method: "POST",
          path: "/api/v1/auth/password/reset",
          headers: { "Content-Type": "application/json" },
          body: {
            token: "not-a-real-token",
            password: "N3w@Str0ngPass",
            password_confirmation: "N3w@Str0ngPass",
          },
        })
        .willRespondWith({
          status: 422,
          headers: { "Content-Type": like("application/json; charset=utf-8") },
          body: errorStringBody("Link inválido ou expirado"),
        });

      await pact.executeTest(async (mockServer) => {
        await withMockServerEnv(
          mockServer.url,
          async () => {
            await expect(
              resetPassword({
                token: "not-a-real-token",
                password: "N3w@Str0ngPass",
                password_confirmation: "N3w@Str0ngPass",
              }),
            ).rejects.toMatchObject({ status: 422 });
          },
          { authenticated: false },
        );
      });
    });
  });
});
