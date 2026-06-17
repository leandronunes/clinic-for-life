import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPartners,
  createPartner,
  updatePartner,
  deletePartner,
  CATEGORY_TO_BACKEND,
  CATEGORY_FROM_BACKEND,
  type Partner,
} from "./partners";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPatch = vi.mocked(http.patch);
const mockDel = vi.mocked(http.del);

const partner: Partner = {
  id: "p1",
  name: "NutriVita",
  category: "Nutrition",
  description: "Consultoria nutricional",
  coupon: "VIDA10",
  link: "https://nutrivita.com",
  created_at: "2026-05-01T00:00:00Z",
};

describe("partners API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("category mapping helpers", () => {
    it("maps PT labels to EN backend values", () => {
      expect(CATEGORY_TO_BACKEND["Nutrição"]).toBe("Nutrition");
      expect(CATEGORY_TO_BACKEND["Medicina Esportiva"]).toBe("Sports Medicine");
    });

    it("maps EN backend values to PT labels", () => {
      expect(CATEGORY_FROM_BACKEND.Nutrition).toBe("Nutrição");
      expect(CATEGORY_FROM_BACKEND["Sports Medicine"]).toBe("Medicina Esportiva");
    });
  });

  describe("fetchPartners()", () => {
    it("calls GET /api/v1/partners", async () => {
      mockGet.mockResolvedValue([partner]);
      const result = await fetchPartners();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/partners");
      expect(result).toEqual([partner]);
    });
  });

  describe("createPartner()", () => {
    it("posts to /api/v1/partners with payload", async () => {
      mockPost.mockResolvedValue(partner);
      await createPartner({ name: "NutriVita", category: "Nutrition" });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/partners",
        expect.objectContaining({ name: "NutriVita", category: "Nutrition" }),
      );
    });
  });

  describe("updatePartner()", () => {
    it("patches the partner", async () => {
      mockPatch.mockResolvedValue(partner);
      await updatePartner("p1", { coupon: "NOVO20" });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/partners/p1", { coupon: "NOVO20" });
    });
  });

  describe("deletePartner()", () => {
    it("sends DELETE with allowEmpty", async () => {
      mockDel.mockResolvedValue(null);
      await deletePartner("p1");
      expect(mockDel).toHaveBeenCalledWith("/api/v1/partners/p1", { allowEmpty: true });
    });
  });
});
