import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchKpis, fetchActivity, type DashboardKpi } from "./dashboard";

vi.mock("./http", () => ({
  http: {
    get: vi.fn(),
  },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);

describe("dashboard API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchKpis()", () => {
    it("calls GET /api/v1/dashboard/kpis with the given range param", async () => {
      const kpis: DashboardKpi[] = [
        { label: "Active Students", value: 50, delta: 5.2, icon: "users" },
      ];
      mockGet.mockResolvedValue(kpis);

      const result = await fetchKpis("week");

      expect(mockGet).toHaveBeenCalledWith("/api/v1/dashboard/kpis", {
        params: { range: "week" },
      });
      expect(result).toEqual(kpis);
    });

    it("defaults to 'month' range when no argument is given", async () => {
      mockGet.mockResolvedValue([]);
      await fetchKpis();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/dashboard/kpis", {
        params: { range: "month" },
      });
    });
  });

  describe("fetchActivity()", () => {
    it("maps backend workouts→treinos and assessments→avaliacoes", async () => {
      mockGet.mockResolvedValue([
        { label: "2026-06-15", workouts: 5, assessments: 2 },
        { label: "2026-06-16", workouts: 3, assessments: 1 },
      ]);

      const result = await fetchActivity("week");

      expect(mockGet).toHaveBeenCalledWith("/api/v1/dashboard/activity", {
        params: { days: 7 },
      });
      expect(result).toEqual([
        { label: "2026-06-15", treinos: 5, avaliacoes: 2 },
        { label: "2026-06-16", treinos: 3, avaliacoes: 1 },
      ]);
    });

    it("defaults to month (30 days) when no argument is given", async () => {
      mockGet.mockResolvedValue([]);
      await fetchActivity();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/dashboard/activity", {
        params: { days: 30 },
      });
    });

    it("converts range=year to 365 days", async () => {
      mockGet.mockResolvedValue([]);
      await fetchActivity("year");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/dashboard/activity", {
        params: { days: 365 },
      });
    });
  });
});
