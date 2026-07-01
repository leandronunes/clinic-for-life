import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchWorkouts,
  createWorkout,
  updateWorkout,
  archiveWorkout,
  unarchiveWorkout,
  createExercise,
  updateExercise,
  deleteExercise,
  reorderExercises,
  type Workout,
  type Exercise,
} from "./workouts";

vi.mock("./http", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

import { http } from "./http";

const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPatch = vi.mocked(http.patch);
const mockDel = vi.mocked(http.del);

const exercise: Exercise = {
  id: "e1",
  position: 1,
  name: "Supino reto",
  sets: 4,
  reps: "8-10",
  load_kg: 40,
  rest_seconds: 90,
  muscle_group: "Peito",
  video_url: "https://youtube.com/embed/abc",
};

const workout: Workout = {
  id: "w1",
  position: 1,
  title: "Treino A — Push",
  focus: "Empurrar",
  status: "active",
  created_at: "2026-05-01T00:00:00Z",
  trainer_name: "Rafael",
  exercises: [exercise],
};

describe("workouts API", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchWorkouts()", () => {
    it("splits response by status into active/archived", async () => {
      const archived: Workout = { ...workout, id: "w2", status: "archived" };
      mockGet.mockResolvedValue([workout, archived]);

      const result = await fetchWorkouts("s1");

      expect(mockGet).toHaveBeenCalledWith("/api/v1/students/s1/workouts");
      expect(result.active).toEqual([workout]);
      expect(result.archived).toEqual([archived]);
    });

    it("returns empty lists when no workouts exist", async () => {
      mockGet.mockResolvedValue([]);
      const result = await fetchWorkouts("s1");
      expect(result).toEqual({ active: [], archived: [] });
    });
  });

  describe("createWorkout()", () => {
    it("posts to the correct URL with payload", async () => {
      mockPost.mockResolvedValue(workout);
      await createWorkout("s1", { title: "Treino A", focus: "Push", trainer_name: "Rafael" });
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts", {
        title: "Treino A",
        focus: "Push",
        trainer_name: "Rafael",
      });
    });
  });

  describe("updateWorkout()", () => {
    it("patches the correct URL", async () => {
      mockPatch.mockResolvedValue(workout);
      await updateWorkout("s1", "w1", { title: "Novo título" });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1", {
        title: "Novo título",
      });
    });
  });

  describe("archiveWorkout()", () => {
    it("posts to the archive action", async () => {
      mockPost.mockResolvedValue({ ...workout, status: "archived" });
      await archiveWorkout("s1", "w1");
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/archive");
    });
  });

  describe("unarchiveWorkout()", () => {
    it("posts to the unarchive action", async () => {
      mockPost.mockResolvedValue({ ...workout, status: "active" });
      await unarchiveWorkout("s1", "w1");
      expect(mockPost).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/unarchive");
    });
  });

  describe("exercise mutations", () => {
    it("createExercise posts to exercises endpoint", async () => {
      mockPost.mockResolvedValue(exercise);
      await createExercise("s1", "w1", {
        name: "Supino",
        sets: 3,
        reps: "10",
        rest_seconds: 60,
        muscle_group: "Peito",
      });
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/students/s1/workouts/w1/exercises",
        expect.objectContaining({ name: "Supino" }),
      );
    });

    it("updateExercise patches the exercise", async () => {
      mockPatch.mockResolvedValue(exercise);
      await updateExercise("s1", "w1", "e1", { sets: 5 });
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/exercises/e1", {
        sets: 5,
      });
    });

    it("deleteExercise sends DELETE with allowEmpty", async () => {
      mockDel.mockResolvedValue(null);
      await deleteExercise("s1", "w1", "e1");
      expect(mockDel).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/exercises/e1", {
        allowEmpty: true,
      });
    });

    it("reorderExercises patches the reorder endpoint with ordered IDs", async () => {
      const reordered = [
        { ...exercise, id: "e2", position: 1 },
        { ...exercise, id: "e1", position: 2 },
      ];
      mockPatch.mockResolvedValue(reordered);
      const result = await reorderExercises("s1", "w1", ["e2", "e1"]);
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/students/s1/workouts/w1/exercises/reorder", {
        ordered_ids: ["e2", "e1"],
      });
      expect(result).toEqual(reordered);
    });
  });
});
