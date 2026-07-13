/**
 * Lean coverage (see docs/pact.md): happy path + applicable auth/validation
 * errors for every endpoint in this domain.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { errorStringBody, idString, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { setReaction } from "./reactions";

const reactionTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1"),
  emoji: like("💪"),
  author_name: like("Rafael Monteiro"),
  created_at: like("2026-07-13T10:00:00Z"),
  ...overrides,
});

describe("reactions API contract", () => {
  it("reacts to a completed check-in", async () => {
    const pact = createPact();
    const payload = { emoji: "💪" };
    pact
      .given("a personal is authenticated to react to student 2501's completed check-in 2521")
      .uponReceiving("a request to react to a completed check-in")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2501/workouts/2511/check_ins/2521/reaction",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: reactionTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const reaction = await setReaction("2501", "2511", "2521", "💪");
        expect(reaction.emoji).toEqual("💪");
      });
    });
  });

  it("rejects a reaction to a check-in still in progress", async () => {
    const pact = createPact();
    const payload = { emoji: "💪" };
    pact
      .given("a personal is authenticated to react to student 2501's in-progress check-in 2522")
      .uponReceiving("a request to react to an in-progress check-in")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2501/workouts/2511/check_ins/2522/reaction",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 422,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorStringBody("Só é possível reagir a um treino concluído"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(setReaction("2501", "2511", "2522", "💪")).rejects.toMatchObject({
          status: 422,
        });
      });
    });
  });

  it("rejects a reaction from a student role", async () => {
    const pact = createPact();
    const payload = { emoji: "💪" };
    pact
      .given(
        "a student is authenticated and attempts to react to student 2501's completed check-in 2521",
      )
      .uponReceiving("a request to react from a student role")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/2501/workouts/2511/check_ins/2521/reaction",
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
        await expect(setReaction("2501", "2511", "2521", "💪")).rejects.toMatchObject({
          status: 403,
        });
      });
    });
  });
});
