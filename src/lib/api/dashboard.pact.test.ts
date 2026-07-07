/**
 * Lean coverage (see docs/pact.md): happy path for both endpoints.
 */
import { describe, expect, it } from "vitest";
import { bearerToken } from "@/lib/pact/auth-fixtures";
import { integer, like } from "@/lib/pact/matchers";
import { createPact, withMockServerEnv } from "@/lib/pact/setup";
import { fetchActivity, fetchKpis } from "./dashboard";

describe("dashboard API contract", () => {
  it("returns KPI cards", async () => {
    const pact = createPact();
    pact
      .given("an admin with dashboard data is authenticated")
      .uponReceiving("a request for dashboard KPIs")
      .withRequest({
        method: "GET",
        path: "/api/v1/dashboard/kpis",
        query: { range: "month" },
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: like([
            { label: "Alunos Ativos", value: integer(1), icon: "users", delta: like(0) },
          ]),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const kpis = await fetchKpis("month");
        expect(kpis.length).toBeGreaterThan(0);
      });
    });
  });

  it("returns the activity series", async () => {
    const pact = createPact();
    pact
      .given("an admin with dashboard data is authenticated")
      .uponReceiving("a request for dashboard activity")
      .withRequest({
        method: "GET",
        path: "/api/v1/dashboard/activity",
        query: { days: "30" },
        headers: { Authorization: bearerToken() },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json; charset=utf-8") },
        body: {
          data: like([{ label: "2026-03-01", workouts: integer(0), assessments: integer(0) }]),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withMockServerEnv(mockServer.url, async () => {
        const activity = await fetchActivity("month");
        expect(activity).toBeDefined();
      });
    });
  });
});
