import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFeedbacks, createFeedback, type Feedback } from "./feedbacks";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);

const feedback: Feedback = {
  id: "f1",
  workout_check_in_id: "ci1",
  message: "Mandou muito bem no treino de hoje!",
  author_name: "Rafael Monteiro",
  created_at: "2026-07-12T10:00:00Z",
};

describe("feedbacks API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchFeedbacks()", () => {
    it("calls GET /api/v1/students/:id/feedbacks", async () => {
      mockGet.mockResolvedValue([feedback]);
      const result = await fetchFeedbacks("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/feedbacks");
      expect(result).toEqual([feedback]);
    });
  });

  describe("createFeedback()", () => {
    it("posts to feedbacks with the payload", async () => {
      mockPost.mockResolvedValue(feedback);
      const result = await createFeedback("s1", {
        workout_check_in_id: "ci1",
        message: "Mandou muito bem no treino de hoje!",
      });
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/feedbacks", {
        workout_check_in_id: "ci1",
        message: "Mandou muito bem no treino de hoje!",
      });
      expect(result).toEqual(feedback);
    });
  });
});
