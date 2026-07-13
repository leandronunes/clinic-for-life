import { describe, it, expect, vi, beforeEach } from "vitest";
import { setReaction, type WorkoutReaction } from "./reactions";

vi.mock("./http", () => ({
  http: { post: vi.fn() },
}));

import { http } from "./http";

const mockPost = vi.mocked(http.post);

const reaction: WorkoutReaction = {
  id: "r1",
  emoji: "💪",
  author_name: "Rafael Monteiro",
  created_at: "2026-07-13T10:00:00Z",
};

describe("reactions API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("setReaction()", () => {
    it("posts the emoji to .../check_ins/:id/reaction", async () => {
      mockPost.mockResolvedValue(reaction);
      const result = await setReaction("s1", "w1", "ci1", "💪");
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/students/s1/workouts/w1/check_ins/ci1/reaction",
        { emoji: "💪" },
      );
      expect(result).toEqual(reaction);
    });
  });
});
