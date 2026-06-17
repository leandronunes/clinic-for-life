import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchEvolutionPhotos,
  createEvolutionPhoto,
  fileToDataUrl,
  type EvolutionPhoto,
} from "./evolution-photos";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);

const photo: EvolutionPhoto = {
  id: "p1",
  taken_on: "2026-05-01",
  image_url: "data:image/png;base64,abc",
  weight_kg: 72,
};

describe("evolution-photos API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchEvolutionPhotos()", () => {
    it("calls GET /api/v1/students/:id/evolution/photos", async () => {
      mockGet.mockResolvedValue([photo]);
      const result = await fetchEvolutionPhotos("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/evolution/photos");
      expect(result).toEqual([photo]);
    });
  });

  describe("createEvolutionPhoto()", () => {
    it("posts photo payload to the correct URL", async () => {
      mockPost.mockResolvedValue(photo);
      await createEvolutionPhoto("s1", {
        taken_on: "2026-05-01",
        image_url: "data:image/png;base64,abc",
        weight_kg: 72,
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/students/s1/evolution/photos",
        expect.objectContaining({ taken_on: "2026-05-01", image_url: "data:image/png;base64,abc" }),
      );
    });
  });

  describe("fileToDataUrl()", () => {
    it("resolves with a data URL for the given file", async () => {
      const file = new File(["hello"], "photo.png", { type: "image/png" });
      const dataUrl = await fileToDataUrl(file);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
