import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPartners,
  createPartner,
  updatePartner,
  deletePartner,
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
  category: "Nutrição",
  description: "Consultoria nutricional",
  coupon: "VIDA10",
  link: "https://nutrivita.com",
  created_at: "2026-05-01T00:00:00Z",
};

describe("partners API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchPartners()", () => {
    it("calls GET /api/v1/partners", async () => {
      mockGet.mockResolvedValue([partner]);
      const result = await fetchPartners();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/partners", { params: undefined });
      expect(result).toEqual([partner]);
    });

    it("passes domain as a query param", async () => {
      mockGet.mockResolvedValue([partner]);
      await fetchPartners({ domain: "app.clinicforlife.com.br" });
      expect(mockGet).toHaveBeenCalledWith("/api/v1/partners", {
        params: { domain: "app.clinicforlife.com.br" },
      });
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

    it("includes discount_details in the payload", async () => {
      mockPost.mockResolvedValue(partner);
      await createPartner({
        name: "NutriVita",
        category: "Nutrition",
        discount_details: "10% off",
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/partners",
        expect.objectContaining({ discount_details: "10% off" }),
      );
    });
  });

  describe("updatePartner()", () => {
    it("patches the partner", async () => {
      mockPatch.mockResolvedValue(partner);
      await updatePartner("p1", { coupon: "NOVO20" });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/partners/p1", { coupon: "NOVO20" });
    });

    it("patches discount_details", async () => {
      mockPatch.mockResolvedValue(partner);
      await updatePartner("p1", { discount_details: "20% off" });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/partners/p1", {
        discount_details: "20% off",
      });
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
