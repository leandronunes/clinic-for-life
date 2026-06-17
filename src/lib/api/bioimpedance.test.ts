import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMeasurements, createMeasurement, type BioimpedanceMeasurement } from "./bioimpedance";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);

const measurement: BioimpedanceMeasurement = {
  id: "m1",
  student_id: "s1",
  measured_on: "2026-05-01",
  weight_kg: 72.5,
  muscle_mass_kg: 32.0,
  fat_percentage: 18.5,
  bmi: 23.4,
  source: "manual",
};

describe("bioimpedance API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchMeasurements()", () => {
    it("calls GET /api/v1/students/:id/bioimpedance_measurements", async () => {
      mockGet.mockResolvedValue([measurement]);
      const result = await fetchMeasurements("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/bioimpedance_measurements");
      expect(result).toEqual([measurement]);
    });
  });

  describe("createMeasurement()", () => {
    it("posts to the bioimpedance_measurements endpoint", async () => {
      mockPost.mockResolvedValue(measurement);
      await createMeasurement("s1", {
        measured_on: "2026-05-01",
        weight_kg: 72.5,
        muscle_mass_kg: 32.0,
        fat_percentage: 18.5,
        bmi: 23.4,
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/students/s1/bioimpedance_measurements",
        expect.objectContaining({ weight_kg: 72.5 }),
      );
    });
  });
});
