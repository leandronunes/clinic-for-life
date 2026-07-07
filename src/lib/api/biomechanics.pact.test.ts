/**
 * Lean coverage (see docs/pact.md): happy path for every endpoint in this
 * domain (list, current, new assessment, upload/remove image slot).
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { idString, iso8601DateTime, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import {
  fetchBiomechanicsAssessments,
  fetchCurrentBiomechanicsAssessment,
  newBiomechanicsAssessment,
  removeBiomechanicsSlot,
  uploadBiomechanicsSlot,
} from "./biomechanics";

const assessmentTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1301"),
  created_at: iso8601DateTime(),
  images: {},
  ...overrides,
});

describe("biomechanical assessments API contract", () => {
  it("lists a student's biomechanical assessments", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1201 has a biomechanical assessment")
      .uponReceiving("a request for a student's biomechanical assessments")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1201/biomechanical_assessments",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [assessmentTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessments = await fetchBiomechanicsAssessments("1201");
        expect(assessments.length).toBeGreaterThan(0);
      });
    });
  });

  it("returns the current biomechanical assessment", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1201 has a biomechanical assessment")
      .uponReceiving("a request for the current biomechanical assessment")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1201/biomechanical_assessments/current",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: assessmentTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessment = await fetchCurrentBiomechanicsAssessment("1201");
        expect(assessment.id).toEqual(expect.any(String));
      });
    });
  });

  it("creates a new biomechanical assessment", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1201 exists for biomechanical assessments")
      .uponReceiving("a request to create a new biomechanical assessment")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/1201/biomechanical_assessments/new_assessment",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: assessmentTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessment = await newBiomechanicsAssessment("1201");
        expect(assessment.id).toEqual(expect.any(String));
      });
    });
  });

  it("uploads an image to a slot", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1201 has a biomechanical assessment")
      .uponReceiving("a request to upload a biomechanical image slot")
      .withRequest({
        method: "PUT",
        path: "/api/v1/students/1201/biomechanical_assessments/upload",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { slot: "frontal", image_url: "https://example.com/frontal.jpg" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: assessmentTemplate({
            images: { frontal: like("https://example.com/frontal.jpg") },
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessment = await uploadBiomechanicsSlot(
          "1201",
          "frontal",
          "https://example.com/frontal.jpg",
        );
        expect(assessment.images.frontal).toEqual(expect.any(String));
      });
    });
  });

  it("removes an image from a slot", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1201 has a biomechanical assessment")
      .uponReceiving("a request to remove a biomechanical image slot")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/students/1201/biomechanical_assessments/remove_image",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { slot: "frontal" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: assessmentTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const assessment = await removeBiomechanicsSlot("1201", "frontal");
        expect(assessment.id).toEqual(expect.any(String));
      });
    });
  });
});
