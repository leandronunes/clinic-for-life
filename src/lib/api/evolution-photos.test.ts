import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchEvolutionPhotos,
  createEvolutionPhoto,
  deleteEvolutionPhoto,
  fileToDataUrl,
  type EvolutionPhoto,
} from "./evolution-photos";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn(), del: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockDel = vi.mocked(http.del);

const photo: EvolutionPhoto = {
  id: "p1",
  measurement_id: "m1",
  taken_on: "2026-05-01",
  image_url: "https://s3.example.com/photo.jpg",
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
    it("posts payload to the correct URL", async () => {
      mockPost.mockResolvedValue(photo);
      await createEvolutionPhoto("s1", {
        bioimpedance_measurement_id: "m1",
        image_url: "https://s3.example.com/photo.jpg",
      });
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/evolution/photos", {
        bioimpedance_measurement_id: "m1",
        image_url: "https://s3.example.com/photo.jpg",
      });
    });
  });

  describe("deleteEvolutionPhoto()", () => {
    it("calls DELETE /api/v1/students/:id/evolution/photos/:photoId", async () => {
      mockDel.mockResolvedValue(undefined);
      await deleteEvolutionPhoto("s1", "p1");
      expect(mockDel).toHaveBeenCalledWith("/api/v1/students/s1/evolution/photos/p1");
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
