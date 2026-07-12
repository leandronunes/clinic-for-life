import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCurrentCheckIn,
  startCheckIn,
  finishCheckIn,
  toggleExerciseCheckIn,
  fetchCheckInHistory,
  type WorkoutCheckIn,
} from "./check-ins";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPatch = vi.mocked(http.patch);

const checkIn: WorkoutCheckIn = {
  id: "ci1",
  workout_id: "w1",
  workout_title: "Treino A",
  status: "in_progress",
  exercises_completed: 1,
  exercises_total: 3,
  completed_exercise_ids: ["e1"],
  started_at: "2026-07-12T10:00:00Z",
  completed_at: null,
};

describe("check-ins API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchCurrentCheckIn()", () => {
    it("calls GET .../check_ins/current", async () => {
      mockGet.mockResolvedValue(checkIn);
      const result = await fetchCurrentCheckIn("s1", "w1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/check_ins/current");
      expect(result).toEqual(checkIn);
    });

    it("resolves null when there is no check-in in progress", async () => {
      mockGet.mockResolvedValue(null);
      const result = await fetchCurrentCheckIn("s1", "w1");
      expect(result).toBeNull();
    });
  });

  describe("startCheckIn()", () => {
    it("posts to .../check_ins", async () => {
      mockPost.mockResolvedValue(checkIn);
      const result = await startCheckIn("s1", "w1");
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/check_ins");
      expect(result).toEqual(checkIn);
    });
  });

  describe("finishCheckIn()", () => {
    it("posts to .../check_ins/:id/finish", async () => {
      const finished = { ...checkIn, status: "completed" as const };
      mockPost.mockResolvedValue(finished);
      const result = await finishCheckIn("s1", "w1", "ci1");
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/check_ins/ci1/finish");
      expect(result).toEqual(finished);
    });
  });

  describe("toggleExerciseCheckIn()", () => {
    it("patches .../exercises/:exerciseId with the completed flag", async () => {
      mockPatch.mockResolvedValue(checkIn);
      await toggleExerciseCheckIn("s1", "w1", "ci1", "e1", true);
      expect(mockPatch).toHaveBeenCalledWith(
        "/api/v1/students/s1/workouts/w1/check_ins/ci1/exercises/e1",
        { completed: true },
      );
    });

    it("sends completed: false to unmark an exercise", async () => {
      mockPatch.mockResolvedValue(checkIn);
      await toggleExerciseCheckIn("s1", "w1", "ci1", "e1", false);
      expect(mockPatch).toHaveBeenCalledWith(
        "/api/v1/students/s1/workouts/w1/check_ins/ci1/exercises/e1",
        { completed: false },
      );
    });
  });

  describe("fetchCheckInHistory()", () => {
    it("calls GET /api/v1/students/:id/check_ins", async () => {
      mockGet.mockResolvedValue([checkIn]);
      const result = await fetchCheckInHistory("s1");
      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/check_ins");
      expect(result).toEqual([checkIn]);
    });
  });
});
