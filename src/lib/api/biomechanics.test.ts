import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchBiomechanicsAssessments,
  fetchCurrentBiomechanicsAssessment,
  uploadBiomechanicsSlot,
  removeBiomechanicsSlot,
  SLOT_TO_BACKEND,
  type BiomechanicalAssessment,
} from "./biomechanics";

vi.mock("./http", () => ({
  http: { get: vi.fn(), put: vi.fn(), del: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPut = vi.mocked(http.put);
const mockDel = vi.mocked(http.del);

const assessment: BiomechanicalAssessment = {
  id: "ba1",
  created_at: "2026-05-01T00:00:00Z",
  images: { frontal: "data:image/png;base64,abc" },
};

describe("biomechanics API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("slot mapping is consistent", () => {
    expect(SLOT_TO_BACKEND.flexao_tronco).toBe("trunk_flexion");
    expect(SLOT_TO_BACKEND.lado_esquerdo).toBe("left_side");
    expect(SLOT_TO_BACKEND.lado_direito).toBe("right_side");
  });

  describe("fetchBiomechanicsAssessments()", () => {
    it("calls GET /api/v1/students/:id/biomechanical_assessments", async () => {
      mockGet.mockResolvedValue([assessment]);
      await fetchBiomechanicsAssessments("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/biomechanical_assessments");
    });
  });

  describe("fetchCurrentBiomechanicsAssessment()", () => {
    it("calls GET .../current", async () => {
      mockGet.mockResolvedValue(assessment);
      await fetchCurrentBiomechanicsAssessment("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/biomechanical_assessments/current");
    });
  });

  describe("uploadBiomechanicsSlot()", () => {
    it("sends EN slot directly via PUT", async () => {
      mockPut.mockResolvedValue(assessment);
      await uploadBiomechanicsSlot("s1", "trunk_flexion", "data:image/png;base64,xyz");
      expect(mockPut).toHaveBeenCalledWith("/api/v1/students/s1/biomechanical_assessments/upload", {
        slot: "trunk_flexion",
        image_url: "data:image/png;base64,xyz",
      });
    });
  });

  describe("removeBiomechanicsSlot()", () => {
    it("sends EN slot directly via DELETE", async () => {
      mockDel.mockResolvedValue(assessment);
      await removeBiomechanicsSlot("s1", "left_side");
      expect(mockDel).toHaveBeenCalledWith(
        "/api/v1/students/s1/biomechanical_assessments/remove_image",
        { body: { slot: "left_side" } },
      );
    });
  });
});
