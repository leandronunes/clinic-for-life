import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAnamnesis, updateAnamnesis, type Anamnesis } from "./anamnesis";

vi.mock("./http", () => ({
  http: { get: vi.fn(), put: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPut = vi.mocked(http.put);

const anamnesis: Anamnesis = {
  objectives: "Perda de peso",
  medicines: null,
  supplements: "Whey protein",
  systolic_pressure: 120,
  diastolic_pressure: 80,
  meals: 5,
};

describe("anamnesis API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchAnamnesis()", () => {
    it("calls GET /api/v1/students/:id/anamnesis", async () => {
      mockGet.mockResolvedValue(anamnesis);
      const result = await fetchAnamnesis("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/anamnesis");
      expect(result).toEqual(anamnesis);
    });
  });

  describe("updateAnamnesis()", () => {
    it("calls PUT with the patch payload", async () => {
      mockPut.mockResolvedValue({ ...anamnesis, meals: 6 });
      await updateAnamnesis("s1", { meals: 6 });
      expect(mockPut).toHaveBeenCalledWith("/api/v1/students/s1/anamnesis", { meals: 6 });
    });
  });
});
