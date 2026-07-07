/**
 * Lean coverage (see docs/pact.md): happy path for both endpoints. All 13
 * fields are plain booleans with a DB default, so there is no 422 scenario.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { boolean, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchStructuralAssessment, updateStructuralAssessment } from "./structural-assessment";

const assessmentTemplate = (overrides: Record<string, unknown> = {}) => ({
  scoliosis: boolean(false),
  spine_rotation: boolean(false),
  hip_rotation: boolean(false),
  scapular_girdle_imbalance: boolean(false),
  scapular_dyskinesis: boolean(false),
  shortening: boolean(false),
  limb_length_difference: boolean(false),
  pelvic_anteversion: boolean(false),
  pelvic_retroversion: boolean(false),
  knee_valgus: boolean(false),
  knee_varus: boolean(false),
  cavus_foot_arch: boolean(false),
  flat_foot_arch: boolean(false),
  ...overrides,
});

describe("structural assessment API contract", () => {
  it("returns the student's structural assessment", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1101 exists for structural assessment")
      .uponReceiving("a request for a student's structural assessment")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1101/structural_assessment",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: assessmentTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessment = await fetchStructuralAssessment("1101");
        expect(assessment).toBeDefined();
      });
    });
  });

  it("updates the student's structural assessment", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1101 exists for structural assessment")
      .uponReceiving("a request to update a student's structural assessment")
      .withRequest({
        method: "PUT",
        path: "/api/v1/students/1101/structural_assessment",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { scoliosis: true },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: assessmentTemplate({ scoliosis: true }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessment = await updateStructuralAssessment("1101", { scoliosis: true });
        expect(assessment.scoliosis).toBe(true);
      });
    });
  });
});
