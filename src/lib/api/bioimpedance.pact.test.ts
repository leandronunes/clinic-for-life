/**
 * Lean coverage (see docs/pact.md): happy path for every endpoint, plus the
 * "measured_on must be unique per student" validation error.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import {
  decimal,
  errorArrayBody,
  idString,
  iso8601Date,
  like,
  nullValue,
} from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { createMeasurement, deleteMeasurement, fetchMeasurements } from "./bioimpedance";

const measurementTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: idString("1801"),
  student_id: idString("1701"),
  measured_on: iso8601Date(),
  weight_kg: decimal(70.0),
  muscle_mass_kg: decimal(30.0),
  fat_percentage: decimal(25.0),
  visceral_fat: decimal(8.0),
  bmi: nullValue(),
  source: like("manual"),
  photo_id: nullValue(),
  photo_url: nullValue(),
  ...overrides,
});

describe("bioimpedance measurements API contract", () => {
  it("lists a student's measurements", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1701 has bioimpedance measurements")
      .uponReceiving("a request for a student's bioimpedance measurements")
      .withRequest({
        method: "GET",
        path: "/api/v1/students/1701/bioimpedance_measurements",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: { data: [measurementTemplate()] },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const measurements = await fetchMeasurements("1701");
        expect(measurements.length).toBeGreaterThan(0);
      });
    });
  });

  it("creates a measurement", async () => {
    const pact = createPact();
    const payload = {
      measured_on: "2026-03-01",
      weight_kg: 71.5,
      muscle_mass_kg: 31.2,
      fat_percentage: 24.1,
      bmi: 22.5,
    };
    pact
      .given("a student with id 1701 exists for a new measurement")
      .uponReceiving("a request to create a bioimpedance measurement")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/1701/bioimpedance_measurements",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 201,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: measurementTemplate({
            measured_on: "2026-03-01",
            weight_kg: decimal(71.5),
            bmi: decimal(22.5),
            visceral_fat: nullValue(),
          }),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const measurement = await createMeasurement("1701", payload);
        expect(measurement.id).toEqual(expect.any(String));
      });
    });
  });

  it("rejects a duplicate measurement date", async () => {
    const pact = createPact();
    const payload = {
      measured_on: "2025-01-01",
      weight_kg: 71.5,
      muscle_mass_kg: 31.2,
      fat_percentage: 24.1,
      bmi: 22.5,
    };
    pact
      .given("a student with id 1701 has bioimpedance measurements")
      .uponReceiving("a request to create a measurement for a date that already has one")
      .withRequest({
        method: "POST",
        path: "/api/v1/students/1701/bioimpedance_measurements",
        headers: { Authorization: bearerToken(), "Content-Type": "application/json" },
        body: payload,
      })
      .willRespondWith({
        status: 422,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: errorArrayBody("Measured on has already been taken"),
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(createMeasurement("1701", payload)).rejects.toMatchObject({ status: 422 });
      });
    });
  });

  it("deletes a measurement", async () => {
    const pact = createPact();
    pact
      .given("a student with id 1701 has a measurement 1802 to delete")
      .uponReceiving("a request to delete a bioimpedance measurement")
      .withRequest({
        method: "DELETE",
        path: "/api/v1/students/1701/bioimpedance_measurements/1802",
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({ status: 204 });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        await expect(deleteMeasurement("1701", "1802")).resolves.toBeUndefined();
      });
    });
  });
});
