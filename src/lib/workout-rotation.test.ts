import { describe, it, expect } from "vitest";
import { findLastExecutedWorkoutId, computeDefaultWorkoutId } from "./workout-rotation";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";

function checkIn(overrides: Partial<WorkoutCheckIn> = {}): WorkoutCheckIn {
  return {
    id: "ci1",
    workout_id: "w1",
    workout_title: "Treino A",
    student_id: "s1",
    student_name: "Aluno",
    status: "completed",
    student_confirmed_at: "2026-07-16T10:30:00.000Z",
    personal_confirmed_at: null,
    exercises_completed: 1,
    exercises_total: 1,
    completed_exercise_ids: [],
    started_at: "2026-07-16T10:00:00.000Z",
    completed_at: "2026-07-16T10:30:00.000Z",
    viewed_at: null,
    pse: null,
    feedbacks: [],
    ...overrides,
  };
}

describe("findLastExecutedWorkoutId", () => {
  it("returns null when there are no completed check-ins", () => {
    expect(findLastExecutedWorkoutId([])).toBeNull();
    expect(
      findLastExecutedWorkoutId([checkIn({ status: "in_progress", completed_at: null })]),
    ).toBeNull();
  });

  it("returns the workout_id of the most recently completed check-in", () => {
    const result = findLastExecutedWorkoutId([
      checkIn({ workout_id: "w1", completed_at: "2026-07-14T10:00:00.000Z" }),
      checkIn({ workout_id: "w3", completed_at: "2026-07-16T10:00:00.000Z" }),
      checkIn({ workout_id: "w2", completed_at: "2026-07-15T10:00:00.000Z" }),
    ]);
    expect(result).toBe("w3");
  });

  it("ignores in-progress check-ins even if more recent", () => {
    const result = findLastExecutedWorkoutId([
      checkIn({ workout_id: "w1", completed_at: "2026-07-14T10:00:00.000Z" }),
      checkIn({ workout_id: "w2", status: "in_progress", completed_at: null }),
    ]);
    expect(result).toBe("w1");
  });
});

describe("computeDefaultWorkoutId", () => {
  const workouts = [{ id: "w1" }, { id: "w2" }, { id: "w3" }];
  const today = new Date("2026-07-16T12:00:00.000Z");

  it("returns null when there are no workouts", () => {
    expect(computeDefaultWorkoutId([], [], today)).toBeNull();
  });

  it("returns the first workout when there is no execution history", () => {
    expect(computeDefaultWorkoutId(workouts, [], today)).toBe("w1");
  });

  it("returns the next workout in position order after the last executed one", () => {
    const checkIns = [checkIn({ workout_id: "w1", completed_at: "2026-07-16T09:00:00.000Z" })];
    expect(computeDefaultWorkoutId(workouts, checkIns, today)).toBe("w2");
  });

  it("wraps around circularly when the last executed workout was the last in the list", () => {
    const checkIns = [checkIn({ workout_id: "w3", completed_at: "2026-07-16T09:00:00.000Z" })];
    expect(computeDefaultWorkoutId(workouts, checkIns, today)).toBe("w1");
  });

  it("skips a workout already completed today, landing on the next undone one", () => {
    const checkIns = [
      checkIn({ workout_id: "w1", completed_at: "2026-07-15T09:00:00.000Z" }),
      checkIn({ workout_id: "w2", completed_at: "2026-07-16T09:00:00.000Z" }),
    ];
    // Last executed overall is w2 (most recent completed_at). Next in order
    // is w3, which hasn't been done today — lands there directly.
    expect(computeDefaultWorkoutId(workouts, checkIns, today)).toBe("w3");
  });

  it("skips multiple already-done-today workouts, wrapping circularly", () => {
    const checkIns = [
      checkIn({ workout_id: "w1", completed_at: "2026-07-16T08:00:00.000Z" }),
      checkIn({ workout_id: "w2", completed_at: "2026-07-16T09:00:00.000Z" }),
      checkIn({ workout_id: "w3", completed_at: "2026-07-16T10:00:00.000Z" }),
    ];
    // Last executed is w3; w1 and w2 are also done today — every workout
    // done today, falls back to the immediate next in rotation (w1).
    expect(computeDefaultWorkoutId(workouts, checkIns, today)).toBe("w1");
  });

  it("falls back to the first workout when the last executed one is not in this list", () => {
    const checkIns = [
      checkIn({ workout_id: "archived-workout", completed_at: "2026-07-16T09:00:00.000Z" }),
    ];
    expect(computeDefaultWorkoutId(workouts, checkIns, today)).toBe("w1");
  });

  it("does not skip a workout completed on a previous day", () => {
    const checkIns = [
      checkIn({ workout_id: "w1", completed_at: "2026-07-14T09:00:00.000Z" }),
      checkIn({ workout_id: "w2", completed_at: "2026-07-15T09:00:00.000Z" }),
    ];
    expect(computeDefaultWorkoutId(workouts, checkIns, today)).toBe("w3");
  });
});
