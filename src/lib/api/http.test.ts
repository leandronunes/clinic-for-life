import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, setAuthTokenGetter, type ApiError } from "./http";

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  body?: unknown;
  text?: string;
}) {
  const status = response.status ?? 200;
  const ok = response.ok ?? (status >= 200 && status < 300);
  const text = response.text ?? (response.body === undefined ? "" : JSON.stringify(response.body));

  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: response.statusText ?? "",
    text: () => Promise.resolve(text),
  } as Response);

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("http client", () => {
  beforeEach(() => {
    setAuthTokenGetter(() => null);
    // isOfflineMode() defaults to true when VITE_OFFLINE is unset (e.g. in CI,
    // which has no .env file) — pin it explicitly so these tests exercise fetch.
    vi.stubEnv("VITE_OFFLINE", "false");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("unwraps the { data } envelope on GET", async () => {
    mockFetch({ body: { data: { id: "1", name: "Ana" } } });
    const result = await http.get<{ id: string; name: string }>("/api/v1/students/1");
    expect(result).toEqual({ id: "1", name: "Ana" });
  });

  it("returns the full envelope when withEnvelope is set", async () => {
    mockFetch({ body: { data: [{ id: "1" }], meta: { total: 1 } } });
    const result = await http.get<{ data: unknown[]; meta: unknown }>("/api/v1/students", {
      withEnvelope: true,
    });
    expect(result).toEqual({ data: [{ id: "1" }], meta: { total: 1 } });
  });

  it("sends the Authorization header when a token is available", async () => {
    const fetchMock = mockFetch({ body: { data: {} } });
    setAuthTokenGetter(() => "tok123");
    await http.get("/api/v1/auth/me");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok123");
  });

  it("omits the Authorization header when there is no token", async () => {
    const fetchMock = mockFetch({ body: { data: {} } });
    await http.get("/api/v1/partners");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("serializes a plain object body as JSON with Content-Type", async () => {
    const fetchMock = mockFetch({ body: { data: {} } });
    await http.post("/api/v1/students", { name: "Ana" });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ name: "Ana" }));
  });

  it("does not set Content-Type for FormData bodies", async () => {
    const fetchMock = mockFetch({ body: { data: {} } });
    const form = new FormData();
    form.append("file", "x");
    await http.post("/api/v1/bioimpedance/import", form);

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(init.body).toBe(form);
  });

  it("rejects with { status, message } for a string error body", async () => {
    mockFetch({ status: 401, ok: false, body: { error: "Credenciais inválidas" } });
    await expect(http.post("/api/v1/auth/login", {})).rejects.toMatchObject({
      status: 401,
      message: "Credenciais inválidas",
    } satisfies ApiError);
  });

  it("joins an array error body into a single message", async () => {
    mockFetch({
      status: 422,
      ok: false,
      body: { error: ["Name is required", "Email is invalid"] },
    });
    await expect(http.post("/api/v1/students", {})).rejects.toMatchObject({
      status: 422,
      message: "Name is required, Email is invalid",
    });
  });

  it("carries the machine-readable code through when the backend sends one", async () => {
    mockFetch({
      status: 422,
      ok: false,
      body: {
        error: "Já existe um aluno cadastrado com este e-mail nesta organização.",
        code: "email_taken_same_organization",
      },
    });
    await expect(http.post("/api/v1/students", {})).rejects.toMatchObject({
      status: 422,
      code: "email_taken_same_organization",
    } satisfies Partial<ApiError>);
  });

  it("leaves code undefined when the backend doesn't send one", async () => {
    mockFetch({ status: 401, ok: false, body: { error: "Credenciais inválidas" } });
    await expect(http.post("/api/v1/auth/login", {})).rejects.toMatchObject({ code: undefined });
  });

  it("returns null for empty 204 responses when allowEmpty is set", async () => {
    mockFetch({ status: 204, text: "" });
    const result = await http.del("/api/v1/partners/1", { allowEmpty: true });
    expect(result).toBeNull();
  });

  it("builds the URL from the base URL and path, including query params", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });
    await http.get("/api/v1/students", { params: { status: "active", query: "" } });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:3002/api/v1/students?status=active");
  });

  it("maps network failures to a status 0 error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(http.get("/api/v1/students")).rejects.toMatchObject({ status: 0 });
  });

  describe("offline mode", () => {
    it("serves requests from the mock dataset instead of calling fetch", async () => {
      const fetchMock = mockFetch({ body: { data: [] } });
      vi.stubEnv("VITE_OFFLINE", "true");

      const partners = await http.get<Array<{ name: string }>>("/api/v1/partners");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(partners.length).toBeGreaterThan(0);
    });

    it("rejects with the same ApiError shape as the real client", async () => {
      mockFetch({ body: { data: [] } });
      vi.stubEnv("VITE_OFFLINE", "true");

      await expect(
        http.post("/api/v1/auth/login", { email: "x", password: "wrong" }),
      ).rejects.toMatchObject({
        status: 401,
      } satisfies Partial<ApiError>);
    });
  });
});
