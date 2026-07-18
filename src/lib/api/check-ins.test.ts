import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCurrentCheckIn,
  startCheckIn,
  finishCheckIn,
  toggleExerciseCheckIn,
  fetchCheckInHistory,
  fetchCompletedCheckIns,
  markCheckInViewed,
  claimCheckIn,
  updateCheckInPse,
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
  student_id: "s1",
  student_name: "Julia Ferreira",
  status: "in_progress",
  performed_by: "aluno",
  exercises_completed: 1,
  exercises_total: 3,
  completed_exercise_ids: ["e1"],
  started_at: "2026-07-12T10:00:00Z",
  completed_at: null,
  viewed_at: null,
  pse: null,
  feedbacks: [],
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

  describe("fetchCompletedCheckIns()", () => {
    it("calls GET /api/v1/completed_check_ins", async () => {
      mockGet.mockResolvedValue([checkIn]);
      const result = await fetchCompletedCheckIns();
      expect(mockGet).toHaveBeenCalledWith("/api/v1/completed_check_ins");
      expect(result).toEqual([checkIn]);
    });
  });

  describe("markCheckInViewed()", () => {
    it("posts to .../check_ins/:id/view", async () => {
      const viewed = { ...checkIn, viewed_at: "2026-07-13T10:00:00Z" };
      mockPost.mockResolvedValue(viewed);
      const result = await markCheckInViewed("s1", "w1", "ci1");
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/check_ins/ci1/view");
      expect(result).toEqual(viewed);
    });
  });

  describe("updateCheckInPse()", () => {
    it("patches .../check_ins/:id/pse with the pse value", async () => {
      const withPse = { ...checkIn, status: "completed" as const, pse: 7 };
      mockPatch.mockResolvedValue(withPse);
      const result = await updateCheckInPse("s1", "w1", "ci1", 7);
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/check_ins/ci1/pse", {
        pse: 7,
      });
      expect(result).toEqual(withPse);
    });
  });

  describe("claimCheckIn()", () => {
    it("posts to .../check_ins/:id/claim", async () => {
      const claimed = { ...checkIn, performed_by: "personal" as const };
      mockPost.mockResolvedValue(claimed);
      const result = await claimCheckIn("s1", "w1", "ci1");
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/check_ins/ci1/claim");
      expect(result).toEqual(claimed);
    });
  });
});
