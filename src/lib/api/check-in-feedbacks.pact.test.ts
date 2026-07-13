import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { errorStringBody, idString, like, nullValue } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { createCheckInFeedback } from "./check-in-feedbacks";

const feedbackTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1"),
  workout_check_in_id: idString("2412"),
  emoji: nullValue(),
  message: like("Mandou muito bem!"),
  author_name: like("Rafael Monteiro"),
  created_at: like("2026-07-13T10:00:00Z"),
  ...overrides,
});

describe("check-in-feedbacks API contract", () => {
  it("sends a text feedback for a completed check-in", async () => {
    const pact = createPact();
    const payload = { message: "Mandou muito bem no treino de hoje!" };
    pact
      .given("a personal is authenticated to send feedback to student 2401")
      .uponReceiving("a request to send text feedback")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2401/workouts/2402/check_ins/2412/feedbacks",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: feedbackTemplate({ message: like("Mandou muito bem no treino de hoje!") }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const fb = await createCheckInFeedback("2401", "2402", "2412", payload);
        expect(fb.id).toEqual(expect.any(String));
      });
    });
  });

  it("sends an emoji reaction for a completed check-in", async () => {
    const pact = createPact();
    const payload = { emoji: "💪" };
    pact
      .given("a personal is authenticated to send feedback to student 2401")
      .uponReceiving("a request to send an emoji reaction")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2401/workouts/2402/check_ins/2412/feedbacks",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: feedbackTemplate({ emoji: like("💪"), message: nullValue() }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const fb = await createCheckInFeedback("2401", "2402", "2412", payload);
        expect(fb.emoji).toEqual("💪");
      });
    });
  });

  it("rejects feedback for a check-in still in progress", async () => {
    const pact = createPact();
    pact
      .given(
        "a personal is authenticated to send feedback for student 2401's in-progress check-in 2413",
      )
      .uponReceiving("a request to send feedback for an in-progress check-in")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2401/workouts/2403/check_ins/2413/feedbacks",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { message: "Bom treino!" },
      })
      .willRespondWith({
        status: 422,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Só é possível dar feedback em um treino concluído"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(
          createCheckInFeedback("2401", "2403", "2413", { message: "Bom treino!" }),
        ).rejects.toMatchObject({ status: 422 });
      });
    });
  });

  it("rejects a feedback creation from a student role", async () => {
    const pact = createPact();
    pact
      .given("a student is authenticated and attempts to send feedback to student 2401")
      .uponReceiving("a request to send feedback from a student role")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2401/workouts/2402/check_ins/2412/feedbacks",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { message: "Bom treino!" },
      })
      .willRespondWith({
        status: 403,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Forbidden"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(
          createCheckInFeedback("2401", "2402", "2412", { message: "Bom treino!" }),
        ).rejects.toMatchObject({ status: 403 });
      });
    });
  });
});
