import { describe, it, expect } from "vitest";
import {
  checkInEffectiveDate,
  formatCheckInDateTime,
  checkInCompletionPercentage,
} from "./check-in-format";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";

function checkIn(overrides: Partial<WorkoutCheckIn> = {}): WorkoutCheckIn {
  return {
    id: "ci1",
    workout_id: "w1",
    workout_title: "Treino A",
    student_id: "s1",
    student_name: "Aluno",
    status: "completed",
    performed_by: "aluno",
    exercises_completed: 1,
    exercises_total: 2,
    completed_exercise_ids: ["e1"],
    started_at: "2026-07-10T13:00:00.000Z",
    completed_at: "2026-07-10T13:45:00.000Z",
    viewed_at: null,
    pse: null,
    feedbacks: [],
    ...overrides,
  };
}

describe("checkInEffectiveDate", () => {
  it("uses completed_at when the check-in is completed", () => {
    const result = checkInEffectiveDate(checkIn({ completed_at: "2026-07-10T13:45:00.000Z" }));
    expect(result.toISOString()).toBe("2026-07-10T13:45:00.000Z");
  });

  it("falls back to started_at when there is no completed_at", () => {
    const result = checkInEffectiveDate(
      checkIn({
        status: "in_progress",
        completed_at: null,
        started_at: "2026-07-10T13:00:00.000Z",
      }),
    );
    expect(result.toISOString()).toBe("2026-07-10T13:00:00.000Z");
  });
});

describe("formatCheckInDateTime", () => {
  const date = new Date("2026-07-10T13:45:00.000Z");

  it("formats as dd/MM hh:mm by default (no year)", () => {
    expect(formatCheckInDateTime(date)).not.toMatch(/2026/);
    expect(formatCheckInDateTime(date)).toMatch(/^\d{2}\/\d{2},? \d{2}:\d{2}$/);
  });

  it("includes the year when withYear is true", () => {
    expect(formatCheckInDateTime(date, { withYear: true })).toMatch(/2026/);
  });
});

describe("checkInCompletionPercentage", () => {
  it("returns 0 when the check-in is null or undefined", () => {
    expect(checkInCompletionPercentage(null)).toBe(0);
    expect(checkInCompletionPercentage(undefined)).toBe(0);
  });

  it("returns 0 when exercises_total is 0", () => {
    expect(checkInCompletionPercentage({ exercises_completed: 0, exercises_total: 0 })).toBe(0);
  });

  it("rounds the completed/total ratio to a whole percentage", () => {
    expect(checkInCompletionPercentage({ exercises_completed: 1, exercises_total: 3 })).toBe(33);
    expect(checkInCompletionPercentage({ exercises_completed: 2, exercises_total: 2 })).toBe(100);
  });
});
