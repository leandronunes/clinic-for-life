import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCheckInFeedback, type CheckInFeedback } from "./check-in-feedbacks";

vi.mock("./http", () => ({
  http: { post: vi.fn() },
}));

import { http } from "./http";
const mockPost = vi.mocked(http.post);

const feedback: CheckInFeedback = {
  id: "f1",
  workout_check_in_id: "ci1",
  emoji: "💪",
  message: null,
  author_name: "Rafael Monteiro",
  created_at: "2026-07-13T10:00:00Z",
};

describe("check-in-feedbacks API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts emoji to .../feedbacks", async () => {
    mockPost.mockResolvedValue(feedback);
    const result = await createCheckInFeedback("s1", "w1", "ci1", { emoji: "💪" });
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/students/s1/workouts/w1/check_ins/ci1/feedbacks",
      { emoji: "💪" },
    );
    expect(result.emoji).toBe("💪");
  });

  it("posts message to .../feedbacks", async () => {
    const textFeedback: CheckInFeedback = { ...feedback, emoji: null, message: "Bom treino!" };
    mockPost.mockResolvedValue(textFeedback);
    const result = await createCheckInFeedback("s1", "w1", "ci1", { message: "Bom treino!" });
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/students/s1/workouts/w1/check_ins/ci1/feedbacks",
      { message: "Bom treino!" },
    );
    expect(result.message).toBe("Bom treino!");
  });

  it("posts both emoji and message", async () => {
    const combined: CheckInFeedback = { ...feedback, emoji: "🔥", message: "Arrasei!" };
    mockPost.mockResolvedValue(combined);
    const result = await createCheckInFeedback("s1", "w1", "ci1", {
      emoji: "🔥",
      message: "Arrasei!",
    });
    expect(result.emoji).toBe("🔥");
    expect(result.message).toBe("Arrasei!");
  });
});
