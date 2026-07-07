/**
 * Lean coverage (see docs/pact.md): happy path for both endpoints in this
 * domain. All 18 clinical fields are nullable free-text/number columns with
 * no presence validation, so there is no 422 scenario to contract here.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { like, nullValue } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchAnamnesis, updateAnamnesis } from "./anamnesis";

const anamnesisTemplate = (overrides: Record<string, unknown> = {}) => ({
  objectives: nullValue(),
  medicines: nullValue(),
  supplements: nullValue(),
  systolic_pressure: nullValue(),
  diastolic_pressure: nullValue(),
  variable_glycemia: nullValue(),
  notes: nullValue(),
  height: nullValue(),
  weight: nullValue(),
  fracture: nullValue(),
  dislocations: nullValue(),
  pain: nullValue(),
  orthopedic_notes: nullValue(),
  meals: nullValue(),
  hydration: nullValue(),
  sleep: nullValue(),
  stool: nullValue(),
  urine: nullValue(),
  ...overrides,
});

describe("anamnesis API contract", () => {
  it("returns the student's anamnesis", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1001 exists for anamnesis")
      .uponReceiving("a request for a student's anamnesis")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1001/anamnesis",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: anamnesisTemplate() },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const anamnesis = await fetchAnamnesis("1001");
        expect(anamnesis).toBeDefined();
      });
    });
  });

  it("updates the student's anamnesis", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1001 exists for anamnesis")
      .uponReceiving("a request to update a student's anamnesis")
      .withRequest({
        method: "PUT",
        path: "/api/v1/students/1001/anamnesis",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: { objectives: "Ganho de massa muscular" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: anamnesisTemplate({ objectives: like("Ganho de massa muscular") }) },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const anamnesis = await updateAnamnesis("1001", { objectives: "Ganho de massa muscular" });
        expect(anamnesis.objectives).toEqual(expect.any(String));
      });
    });
  });
});
