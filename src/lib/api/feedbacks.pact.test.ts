/**
 * Lean coverage (see docs/pact.md): happy path + applicable auth/validation
 * errors for every endpoint in this domain.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { enumString, errorStringBody, idString, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchFeedbacks, createFeedback } from "./feedbacks";

const KINDS = ["elogio", "correcao", "incentivo"];

const feedbackTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("2411"),
  kind: enumString(KINDS, "elogio"),
  message: like("Mandou muito bem no treino de hoje!"),
  author_name: like("Rafael Monteiro"),
  created_at: like("2026-07-12T10:00:00Z"),
  ...overrides,
});

describe("feedbacks API contract", () => {
  it("lists feedback notes for a student", async () => {
    const pact = createPact();
    pact
      .given("student 2401 has a feedback note 2411")
      .uponReceiving("a request for a student's feedback notes")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/2401/feedbacks",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [feedbackTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const feedbacks = await fetchFeedbacks("2401");
        expect(feedbacks.length).toBeGreaterThan(0);
      });
    });
  });

  it("sends feedback to a student", async () => {
    const pact = createPact();
    const payload = { kind: "elogio" as const, message: "Mandou muito bem no treino de hoje!" };
    pact
      .given("a personal is authenticated to send feedback to student 2401")
      .uponReceiving("a request to send feedback")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2401/feedbacks",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: feedbackTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const feedback = await createFeedback("2401", payload);
        expect(feedback.id).toEqual(expect.any(String));
      });
    });
  });

  it("rejects a feedback creation from a student role", async () => {
    const pact = createPact();
    const payload = { kind: "elogio" as const, message: "Mandou muito bem no treino de hoje!" };
    pact
      .given("a student is authenticated and attempts to send feedback to student 2401")
      .uponReceiving("a request to send feedback from a student role")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2401/feedbacks",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 403,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Forbidden"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(createFeedback("2401", payload)).rejects.toMatchObject({ status: 403 });
      });
    });
  });
});
